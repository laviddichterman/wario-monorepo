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
  type IOptionType,
  type IProductInstance,
  IsModifierTypeVisible,
  type MetadataModifierMap,
  type ProductInstanceModifierEntry,
  SortAndFilterModifierOptions,
  WDateUtils,
} from '@wcp/wario-shared/logic';
import {
  useCatalogSelectors,
  useDefaultFulfillmentId,
  useFulfillmentById,
  useProductById,
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
  const mainCategoryId = usePropertyFromSelectedFulfillment('menuBaseCategoryId');
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

export function useSelectableModifiers(mMap: MetadataModifierMap) {
  const catalogSelectors = useCatalogSelectors();
  return useMemo(() => {
    if (!catalogSelectors) return {};
    return Object.entries(mMap).reduce<MetadataModifierMap>((acc, [k, v]) => {
      const modifierEntry = catalogSelectors.modifierEntry(k) as IOptionType;
      return IsModifierTypeVisible(modifierEntry, v.has_selectable) ? { ...acc, [k]: v } : acc;
    }, {});
  }, [mMap, catalogSelectors]);
}

export function useHasSelectableModifiers(mMap: MetadataModifierMap) {
  const selectableModifiers = useSelectableModifiers(mMap);
  return useMemo(() => Object.keys(selectableModifiers).length > 0, [selectableModifiers]);
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
  const autoGratutityThreshold = 3;
  const mainProductCategoryCount = useMainProductCategoryCartCount();
  const deliveryInfo = useFulfillmentStore((s) => s.deliveryInfo);
  const dineInInfo = useFulfillmentStore((s) => s.dineInInfo);
  const specialInstructions = usePaymentStore((s) => s.specialInstructions);
  return useMemo(() => {
    return (
      deliveryInfo !== null ||
      dineInInfo !== null ||
      mainProductCategoryCount >= autoGratutityThreshold ||
      (specialInstructions && specialInstructions.length > 20)
    );
  }, [deliveryInfo, dineInInfo, mainProductCategoryCount, autoGratutityThreshold, specialInstructions]);
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

export function useVisibleModifierOptions(productId: string, modifiers: ProductInstanceModifierEntry[], mtId: string) {
  const metadata = useProductMetadataWithCurrentFulfillmentData(productId, modifiers);
  const catalogSelectors = useCatalogSelectors();
  const serviceDateTime = useFulfillmentStore(selectServiceDateTime) as Date;

  return useMemo(() => {
    if (!catalogSelectors || !metadata) return [];
    const modifierTypeEntry = catalogSelectors.modifierEntry(mtId) as IOptionType;
    return SortAndFilterModifierOptions(metadata, modifierTypeEntry, catalogSelectors.option, serviceDateTime);
  }, [metadata, mtId, catalogSelectors, serviceDateTime]);
}

export function useSortedVisibleModifiers(productId: string, modifiers: ProductInstanceModifierEntry[]) {
  const fulfillmentId = useFulfillmentStore(selectSelectedService) as string;
  const metadata = useProductMetadataWithCurrentFulfillmentData(productId, modifiers);
  const productType = useProductById(productId);
  const catalogSelectors = useCatalogSelectors();

  return useMemo(() => {
    if (!productType || !metadata || !catalogSelectors) return [];
    return productType.modifiers
      .filter((x) => x.serviceDisable.indexOf(fulfillmentId) === -1)
      .map((x) => ({ entry: catalogSelectors.modifierEntry(x.mtid), pm: x, md: metadata.modifier_map[x.mtid] }))

      .filter((x) => IsModifierTypeVisible(x.entry, x.md.has_selectable))
      .sort((a, b) => (a.entry as IOptionType).ordinal - (b.entry as IOptionType).ordinal)
      .map((x) => x.pm);
  }, [productType, fulfillmentId, metadata, catalogSelectors]);
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

export function useShouldFilterModifierTypeDisplay(modifierTypeId: string, hasSelectable: boolean) {
  const catalogSelectors = useCatalogSelectors();
  return useMemo(() => {
    if (!catalogSelectors) return false;
    const modifierTypeEntry = catalogSelectors.modifierEntry(modifierTypeId);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!modifierTypeEntry) return false;
    return (
      !modifierTypeEntry.displayFlags.hidden &&
      (!modifierTypeEntry.displayFlags.omit_section_if_no_available_options || hasSelectable)
    );
  }, [modifierTypeId, hasSelectable, catalogSelectors]);
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
