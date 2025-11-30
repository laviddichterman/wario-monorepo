import { formatISO } from "date-fns/formatISO";
import { useMemo } from "react";

import { type CatalogModifierEntry, ComputeCategoryTreeIdList, ComputeProductCategoryMatchCount, CURRENCY, DetermineCartBasedLeadTime, type FulfillmentConfig, GetNextAvailableServiceDate, GroupAndOrderCart, type ICatalogSelectors, type IProduct, type IProductInstance, IsModifierTypeVisible, type MetadataModifierMap, type ProductModifierEntry, SortAndFilterModifierOptions, WDateUtils, type WProductMetadata } from "@wcp/wario-shared";
import { useAutoGratutityThreshold, useCatalogSelectors, useDefaultFulfillmentId, useFulfillmentById, useFulfillmentMainCategoryId, useProductInstanceById, useProductMetadata, useServerTime, useValueFromFulfillmentById, useValueFromProductEntryById } from "@wcp/wario-ux-shared/query";

import { selectCart, selectCartEntry, useCartStore } from "@/stores/useCartStore";
import { selectCartId, useCustomizerStore } from "@/stores/useCustomizerStore";
import { selectSelectedService, selectServiceDateTime, useFulfillmentStore } from "@/stores/useFulfillmentStore";



export function useSelectedFulfillment() {
  const selectedFulfillmentId = useFulfillmentStore(selectSelectedService) as string;
  const fulfillment = useFulfillmentById(selectedFulfillmentId);
  return fulfillment ?? null;
}

export function usePropertyFromSelectedFulfillment<K extends keyof FulfillmentConfig>(key: K) {
  const fulfillment = useSelectedFulfillment();
  return fulfillment ? fulfillment[key] : null;
}

export function useGroupedAndOrderedCart() {
  const cart = useCartStore(selectCart);
  const { category } = useCatalogSelectors() as ICatalogSelectors;
  return GroupAndOrderCart(cart, category);
}

export function useSelectableModifiers(mMap: MetadataModifierMap) {
  const { modifierEntry: modifierTypeSelector } = useCatalogSelectors() as ICatalogSelectors;
  const mods = useMemo(() => Object.entries(mMap).reduce<MetadataModifierMap>((acc, [k, v]) => {
    const modifierEntry = modifierTypeSelector(k) as CatalogModifierEntry;
    return IsModifierTypeVisible(modifierEntry.modifierType, v.has_selectable) ? { ...acc, k: v } : acc;
  }, {}), [mMap, modifierTypeSelector]);
  return mods;
}

export function useHasSelectableModifiers(mMap: MetadataModifierMap) {
  const selectableModifiers = useSelectableModifiers(mMap);
  return Object.values(selectableModifiers).length > 0;
}

export function useMainCategoryTreeIdList(categoryId: string) {
  const { category: categorySelector } = useCatalogSelectors() as ICatalogSelectors;
  const categoryTreeIdList = useMemo(() => ComputeCategoryTreeIdList(categoryId, (id: string) => categorySelector(id)), [categoryId, categorySelector]);
  return categoryTreeIdList;
}

/** Computes the number of products in the cart that are in the main category tree */
export function useMainProductCategoryCount(fulfillmentId: string) {
  const mainCategoryId = useFulfillmentMainCategoryId(fulfillmentId);
  const mainCategoryTreeIdList = useMainCategoryTreeIdList(mainCategoryId as string);
  const cart = useCartStore(selectCart);
  const productCategoryCount = useMemo(() => {
    return ComputeProductCategoryMatchCount(mainCategoryTreeIdList, cart);
  }, [mainCategoryTreeIdList, cart]);
  return productCategoryCount;
}

export function useIsAutogratuityEnabledByFulfillmentId(fulfillmentId: string) {
  const autoGratutityThreshold = useAutoGratutityThreshold() as number;
  const mainProductCategoryCount = useMainProductCategoryCount(fulfillmentId);
  const { deliveryInfo, dineInInfo } = useFulfillmentStore();
  const specialInstructions = "0";// useFulfillmentStore(s => s.specialInstructions);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return deliveryInfo !== null || dineInInfo !== null || mainProductCategoryCount >= autoGratutityThreshold || (specialInstructions && specialInstructions.length > 20);
}


/**
* Selects/Computes the product metadata for a potentially custom product (product class ID and selected modifiers) using the currently populated fulfillment info
*/
export function useProductMetadataWithCurrentFulfillmentData(productId: string, modifiers: ProductModifierEntry[]) {
  const selectedService = useFulfillmentStore(selectSelectedService) as string;
  const serviceDate = useFulfillmentStore(selectServiceDateTime) as Date
  const metadata = useProductMetadata(productId, modifiers, serviceDate, selectedService);
  return metadata;
}

