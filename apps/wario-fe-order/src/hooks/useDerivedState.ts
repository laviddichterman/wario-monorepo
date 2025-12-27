import { formatISO } from 'date-fns/formatISO';
import { useMemo } from 'react';

import {
  ComputeProductCategoryMatchCount,
  CURRENCY,
  DetermineCartBasedLeadTime,
  type FulfillmentConfig,
  GenerateCategoryOrderList,
  GetNextAvailableServiceDate,
  GroupAndOrderCart,
  type IProductInstance,
  type ProductInstanceModifierEntry,
  WDateUtils,
} from '@wcp/wario-shared/logic';
import {
  useCatalogSelectors,
  useDefaultFulfillmentId,
  useFulfillmentById,
  useHasSelectableModifiers,
  useProductInstanceById,
  useProductMetadata,
  useServerTime,
  useValueFromFulfillmentById,
} from '@wcp/wario-ux-shared/query';

import { selectCart, selectCartEntry, useCartStore } from '@/stores/useCartStore';
import { selectCartId, useCustomizerStore } from '@/stores/useCustomizerStore';
import { selectSelectedService, selectServiceDateTime, useFulfillmentStore } from '@/stores/useFulfillmentStore';
import { usePaymentStore } from '@/stores/usePaymentStore';

export function useMainCategoryOrderListForFulfillment() {
  const mainCategoryId = usePropertyFromSelectedFulfillment('orderBaseCategoryId');
  const catalogSelectors = useCatalogSelectors();
  return useMemo(() => {
    if (!catalogSelectors || !mainCategoryId) return [];
    return GenerateCategoryOrderList(mainCategoryId, (id: string) => catalogSelectors.category(id));
  }, [mainCategoryId, catalogSelectors]);
}

export function useSupplementalCategoryOrderListForFulfillment() {
  const supplementalCategoryId = usePropertyFromSelectedFulfillment('orderSupplementaryCategoryId');
  const catalogSelectors = useCatalogSelectors();
  return useMemo(() => {
    if (!catalogSelectors || !supplementalCategoryId) return [];
    return GenerateCategoryOrderList(supplementalCategoryId, (id: string) => catalogSelectors.category(id));
  }, [supplementalCategoryId, catalogSelectors]);
}

export function useCategoryOrderingList() {
  const mainCategoryOrderList = useMainCategoryOrderListForFulfillment();
  const supplementalCategoryOrderList = useSupplementalCategoryOrderListForFulfillment();
  return useMemo(() => {
    return [...mainCategoryOrderList, ...supplementalCategoryOrderList];
  }, [mainCategoryOrderList, supplementalCategoryOrderList]);
}

export function useCategoryOrderingMap() {
  const list = useCategoryOrderingList();
  return useMemo(() => {
    return Object.fromEntries(list.map((x, i) => [x, i] as [string, number]));
  }, [list]);
}

export function useSelectedFulfillment() {
  const selectedFulfillmentId = useFulfillmentStore(selectSelectedService) as string;
  const fulfillment = useFulfillmentById(selectedFulfillmentId);
  return fulfillment ?? null;
}

export function usePropertyFromSelectedFulfillment<K extends keyof FulfillmentConfig>(key: K) {
  const fulfillment = useSelectedFulfillment();
  return fulfillment ? fulfillment[key] : null;
}

export function useSelectedFulfillmentHasServiceTerms() {
  const terms = usePropertyFromSelectedFulfillment('terms');
  return useMemo(() => (terms?.length ?? 0) > 0, [terms]);
}

export function useGroupedAndOrderedCart() {
  const cart = useCartStore(selectCart);
  const categoryOrderingMap = useCategoryOrderingMap();
  const catalogSelectors = useCatalogSelectors();
  return useMemo(() => {
    if (!catalogSelectors) return [];
    return GroupAndOrderCart(cart, categoryOrderingMap);
  }, [cart, categoryOrderingMap, catalogSelectors]);
}

/** Computes the number of products in the cart that are in the main category tree */
export function useMainProductCategoryCartCount() {
  const mainCategoryTreeIdList = useMainCategoryOrderListForFulfillment();
  const cart = useCartStore(selectCart);
  const productCategoryCount = useMemo(() => {
    return ComputeProductCategoryMatchCount(mainCategoryTreeIdList, cart);
  }, [mainCategoryTreeIdList, cart]);
  return productCategoryCount;
}

export function useIsAutogratuityEnabled() {
  const autoGratuityThreshold = 3;
  const mainProductCategoryCount = useMainProductCategoryCartCount();
  const deliveryInfo = useFulfillmentStore((s) => s.deliveryInfo);
  const dineInInfo = useFulfillmentStore((s) => s.dineInInfo);
  const specialInstructions = usePaymentStore((s) => s.specialInstructions);
  return useMemo(() => {
    return (
      deliveryInfo !== null ||
      dineInInfo !== null ||
      mainProductCategoryCount >= autoGratuityThreshold ||
      (specialInstructions && specialInstructions.length > 20)
    );
  }, [deliveryInfo, dineInInfo, mainProductCategoryCount, autoGratuityThreshold, specialInstructions]);
}

