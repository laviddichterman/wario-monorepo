/**
 * Cart Validation Effect Component
 *
 * A leaf-level React component that handles cart validation using hooks.
 * Renders nothing (returns null) but performs validation side effects:
 * 1. Validates selected date/time remains available - updates to closest available or clears
 * 2. Validates cart items remain available - moves unavailable to deadCart
 * 3. Revives deadCart items that become available again
 * 4. Refreshes cart item metadata when relevant data changes
 *
 * Uses useMemo for caching expensive computations like reachable products.
 */

import { formatISO } from 'date-fns';
import { enqueueSnackbar } from 'notistack';
import { useEffect, useMemo, useRef } from 'react';

import type { CartEntry, FulfillmentConfig, ICatalogSelectors } from '@wcp/wario-shared';
import {
  CanThisBeOrderedAtThisTimeAndFulfillmentCatalog,
  DetermineCartBasedLeadTime,
  GenerateProductsReachableAndNotDisabledFromFulfillment,
  IsSomethingDisabledForFulfillment,
  WCPProductGenerateMetadata,
  WDateUtils,
} from '@wcp/wario-shared';
import { useCatalogSelectors, useCurrentTime, useFulfillments } from '@wcp/wario-ux-shared/query';

import { useSubmitOrderMutation } from '@/hooks/useSubmitOrderMutation';

import { STEPPER_STAGE_ENUM } from '@/config';
import { selectCart, selectDeadCart, useCartStore } from '@/stores/useCartStore';
import {
  selectSelectedDate,
  selectSelectedService,
  selectSelectedTime,
  selectServiceDateTime,
  useFulfillmentStore,
} from '@/stores/useFulfillmentStore';
import { useMetricsStore } from '@/stores/useMetricsStore';
import { useStepperStore } from '@/stores/useStepperStore';

/** Debounce delay for validation logic (ms) */
const VALIDATION_DEBOUNCE_MS = 100;

/**
 * Validates and updates selected time if it's no longer available.
 * Pure function - all state changes are handled via callbacks.
 */
function validateSelectedTimeLogic(
  catalogSelectors: ICatalogSelectors,
  selectedFulfillment: FulfillmentConfig,
  currentTime: number,
  selectedDate: string,
  selectedTime: number,
  cart: CartEntry[],
  actions: {
    setTime: (time: number | null) => void;
    setDate: (date: string | null) => void;
    setSelectedTimeExpired: () => void;
    setSelectedDateExpired: () => void;
    setStage: (stage: STEPPER_STAGE_ENUM) => void;
    incrementTimeBumps: () => void;
  },
): void {
  // Calculate cart-based lead time
  const cartBasedLeadTime = DetermineCartBasedLeadTime(
    cart.map((x) => ({
      ...x,
      product: { modifiers: x.product.p.modifiers, pid: x.product.p.productId },
    })),
    (id: string) => catalogSelectors.productEntry(id),
  );

  // Get available time options for selected date and service
  const infoMap = WDateUtils.GetInfoMapForAvailabilityComputation(
    [selectedFulfillment],
    selectedDate,
    cartBasedLeadTime,
  );
  const availableOptions = WDateUtils.GetOptionsForDate(infoMap, selectedDate, formatISO(currentTime));

  // Check if currently selected time is still available
  const isTimeStillAvailable = availableOptions.some((opt) => opt.value === selectedTime);

  if (!isTimeStillAvailable) {
    if (availableOptions.length > 0) {
      // Find closest available time
      const earlierOptions = availableOptions.filter((x) => x.value < selectedTime);
      const laterOptions = availableOptions.filter((x) => x.value > selectedTime);
      const closestEarlierOption = earlierOptions.length > 0 ? earlierOptions[earlierOptions.length - 1] : null;
      const closestLaterOption = laterOptions.length > 0 ? laterOptions[0] : null;

      const newOption =
        closestEarlierOption !== null && closestLaterOption !== null
          ? selectedTime - closestEarlierOption.value <= closestLaterOption.value - selectedTime
            ? closestEarlierOption
            : closestLaterOption
          : (closestEarlierOption ?? closestLaterOption);

      if (newOption) {
        actions.setTime(newOption.value);
        enqueueSnackbar(
          `Previously selected time of ${WDateUtils.MinutesToPrintTime(selectedTime)} is no longer available for your order. Updated to closest available time of ${WDateUtils.MinutesToPrintTime(newOption.value)}.`,
          { variant: 'warning' },
        );
        actions.incrementTimeBumps();
        actions.setSelectedTimeExpired();
      }
    } else {
      // No options for date anymore, send them back to the time selection screen
      actions.setSelectedDateExpired();
      actions.setDate(null);
      actions.setTime(null);
      enqueueSnackbar('Previously selected date is no longer available for your order.', {
        variant: 'warning',
      });
      actions.setStage(STEPPER_STAGE_ENUM.TIMING);
    }
  }
}