export function useVisibleModifierOptions(productId: string, modifiers: ProductModifierEntry[], mtId: string) {
  const metadata = useProductMetadataWithCurrentFulfillmentData(productId, modifiers) as WProductMetadata;
  const { modifierEntry: modifierTypeSelector, option: modifierOptionSelector } = useCatalogSelectors() as ICatalogSelectors;
  const modifierTypeEntry = modifierTypeSelector(mtId) as CatalogModifierEntry;
  const serviceDateTime = useFulfillmentStore(selectServiceDateTime) as Date;

  return useMemo(() => {
    return SortAndFilterModifierOptions(metadata, modifierTypeEntry, modifierOptionSelector, serviceDateTime);
  }, [metadata, modifierTypeEntry, modifierOptionSelector, serviceDateTime]);
}


export function useSortedVisibleModifiers(productId: string, modifiers: ProductModifierEntry[]) {
  const fulfillmentId = useFulfillmentStore(selectSelectedService) as string;
  const metadata = useProductMetadataWithCurrentFulfillmentData(productId, modifiers) as WProductMetadata;
  const productType = useValueFromProductEntryById(productId, "product") as IProduct;
  const { modifierEntry: modifierTypeSelector } = useCatalogSelectors() as ICatalogSelectors;

  return useMemo(() => {
    return productType.modifiers
      .filter(x => x.serviceDisable.indexOf(fulfillmentId) === -1)
      .map(x => { return { entry: modifierTypeSelector(x.mtid), pm: x, md: metadata.modifier_map[x.mtid] } })
      .filter(x => IsModifierTypeVisible(x.entry?.modifierType, x.md.has_selectable))
      .sort((a, b) => (a.entry as CatalogModifierEntry).modifierType.ordinal - (b.entry as CatalogModifierEntry).modifierType.ordinal)
      .map(x => x.pm)
  }, [productType, fulfillmentId, metadata, modifierTypeSelector]);
}

/**
 * Selects/Computes the product metadata for a catalog product instance using the currently populated fulfillment info
 */
export function useProductMetadataFromProductInstanceIdWithCurrentFulfillmentData(productInstanceId: string) {
  const product = useProductInstanceById(productInstanceId) as IProductInstance;
  return useProductMetadataWithCurrentFulfillmentData(product.productId, product.modifiers);
}

export function useProductHasSelectableModifiersByProductInstanceId(productInstanceId: string) {
  const metadata = useProductMetadataFromProductInstanceIdWithCurrentFulfillmentData(productInstanceId);
  return useHasSelectableModifiers(metadata?.modifier_map || {});
}

export function useShouldFilterModifierTypeDisplay(modifierTypeId: string, hasSelectable: boolean) {
  const { modifierEntry: modifierTypeSelector } = useCatalogSelectors() as ICatalogSelectors;
  return useMemo(() => {
    const modifierTypeEntry = modifierTypeSelector(modifierTypeId);
    return !modifierTypeEntry || !modifierTypeEntry.modifierType.displayFlags.hidden &&
      (!modifierTypeEntry.modifierType.displayFlags.omit_section_if_no_available_options || hasSelectable);
  }, [modifierTypeId, hasSelectable, modifierTypeSelector]);
}

export function useSelectedServiceTimeDisplayString() {
  const { selectedTime, selectedService } = useFulfillmentStore();
  const minDuration = useValueFromFulfillmentById(selectedService as string, 'minDuration');
  return minDuration !== null && selectedService !== null && selectedTime !== null ?
    (minDuration === 0 ? WDateUtils.MinutesToPrintTime(selectedTime) : `${WDateUtils.MinutesToPrintTime(selectedTime)} to ${WDateUtils.MinutesToPrintTime(selectedTime + minDuration)}`) : "";
}

export function useComputeServiceFee() {
  //partialOrder === null || serviceFeeFunctionId === null ? 0 : OrderFunctional.ProcessOrderInstanceFunction(partialOrder, catalog.orderInstanceFunctions[serviceFeeFunctionId], catalog)
  return ({ amount: 0, currency: CURRENCY.USD });
}

export function useSelectedCartEntry() {
  const selectedCartEntryId = useCustomizerStore(selectCartId);
  const selectedCartEntry = useCartStore(s => selectCartEntry(s, selectedCartEntryId));
  return selectedCartEntry;
}

export function useCartBasedLeadTime() {
  const cart = useCartStore(selectCart);
  const { productEntry: productsSelector } = useCatalogSelectors() as ICatalogSelectors;
  return useMemo(() => {
    return DetermineCartBasedLeadTime(cart.map(x => ({ ...x, product: { modifiers: x.product.p.modifiers, pid: x.product.p.productId } })), productsSelector);
  }, [cart, productsSelector]);
}

export function useComputeAvailabilityForFulfillmentDateAndCart(selectedDate: string, fulfillmentId: string) {
  const cartBasedLeadTime = useCartBasedLeadTime();
  const fulfillment = useFulfillmentById(fulfillmentId);
  return useMemo(() => {
    return WDateUtils.GetInfoMapForAvailabilityComputation(fulfillment ? [fulfillment] : [], selectedDate, cartBasedLeadTime);
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
