/**
 * Cart Validation Listener
 * 
 * Monitors changes to catalog, fulfillment selections, server time, and cart to ensure:
 * 1. Selected date/time remains available - if not, updates to closest available or clears selection
 * 2. Cart items remain available for selected service/time - moves unavailable items to deadCart
 * 3. DeadCart items that become available again are revived
 * 4. All cart item metadata is refreshed when relevant data changes
 */

import type { QueryClient } from '@tanstack/react-query';
import { formatISO } from 'date-fns';
import { enqueueSnackbar } from 'notistack';

import type { CartEntry, FulfillmentConfig, ICatalog, ICatalogSelectors } from '@wcp/wario-shared';
import {
  CanThisBeOrderedAtThisTimeAndFulfillmentCatalog,
  DetermineCartBasedLeadTime,
  WCPProductGenerateMetadata,
  WDateUtils,
} from '@wcp/wario-shared';
import { QUERY_KEYS } from '@wcp/wario-ux-shared/query';

import { STEPPER_STAGE_ENUM } from '@/config';
import { useCartStore } from '@/stores/useCartStore';
import { useFulfillmentStore } from '@/stores/useFulfillmentStore';
import { useMetricsStore } from '@/stores/useMetricsStore';
import { useStepperStore } from '@/stores/useStepperStore';

interface ValidationContext {
  catalog: ICatalog | null;
  fulfillments: FulfillmentConfig[] | null;
  currentTime: number;
  selectedService: string | null;
  selectedDate: string | null;
  selectedTime: number | null;
  cart: CartEntry[];
  deadCart: CartEntry[];
  isOrderSubmitted: boolean;
}

/**
 * Gets the current validation context from all stores and queries
 */
function getValidationContext(
  queryClient: QueryClient,
  isOrderSubmitted: boolean
): ValidationContext {
  const catalog = queryClient.getQueryData<ICatalog>(QUERY_KEYS.catalog) ?? null;
  const fulfillments = queryClient.getQueryData<FulfillmentConfig[]>(QUERY_KEYS.fulfillments) ?? null;
  const serverTimeData = queryClient.getQueryData<{ time: string }>(QUERY_KEYS.serverTime);
  const currentTime = serverTimeData ? new Date(serverTimeData.time).valueOf() : 0;

  const fulfillmentState = useFulfillmentStore.getState();
  const cartState = useCartStore.getState();

  return {
    catalog,
    fulfillments,
    currentTime,
    selectedService: fulfillmentState.selectedService,
    selectedDate: fulfillmentState.selectedDate,
    selectedTime: fulfillmentState.selectedTime,
    cart: cartState.cart,
    deadCart: cartState.deadCart,
    isOrderSubmitted,
  };
}

/**
 * Creates catalog selectors from catalog data
 */
function createCatalogSelectors(catalog: ICatalog | null): ICatalogSelectors | null {
  if (!catalog) return null;

  return {
    categories: () => Object.keys(catalog.categories),
    category: (id: string) => catalog.categories[id],
    modifierEntries: () => Object.keys(catalog.modifiers),
    modifierEntry: (id: string) => catalog.modifiers[id],
    options: () => Object.keys(catalog.options),
    option: (id: string) => catalog.options[id],
    productEntries: () => Object.keys(catalog.products),
    productEntry: (id: string) => catalog.products[id],
    productInstances: () => Object.keys(catalog.productInstances),
    productInstance: (id: string) => catalog.productInstances[id],
    orderInstanceFunctions: () => Object.keys(catalog.orderInstanceFunctions),
    orderInstanceFunction: (id: string) => catalog.orderInstanceFunctions[id],
    productInstanceFunctions: () => Object.keys(catalog.productInstanceFunctions),
    productInstanceFunction: (id: string) => catalog.productInstanceFunctions[id],
  };
}

/**
 * Validates and updates selected time if it's no longer available
 */