/**
 * Selects/Computes the product metadata for a potentially custom product (product class ID and selected modifiers) using the currently populated fulfillment info
 */
export function useProductMetadataWithCurrentFulfillmentData(
  productId: string,
  modifiers: ProductInstanceModifierEntry[],
) {
  const selectedService = useFulfillmentStore(selectSelectedService) as string;
  const serviceDate = useFulfillmentStore(selectServiceDateTime) as Date;
  const metadata = useProductMetadata(productId, modifiers, serviceDate, selectedService);
  return metadata;
}

/**
 * Selects/Computes the product metadata for a catalog product instance using the currently populated fulfillment info
 */
export function useProductMetadataFromProductInstanceIdWithCurrentFulfillmentData(
  productId: string,
  productInstanceId: string,
) {
  const product = useProductInstanceById(productInstanceId) as IProductInstance;
  return useProductMetadataWithCurrentFulfillmentData(productId, product.modifiers);
}

export function useProductHasSelectableModifiersByProductInstanceId(productId: string, productInstanceId: string) {
  const metadata = useProductMetadataFromProductInstanceIdWithCurrentFulfillmentData(productId, productInstanceId);
  return useHasSelectableModifiers(metadata?.modifier_map || {});
}

export function useSelectedServiceTimeDisplayString() {
  const selectedTime = useFulfillmentStore((s) => s.selectedTime);
  const selectedService = useFulfillmentStore((s) => s.selectedService);
  const minDuration = useValueFromFulfillmentById(selectedService as string, 'minDuration');
  return useMemo(() => {
    if (minDuration === null || selectedService === null || selectedTime === null) return '';
    return minDuration === 0
      ? WDateUtils.MinutesToPrintTime(selectedTime)
      : `${WDateUtils.MinutesToPrintTime(selectedTime)} to ${WDateUtils.MinutesToPrintTime(selectedTime + minDuration)}`;
  }, [minDuration, selectedService, selectedTime]);
}

export function useComputeServiceFee() {
  //partialOrder === null || serviceFeeFunctionId === null ? 0 : OrderFunctional.ProcessOrderInstanceFunction(partialOrder, catalog.orderInstanceFunctions[serviceFeeFunctionId], catalog)
  return useMemo(() => ({ amount: 0, currency: CURRENCY.USD }), []);
}

export function useSelectedCartEntry() {
  const selectedCartEntryId = useCustomizerStore(selectCartId);
  const selectedCartEntry = useCartStore((s) => selectCartEntry(s, selectedCartEntryId));
  return selectedCartEntry;
}

export function useCartBasedLeadTime() {
  const cart = useCartStore(selectCart);
  const catalogSelectors = useCatalogSelectors();
  return useMemo(() => {
    return catalogSelectors
      ? DetermineCartBasedLeadTime(
          cart.map((x) => ({ ...x, product: { modifiers: x.product.p.modifiers, pid: x.product.p.productId } })),
          catalogSelectors.productEntry,
        )
      : 0;
  }, [cart, catalogSelectors]);
}

export function useComputeAvailabilityForFulfillmentDateAndCart(selectedDate: string, fulfillmentId: string) {
  const cartBasedLeadTime = useCartBasedLeadTime();
  const fulfillment = useFulfillmentById(fulfillmentId);
  return useMemo(() => {
    return WDateUtils.GetInfoMapForAvailabilityComputation(
      fulfillment ? [fulfillment] : [],
      selectedDate,
      cartBasedLeadTime,
    );
  }, [fulfillment, selectedDate, cartBasedLeadTime]);
}

export function useOptionsForFulfillmentAndDate(selectedDate: string, fulfillmentId: string) {
  const { currentTime } = useServerTime();
  const availability = useComputeAvailabilityForFulfillmentDateAndCart(selectedDate, fulfillmentId);
  return useMemo(() => {
    return WDateUtils.GetOptionsForDate(availability, selectedDate, formatISO(currentTime));
  }, [availability, selectedDate, currentTime]);
}

export function useNextAvailableServiceDateTimeForFulfillment(fulfillmentId: string) {
  const { currentTime } = useServerTime();
  const cartBasedLeadTime = useCartBasedLeadTime();
  const fulfillment = useFulfillmentById(fulfillmentId);
  return useMemo(() => {
    return GetNextAvailableServiceDate(fulfillment ? [fulfillment] : [], formatISO(currentTime), cartBasedLeadTime);
  }, [fulfillment, currentTime, cartBasedLeadTime]);
}

// Note: this falls back to now if there's really nothing for the selected service or for dine-in
export function useNextAvailableServiceDateTimeForSelectedOrDefaultFulfillment() {
  const fulfillmentId = useFulfillmentStore(selectSelectedService);
  const { currentTime } = useServerTime();
  const defaultFulfillmentId = useDefaultFulfillmentId() as string;
  const effectiveFulfillmentId = fulfillmentId || defaultFulfillmentId;
  const nextAvailableComputed = useNextAvailableServiceDateTimeForFulfillment(effectiveFulfillmentId);
  return nextAvailableComputed ? nextAvailableComputed : WDateUtils.ComputeFulfillmentTime(currentTime);
}