/**
 * Validates cart items and manages deadCart.
 * Pure function - all state changes are handled via callbacks.
 */
function validateCartItemsLogic(
  catalogSelectors: ICatalogSelectors,
  reachableProducts: Set<string>,
  serviceTime: Date | number,
  fulfillmentId: string,
  cart: CartEntry[],
  deadCart: CartEntry[],
  actions: {
    killAllCartEntries: (entries: CartEntry[]) => void;
    reviveAllCartEntries: (entries: CartEntry[]) => void;
    updateManyCartProducts: (updates: { id: string; product: CartEntry['product'] }[]) => void;
  },
): void {
  // Check cart items for availability
  const toKill: CartEntry[] = [];
  const toRefreshMetadata: CartEntry[] = [];

  cart.forEach((entry) => {
    const isAvailable = CanThisBeOrderedAtThisTimeAndFulfillmentCatalog(
      entry.product.p.productId,
      entry.product.p.modifiers,
      catalogSelectors,
      serviceTime,
      reachableProducts,
      fulfillmentId,
      true, // filterIncomplete
    );

    const categoryEntry = catalogSelectors.category(entry.categoryId);
    const isCategoryAllowed = categoryEntry && !IsSomethingDisabledForFulfillment(categoryEntry, fulfillmentId);

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
      serviceTime,
      reachableProducts,
      fulfillmentId,
      true, // filterIncomplete
    );

    const categoryEntry = catalogSelectors.category(entry.categoryId);
    const isCategoryAllowed = categoryEntry && !IsSomethingDisabledForFulfillment(categoryEntry, fulfillmentId);

    return isAvailable && isCategoryAllowed;
  });

  // Execute cart updates
  if (toKill.length > 0) {
    if (toKill.length < 4) {
      toKill.forEach((x) =>
        enqueueSnackbar(`${x.product.m.name} as configured is no longer available.`, {
          variant: 'warning',
        }),
      );
    } else {
      const productNames = toKill.map((x) => x.product.m.name);
      const formattedList = productNames.reduceRight(
        (acc, prod, i) => (i === 0 ? acc : i === productNames.length - 1 ? `${acc}, and ${prod}` : `${acc}, ${prod}`),
        '',
      );
      enqueueSnackbar(`The ${formattedList} as configured are no longer available.`, {
        variant: 'warning',
      });
    }
    actions.killAllCartEntries(toKill);
  }

  // Only update cart products if their metadata actually changed
  if (toRefreshMetadata.length > 0) {
    const updatesWithChanges = toRefreshMetadata
      .map((x) => {
        const newMetadata = WCPProductGenerateMetadata(
          x.product.p.productId,
          x.product.p.modifiers,
          catalogSelectors,
          serviceTime,
          fulfillmentId,
        );
        return {
          entry: x,
          newMetadata,
          hasChanged: JSON.stringify(x.product.m) !== JSON.stringify(newMetadata),
        };
      })
      .filter((x) => x.hasChanged);

    if (updatesWithChanges.length > 0) {
      actions.updateManyCartProducts(
        updatesWithChanges.map((x) => ({
          id: x.entry.id,
          product: {
            ...x.entry.product,
            m: x.newMetadata,
          },
        })),
      );
    }
  }

  if (toRevive.length > 0) {
    if (toRevive.length < 4) {
      toRevive.forEach((x) =>
        enqueueSnackbar(
          `${x.product.m.name} as configured is once again available and has been returned to your order.`,
          { variant: 'warning' },
        ),
      );
    } else {
      const productNames = toRevive.map((x) => x.product.m.name);
      const formattedList = productNames.reduceRight(
        (acc, prod, i) => (i === 0 ? acc : i === productNames.length - 1 ? `${acc}, and ${prod}` : `${acc}, ${prod}`),
        '',
      );
      enqueueSnackbar(`The ${formattedList} as configured are once again available and returned to your order.`, {
        variant: 'warning',
      });
    }
    actions.reviveAllCartEntries(
      toRevive.map((x) => ({
        ...x,
        product: {
          ...x.product,
          m: WCPProductGenerateMetadata(
            x.product.p.productId,
            x.product.p.modifiers,
            catalogSelectors,
            serviceTime,
            fulfillmentId,
          ),
        },
      })),
    );
  }
}

/**
 * Cart Validation Effect Component
 *
 * Invisible component that handles validation logic via React hooks.
 * Must be rendered inside SnackbarProvider for notifications.
 */