function validateSelectedTime(ctx: ValidationContext): void {
  const {
    catalog,
    fulfillments,
    currentTime,
    selectedService,
    selectedDate,
    selectedTime,
    cart,
    isOrderSubmitted,
  } = ctx;

  // Skip if order already submitted or insufficient data
  if (isOrderSubmitted || !catalog || !fulfillments || currentTime === 0) {
    return;
  }

  // Skip if no date/time/service selected
  if (
    selectedDate === null ||
    selectedTime === null ||
    selectedService === null
  ) {
    return;
  }

  const selectedFulfillment = fulfillments.find((f) => f.id === selectedService);
  if (!selectedFulfillment) {
    return;
  }

  const catalogSelectors = createCatalogSelectors(catalog);
  if (!catalogSelectors) {
    return;
  }

  // Calculate cart-based lead time
  const cartBasedLeadTime = DetermineCartBasedLeadTime(
    cart.map((x) => ({
      ...x,
      product: { modifiers: x.product.p.modifiers, pid: x.product.p.productId },
    })),
    (id: string) => catalogSelectors.productEntry(id)
  );

  // Get available time options for selected date and service
  const infoMap = WDateUtils.GetInfoMapForAvailabilityComputation(
    [selectedFulfillment],
    selectedDate,
    cartBasedLeadTime
  );
  const availableOptions = WDateUtils.GetOptionsForDate(
    infoMap,
    selectedDate,
    formatISO(currentTime)
  );

  // Check if currently selected time is still available
  const isTimeStillAvailable = availableOptions.some((opt) => opt.value === selectedTime);

  if (!isTimeStillAvailable) {
    if (availableOptions.length > 0) {
      // Find closest available time
      const earlierOptions = availableOptions.filter((x) => x.value < selectedTime);
      const laterOptions = availableOptions.filter((x) => x.value > selectedTime);
      const closestEarlierOption =
        earlierOptions.length > 0 ? earlierOptions[earlierOptions.length - 1] : null;
      const closestLaterOption = laterOptions.length > 0 ? laterOptions[0] : null;

      const newOption =
        closestEarlierOption !== null && closestLaterOption !== null
          ? selectedTime - closestEarlierOption.value <= closestLaterOption.value - selectedTime
            ? closestEarlierOption
            : closestLaterOption
          : closestEarlierOption ?? closestLaterOption;

      if (newOption) {
        useFulfillmentStore.getState().setTime(newOption.value);
        enqueueSnackbar(
          `Previously selected time of ${WDateUtils.MinutesToPrintTime(selectedTime)} is no longer available for your order. Updated to closest available time of ${WDateUtils.MinutesToPrintTime(newOption.value)}.`,
          { variant: 'warning' }
        );
        useMetricsStore.getState().incrementTimeBumps();
        useFulfillmentStore.getState().setSelectedTimeExpired();
      }
    } else {
      // No options for date anymore, send them back to the time selection screen
      useFulfillmentStore.getState().setSelectedDateExpired();
      useFulfillmentStore.getState().setDate(null);
      useFulfillmentStore.getState().setTime(null);
      enqueueSnackbar('Previously selected date is no longer available for your order.', {
        variant: 'warning',
      });
      useStepperStore.getState().setStage(STEPPER_STAGE_ENUM.TIMING);
    }
  }
}

/**
 * Validates cart items and manages deadCart
 */
