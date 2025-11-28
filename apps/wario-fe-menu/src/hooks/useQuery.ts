import { formatISO } from "date-fns";

import {
  type CatalogModifierEntry,
  GetNextAvailableServiceDate,
  type ICatalogSelectors,
  type IOption,
  type IProductInstance,
  SortAndFilterModifierOptions,
  WDateUtils,
  type WProductMetadata,
} from "@wcp/wario-shared";
import { type ProductCategoryFilter } from "@wcp/wario-ux-shared/common";
import {
  useCatalogSelectors,
  useDefaultFulfillmentId,
  useFulfillmentById,
  useFulfillmentMenuCategoryId,
  useModifierEntryById,
  useOptionById,
  useParentProductEntryFromProductInstanceId,
  usePopulatedSubcategoryIdsInCategory,
  useProductInstanceById,
  useProductInstancesInCategory,
  useProductMetadata,
  useServerTime,
} from '@wcp/wario-ux-shared/query';


export function useMenuCategoryId() {
  const defaultFilfillmentId = useDefaultFulfillmentId();
  const fulfillment = useFulfillmentMenuCategoryId(defaultFilfillmentId as string);
  return fulfillment;
}

export function useDefaultFulfillmentInfo() {
  const defaultFilfillmentId = useDefaultFulfillmentId();
  const fulfillmentInfo = useFulfillmentById(defaultFilfillmentId as string);
  return fulfillmentInfo;
}

export function useNextAvailableServiceDateTime() {
  const fulfillmentInfo = useDefaultFulfillmentInfo();
  const { currentTime } = useServerTime();
  if (!fulfillmentInfo || WDateUtils.AreWeOpenNow([fulfillmentInfo], currentTime)) {
    return WDateUtils.ComputeFulfillmentTime(currentTime);
  }
  const nextAvailableServiceDate = GetNextAvailableServiceDate([fulfillmentInfo], formatISO(currentTime), 0);
  if (nextAvailableServiceDate) {
    return nextAvailableServiceDate;
  }
  console.warn("There should be a service date available, falling back to now. Likely a config or programming error.")
  return WDateUtils.ComputeFulfillmentTime(currentTime);
}

export function useCurrentTimeForDefaultFulfillment() {
  const data = useNextAvailableServiceDateTime();
  return WDateUtils.ComputeServiceDateTime(data);
}
/**
 * If we don't have a selected service or if we're open now, return the current time
 * Otherwise, return the next available service date
 */
export function useNextAvailableServiceDateTimeForDefaultFulfillment() {
  const defaultFulfillmentInfo = useDefaultFulfillmentInfo();
  const { currentTime } = useServerTime();
  return defaultFulfillmentInfo
    ? GetNextAvailableServiceDate([defaultFulfillmentInfo], formatISO(currentTime), 0)
    : null;
}

export function useModifierTypeOrdinalFromModifierTypeId(modifierTypeId: string) {
  const modifierTypeEntry = useModifierEntryById(modifierTypeId);
  return modifierTypeEntry?.modifierType.ordinal;
}

export function useShouldFilterModifierTypeDisplay(modifierTypeId: string, hasSelectable: boolean) {
  const modifierTypeEntry = useModifierEntryById(modifierTypeId);
  // cases to not show:
  // modifier.display_flags.omit_section_if_no_available_options && (has selected item, all other options cannot be selected, currently selected items cannot be deselected)
  // modifier.display_flags.hidden is true
  return modifierTypeEntry
    ? !modifierTypeEntry.modifierType.displayFlags.hidden && (!modifierTypeEntry.modifierType.displayFlags.omit_section_if_no_available_options || hasSelectable)
    : false;
}

export function useProductMetadataForMenu(productInstanceId: string) {
  const productInstance = useProductInstanceById(productInstanceId) as IProductInstance;
  const service_time = useCurrentTimeForDefaultFulfillment();
  const fulfillmentId = useDefaultFulfillmentId() as string;
  const metadata = useProductMetadata(productInstance.productId, productInstance.modifiers, service_time, fulfillmentId);
  return metadata;
}

export function usePopulatedSubcategoryIdsInCategoryForNextAvailableTime(categoryId: string, filter: ProductCategoryFilter) {
  const defaultFulfillmentId = useDefaultFulfillmentId();
  const nextAvailableTime = useCurrentTimeForDefaultFulfillment();

  return usePopulatedSubcategoryIdsInCategory(categoryId, filter, nextAvailableTime, defaultFulfillmentId as string);
}

export function useProductInstanceIdsInCategoryForNextAvailableTime(categoryId: string, filter: ProductCategoryFilter) {
  const defaultFulfillmentId = useDefaultFulfillmentId();
  const nextAvailableTime = useCurrentTimeForDefaultFulfillment();
  return useProductInstancesInCategory(categoryId, filter, nextAvailableTime, defaultFulfillmentId as string);
}

export function useMenuOrderedModifiersVisibleForProductInstanceId(productInstanceId: string) {
  const metadata = useProductMetadataForMenu(productInstanceId);
  const fulfillmentId = useDefaultFulfillmentId();
  const productEntry = useParentProductEntryFromProductInstanceId(productInstanceId);
  const { modifierEntry: modifierTypeSelector } = useCatalogSelectors() as ICatalogSelectors;
  return productEntry && metadata ? productEntry.product.modifiers
    .filter(x => x.serviceDisable.indexOf(fulfillmentId as string) === -1)
    .map(x => { return { md: x, mt: modifierTypeSelector(x.mtid)?.modifierType } })
    .filter(x => x.mt && !x.mt.displayFlags.hidden && (!x.mt.displayFlags.omit_section_if_no_available_options || metadata.modifier_map[x.mt.id].has_selectable))
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .sort((a, b) => a.mt!.ordinal - b.mt!.ordinal)
    .map(x => x.md) : [];
}
export function useMenuSelectVisibleModifierOptions(productInstanceId: string, mtId: string) {
  const metadata = useProductMetadataForMenu(productInstanceId) as WProductMetadata;
  const serviceDateTime = useCurrentTimeForDefaultFulfillment();
  const modifierTypeEntry = useModifierEntryById(mtId) as CatalogModifierEntry;
  const modifierOptionSelector = useCatalogSelectors()?.option as (id: string) => IOption;
  const sortedVisibleOptions = SortAndFilterModifierOptions(metadata, modifierTypeEntry, modifierOptionSelector, serviceDateTime);
  return sortedVisibleOptions.map(x => x.id);
}

export function useMenuSelectMetadataModifierOptionMapEntryFromProductInstanceIdAndModifierOptionId(productInstanceId: string, moId: string) {
  const metadata = useProductMetadataForMenu(productInstanceId) as WProductMetadata;
  const modifierOption = useOptionById(moId) as IOption;
  return metadata.modifier_map[modifierOption.modifierTypeId].options[moId];
}