export default function CartValidationEffect(): null {
  // ============================================================================
  // Hook Subscriptions (selective to minimize re-renders)
  // ============================================================================

  const catalogSelectors = useCatalogSelectors();
  const fulfillments = useFulfillments();
  const currentTime = useCurrentTime();

  // Zustand store subscriptions with selectors
  const selectedService = useFulfillmentStore(selectSelectedService);
  const selectedDate = useFulfillmentStore(selectSelectedDate);
  const selectedTime = useFulfillmentStore(selectSelectedTime);
  const serviceDateTime = useFulfillmentStore(selectServiceDateTime);
  const cart = useCartStore(selectCart);
  const deadCart = useCartStore(selectDeadCart);

  // Check if order is submitted
  const submitOrderMutation = useSubmitOrderMutation();
  const isOrderSubmitted = submitOrderMutation.isPending || submitOrderMutation.isSuccess;

  // ============================================================================
  // Memoized Computations
  // ============================================================================

  /** Selected fulfillment config */
  const selectedFulfillment = useMemo(() => {
    if (!selectedService || fulfillments.length === 0) return null;
    return fulfillments.find((f) => f.id === selectedService) ?? null;
  }, [fulfillments, selectedService]);

  /**
   * Reachable products for the selected fulfillment.
   * This is the expensive computation we want to cache.
   */
  const reachableProducts = useMemo(() => {
    if (!catalogSelectors || !selectedFulfillment) return null;
    return GenerateProductsReachableAndNotDisabledFromFulfillment(selectedFulfillment, catalogSelectors);
  }, [catalogSelectors, selectedFulfillment]);

  /** Service time for availability checks - always returns Date | number */
  const menuTime: Date | number = useMemo(() => {
    if (serviceDateTime) {
      return serviceDateTime;
    }
    const fulfillmentTime = WDateUtils.ComputeFulfillmentTime(currentTime);
    // ComputeFulfillmentTime returns FulfillmentTime | Date, convert to Date if needed
    if (typeof fulfillmentTime === 'object' && 'selectedDate' in fulfillmentTime) {
      return WDateUtils.ComputeServiceDateTime(fulfillmentTime);
    }
    return fulfillmentTime;
  }, [serviceDateTime, currentTime]);

  // ============================================================================
  // Validation Effects
  // ============================================================================

  // Use ref to track if we have pending validation to handle debouncing
  const timeValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cartValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Time validation effect
  useEffect(() => {
    // Clear any pending validation
    if (timeValidationTimeoutRef.current) {
      clearTimeout(timeValidationTimeoutRef.current);
    }

    // Skip if order submitted or insufficient data
    if (
      isOrderSubmitted ||
      !catalogSelectors ||
      !selectedFulfillment ||
      currentTime === 0 ||
      selectedDate === null ||
      selectedTime === null
    ) {
      return;
    }

    // Debounce validation
    timeValidationTimeoutRef.current = setTimeout(() => {
      validateSelectedTimeLogic(catalogSelectors, selectedFulfillment, currentTime, selectedDate, selectedTime, cart, {
        setTime: useFulfillmentStore.getState().setTime,
        setDate: useFulfillmentStore.getState().setDate,
        setSelectedTimeExpired: useFulfillmentStore.getState().setSelectedTimeExpired,
        setSelectedDateExpired: useFulfillmentStore.getState().setSelectedDateExpired,
        setStage: useStepperStore.getState().setStage,
        incrementTimeBumps: useMetricsStore.getState().incrementTimeBumps,
      });
      timeValidationTimeoutRef.current = null;
    }, VALIDATION_DEBOUNCE_MS);

    return () => {
      if (timeValidationTimeoutRef.current) {
        clearTimeout(timeValidationTimeoutRef.current);
      }
    };
  }, [catalogSelectors, selectedFulfillment, currentTime, selectedDate, selectedTime, cart, isOrderSubmitted]);

  // Cart validation effect
  useEffect(() => {
    // Clear any pending validation
    if (cartValidationTimeoutRef.current) {
      clearTimeout(cartValidationTimeoutRef.current);
    }

    // Skip if order submitted or insufficient data
    if (isOrderSubmitted || !catalogSelectors || !reachableProducts || !selectedService || currentTime === 0) {
      return;
    }

    // Debounce validation
    cartValidationTimeoutRef.current = setTimeout(() => {
      validateCartItemsLogic(catalogSelectors, reachableProducts, menuTime, selectedService, cart, deadCart, {
        killAllCartEntries: useCartStore.getState().killAllCartEntries,
        reviveAllCartEntries: useCartStore.getState().reviveAllCartEntries,
        updateManyCartProducts: useCartStore.getState().updateManyCartProducts,
      });
      cartValidationTimeoutRef.current = null;
    }, VALIDATION_DEBOUNCE_MS);

    return () => {
      if (cartValidationTimeoutRef.current) {
        clearTimeout(cartValidationTimeoutRef.current);
      }
    };
  }, [catalogSelectors, reachableProducts, menuTime, selectedService, cart, deadCart, currentTime, isOrderSubmitted]);

  // This component renders nothing
  return null;
}