function validateCartItems(ctx: ValidationContext): void {
  const {
    catalog,
    currentTime,
    selectedService,
    selectedDate,
    selectedTime,
    cart,
    deadCart,
    isOrderSubmitted,
  } = ctx;

  // Skip if order already submitted or insufficient data
  if (isOrderSubmitted || !catalog || currentTime === 0) {
    return;
  }

  const catalogSelectors = createCatalogSelectors(catalog);
  if (!catalogSelectors) {
    return;
  }

  // Determine service time for availability checks
  const service = selectedService || Object.keys(catalog.categories)[0] || '';
  const menuTime = (
    selectedDate !== null && selectedTime !== null
      ? WDateUtils.ComputeServiceDateTime({ selectedDate, selectedTime })
      : WDateUtils.ComputeFulfillmentTime(currentTime)
  ) as Date | number;

  // Check cart items for availability
  const toKill: CartEntry[] = [];
  const toRefreshMetadata: CartEntry[] = [];

  cart.forEach((entry) => {
    const isAvailable = CanThisBeOrderedAtThisTimeAndFulfillmentCatalog(
      entry.product.p.productId,
      entry.product.p.modifiers,
      catalogSelectors,
      menuTime,
      service,
      true
    );

    const categoryEntry = catalogSelectors.category(entry.categoryId);
    const isCategoryAllowed =
      categoryEntry && categoryEntry.category.serviceDisable.indexOf(service) === -1;

    if (!isAvailable || !isCategoryAllowed) {
      toKill.push(entry);
    } else {
      toRefreshMetadata.push(entry);
    }
  });

  // Check deadCart items for revival opportunities
  const toRevive = deadCart.filter((entry) => {
    const isAvailable = CanThisBeOrderedAtThisTimeAndFulfillmentCatalog(
      entry.product.p.productId,
      entry.product.p.modifiers,
      catalogSelectors,
      menuTime,
      service,
      true
    );

    const categoryEntry = catalogSelectors.category(entry.categoryId);
    const isCategoryAllowed =
      categoryEntry && categoryEntry.category.serviceDisable.indexOf(service) === -1;

    return isAvailable && isCategoryAllowed;
  });

  // Execute cart updates
  const cartStore = useCartStore.getState();

  if (toKill.length > 0) {
    if (toKill.length < 4) {
      toKill.forEach((x) =>
        enqueueSnackbar(`${x.product.m.name} as configured is no longer available.`, {
          variant: 'warning',
        })
      );
    } else {
      const productNames = toKill.map((x) => x.product.m.name);
      const formattedList = productNames.reduceRight(
        (acc, prod, i) =>
          i === 0 ? acc : i === productNames.length - 1 ? `${acc}, and ${prod}` : `${acc}, ${prod}`,
        ''
      );
      enqueueSnackbar(`The ${formattedList} as configured are no longer available.`, {
        variant: 'warning',
      });
    }
    cartStore.killAllCartEntries(toKill);
  }

  // Only update cart products if their metadata actually changed
  // This prevents an infinite loop where:
  // 1. Cart update triggers subscription
  // 2. Subscription schedules validation
  // 3. Validation regenerates metadata and updates cart
  // 4. Go to step 1...
  if (toRefreshMetadata.length > 0) {
    const updatesWithChanges = toRefreshMetadata
      .map((x) => {
        const newMetadata = WCPProductGenerateMetadata(
          x.product.p.productId,
          x.product.p.modifiers,
          catalogSelectors,
          menuTime,
          service
        );
        return {
          entry: x,
          newMetadata,
          hasChanged: JSON.stringify(x.product.m) !== JSON.stringify(newMetadata),
        };
      })
      .filter((x) => x.hasChanged);

    if (updatesWithChanges.length > 0) {
      cartStore.updateManyCartProducts(
        updatesWithChanges.map((x) => ({
          id: x.entry.id,
          product: {
            ...x.entry.product,
            m: x.newMetadata,
          },
        }))
      );
    }
  }

  if (toRevive.length > 0) {
    if (toRevive.length < 4) {
      toRevive.forEach((x) =>
        enqueueSnackbar(
          `${x.product.m.name} as configured is once again available and has been returned to your order.`,
          { variant: 'warning' }
        )
      );
    } else {
      const productNames = toRevive.map((x) => x.product.m.name);
      const formattedList = productNames.reduceRight(
        (acc, prod, i) =>
          i === 0 ? acc : i === productNames.length - 1 ? `${acc}, and ${prod}` : `${acc}, ${prod}`,
        ''
      );
      enqueueSnackbar(
        `The ${formattedList} as configured are once again available and returned to your order.`,
        { variant: 'warning' }
      );
    }
    cartStore.reviveAllCartEntries(
      toRevive.map((x) => ({
        ...x,
        product: {
          ...x.product,
          m: WCPProductGenerateMetadata(
            x.product.p.productId,
            x.product.p.modifiers,
            catalogSelectors,
            menuTime,
            service
          ),
        },
      }))
    );
  }
}

/**
 * Main validation function that runs all checks
 */
function runValidation(queryClient: QueryClient, isOrderSubmitted: boolean): void {
  const ctx = getValidationContext(queryClient, isOrderSubmitted);
  validateSelectedTime(ctx);
  validateCartItems(ctx);
}

/**
 * Sets up cart validation listener
 * Returns cleanup function to unsubscribe
 */
export function setupCartValidationListener(
  queryClient: QueryClient,
  getIsOrderSubmitted: () => boolean
): () => void {
  let validationTimeout: NodeJS.Timeout | null = null;

  // Debounced validation to avoid excessive processing
  const scheduleValidation = () => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }
    validationTimeout = setTimeout(() => {
      runValidation(queryClient, getIsOrderSubmitted());
      validationTimeout = null;
    }, 100);
  };

  // Subscribe to Zustand stores
  const unsubscribeFulfillment = useFulfillmentStore.subscribe(scheduleValidation);
  const unsubscribeCart = useCartStore.subscribe(scheduleValidation);

  // Subscribe to TanStack Query cache
  const unsubscribeQuery = queryClient.getQueryCache().subscribe((event) => {
    // Trigger validation when catalog, fulfillments, or server time updates
    if (
      event.query.queryKey === QUERY_KEYS.catalog ||
      event.query.queryKey === QUERY_KEYS.fulfillments ||
      event.query.queryKey === QUERY_KEYS.serverTime
    ) {
      scheduleValidation();
    }
  });

  // Return combined cleanup function
  return () => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }
    unsubscribeFulfillment();
    unsubscribeCart();
    unsubscribeQuery();
  };
}
