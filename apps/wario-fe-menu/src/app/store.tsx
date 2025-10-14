import { configureStore, createSelector, combineReducers, EntityState } from "@reduxjs/toolkit";
import {
  SocketIoReducer,
  IProductInstancesAdapter,
  ProductInstanceFunctionsAdapter,
  SelectAllowAdvanced,
  SelectDefaultFulfillmentId,
  getProductEntryById,
  getFulfillmentById,
  getCategoryEntryById,
  weakMapCreateSelector,
  getProductInstanceById,
  SelectProductMetadata,
  getModifierTypeEntryById,
} from '@wcp/wario-ux-shared';
import WCustomizerReducer from './slices/WCustomizerSlice';
import WFulfillmentReducer, { SelectServiceDateTime } from './slices/WFulfillmentSlice';
import WMetricsReducer from './slices/WMetricsSlice';
import { SocketIoMiddleware } from "./slices/SocketIoMiddleware";
import ListeningMiddleware from "./slices/ListeningMiddleware";
import {
  
  MetadataModifierMap,
  WDateUtils,
  WProduct,
  FulfillmentConfig,
  GetNextAvailableServiceDate,
  Metrics,
  FulfillmentTime,
  WFulfillmentStatus,
  DetermineCartBasedLeadTime,
  CatalogModifierEntry,
  ProductModifierEntry,
  CatalogCategoryEntry,
  Selector,
  IOption,
  IOptionInstance,
  DISABLE_REASON,
  MetadataModifierMapEntry
} from "@wcp/wcpshared";
import { differenceInMinutes, formatISO, startOfDay } from "date-fns";

export const RootReducer = combineReducers({
  fulfillment: WFulfillmentReducer,
  customizer: WCustomizerReducer,
  ws: SocketIoReducer,
  metrics: WMetricsReducer
});

export const store = configureStore({
  reducer: RootReducer,
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware().concat([SocketIoMiddleware, ListeningMiddleware.middleware])
  },
});

export type RootState = ReturnType<typeof RootReducer>;
export type AppDispatch = typeof store.dispatch;

export const IProductInstancesSelectors = IProductInstancesAdapter.getSelectors((state: RootState) => state.ws.productInstances);
export const ProductInstanceFunctionsSelectors = ProductInstanceFunctionsAdapter.getSelectors((state: RootState) => state.ws.productInstanceFunctions);

export const SelectDisplayFlagOmitSectionIfNoAvailableOptionsFromModifierByModifierTypeId = createSelector(
  (s: RootState, mtId: string) => getModifierTypeEntryById(s.ws.modifierEntries, mtId),
  (mt) => mt.modifierType.displayFlags.omit_section_if_no_available_options
);
export const SelectDisplayFlagHiddenFromModifierByModifierTypeId = createSelector(
  (s: RootState, mtId: string) => getModifierTypeEntryById(s.ws.modifierEntries, mtId),
  (mt) => mt.modifierType.displayFlags.hidden
);

export const GetSelectableModifiers = (mMap: MetadataModifierMap, modifierTypeSelector: (id: string) => CatalogModifierEntry) =>
  Object.entries(mMap).reduce((acc, [k, v]) => {
    const modifierEntry = modifierTypeSelector(k);
    const omit_section_if_no_available_options = modifierEntry.modifierType.displayFlags.omit_section_if_no_available_options;
    const hidden = modifierEntry.modifierType.displayFlags.hidden;
    return (!hidden && (!omit_section_if_no_available_options || v.has_selectable)) ? { ...acc, k: v } : acc;
  }, {} as MetadataModifierMap);


export const SelectSelectableModifiers = createSelector(
  (s: RootState, _mMap: MetadataModifierMap) => (id: string) => getModifierTypeEntryById(s.ws.modifierEntries, id),
  (_s: RootState, mMap: MetadataModifierMap) => mMap,
  (modifierGetter, mMap) => GetSelectableModifiers(mMap, modifierGetter)
);


const SelectSomethingFromFulfillment = <T extends keyof FulfillmentConfig>(field: T) => weakMapCreateSelector(
  (s: RootState) => s.ws.fulfillments,
  (s: RootState) => s.fulfillment.selectedService,
  (fulfillments, fulfillmentId) =>
    fulfillmentId && getFulfillmentById(fulfillments, fulfillmentId) ? getFulfillmentById(fulfillments, fulfillmentId)[field] : null
);

export const SelectFulfillmentDisplayName = SelectSomethingFromFulfillment('displayName');
export const SelectMainCategoryId = SelectSomethingFromFulfillment('orderBaseCategoryId');
export const SelectSupplementalCategoryId = SelectSomethingFromFulfillment('orderSupplementaryCategoryId');
export const SelectMenuCategoryId = SelectSomethingFromFulfillment('menuBaseCategoryId');
export const SelectMaxPartySize = SelectSomethingFromFulfillment('maxGuests');
export const SelectServiceFeeSetting = SelectSomethingFromFulfillment('serviceCharge');
export const SelectAllowTipping = SelectSomethingFromFulfillment('allowTipping');
export const SelectFulfillmentMinDuration = SelectSomethingFromFulfillment('minDuration');
export const SelectFulfillmentServiceTerms = SelectSomethingFromFulfillment('terms');
export const SelectFulfillmentService = SelectSomethingFromFulfillment('service');
export const SelectFulfillmentMaxGuests = SelectSomethingFromFulfillment('maxGuests');

export const selectAllowAdvancedPrompt = createSelector(
  (s: RootState) => s.customizer.selectedProduct,
  SelectAllowAdvanced,
  (prod: WProduct | null, allowAdvanced: boolean) => allowAdvanced === true && prod !== null && prod.m.advanced_option_eligible
)


export const SelectHasOperatingHoursForService = createSelector(
  (s: RootState, fulfillmentId: string) => getFulfillmentById(s.ws.fulfillments, fulfillmentId),
  (fulfillment) => WDateUtils.HasOperatingHours(fulfillment.operatingHours)
);

export const SelectCartBasedLeadTime = createSelector(
  selectCartAsDto,
  (s: RootState) => s.ws.products,
  (cart, products) => DetermineCartBasedLeadTime(cart, (x: string) => getProductEntryById(products, x))
)

export const SelectAvailabilityForServicesDateAndProductCount = createSelector(
  (s: RootState, _: string, __: string[]) => s.ws.fulfillments,
  (s: RootState, __: string, ___: string[]) => SelectCartBasedLeadTime(s),
  (_: RootState, selectedDate: string, __: string[]) => selectedDate,
  (_: RootState, __: string, serviceSelection: string[]) => serviceSelection,
  (fulfillments, cartBasedLeadTime, selectedDate, serviceSelection) =>
    WDateUtils.GetInfoMapForAvailabilityComputation(serviceSelection.map(x => getFulfillmentById(fulfillments, x)), selectedDate, cartBasedLeadTime)
);

export const SelectOptionsForServicesAndDate = createSelector(
  (s: RootState, selectedDate: string, serviceSelection: string[]) => SelectAvailabilityForServicesDateAndProductCount(s, selectedDate, serviceSelection),
  (s: RootState, _: string, __: string[]) => s.ws.currentTime,
  (_: RootState, selectedDate: string, __: string[]) => selectedDate,
  (infoMap, currentTime, selectedDate) => WDateUtils.GetOptionsForDate(infoMap, selectedDate, formatISO(currentTime))
)

export const GetNextAvailableServiceDateTimeForService = createSelector(
  (s: RootState, service: string, _: Date | number) => getFulfillmentById(s.ws.fulfillments, service),
  (_: RootState, __: string, now: Date | number) => formatISO(now),
  (s: RootState, __: string, _: Date | number) => SelectCartBasedLeadTime(s),
  (fulfillment, now, cartBasedLeadTime) => GetNextAvailableServiceDate([fulfillment], now, cartBasedLeadTime)
);

// Note: this falls back to now if there's really nothing for the selected service or for dine-in
export const GetNextAvailableServiceDateTime = createSelector(
  (s: RootState) => (service: string) => GetNextAvailableServiceDateTimeForService(s, service, s.ws.currentTime),
  (s: RootState) => s.fulfillment.selectedService,
  (s: RootState) => s.ws.currentTime,
  SelectDefaultFulfillmentId,
  (nextAvailableForServiceFunction, selectedService, currentTime, defaultFulfillment) => {
    if (selectedService !== null) {
      const nextAvailableForSelectedService = nextAvailableForServiceFunction(selectedService);
      if (nextAvailableForSelectedService) {
        return nextAvailableForSelectedService;
      }
    }
    return (nextAvailableForServiceFunction(defaultFulfillment) ??
    {
      selectedDate: WDateUtils.formatISODate(currentTime),
      selectedTime: differenceInMinutes(currentTime, startOfDay(currentTime))
    }) as FulfillmentTime;
  });

export const SelectHasSpaceForPartyOf = createSelector(
  (_: RootState) => true,
  (hasSpace) => hasSpace
);

/**
 * Selects/Computes the product metadata for a catalog product instance using the currently populated fulfillment info
 */
export const SelectProductMetadataFromProductInstanceIdWithCurrentFulfillmentData = createSelector(
  (s: RootState, productInstanceId: string) => getProductInstanceById(s.ws.productInstances, productInstanceId),
  (s: RootState, _productInstanceId: string) => s.ws,
  (s: RootState, _productInstanceId: string) => SelectServiceDateTime(s.fulfillment)!,
  (s: RootState, _productInstanceId: string) => s.fulfillment.selectedService!,
  (productInstance, socketIoState, service_time, fulfillmentId) => SelectProductMetadata(socketIoState, productInstance.productId, productInstance.modifiers, service_time, fulfillmentId),
);

export const SelectProductInstanceHasSelectableModifiersByProductInstanceId = weakMapCreateSelector(
  (s: RootState, _productInstanceId: string) => s,
  (s: RootState, productInstanceId: string) => SelectProductMetadataFromProductInstanceIdWithCurrentFulfillmentData(s, productInstanceId),
  (s, metadata) => Object.values(SelectSelectableModifiers(s, metadata.modifier_map)).length > 0
)

export const SelectModifierTypeNameFromModifierTypeId = createSelector(
  getModifierTypeEntryById,
  (modifierTypeEntry) => modifierTypeEntry.modifierType.displayName ?? modifierTypeEntry.modifierType.name
);

export const SelectModifierTypeOrdinalFromModifierTypeId = createSelector(
  getModifierTypeEntryById,
  (modifierTypeEntry) => modifierTypeEntry.modifierType.ordinal
);

export const SelectMenuNameFromCategoryById = createSelector(
  getCategoryEntryById,
  (categoryEntry) => categoryEntry.category.description || categoryEntry.category.name
);
export const SelectMenuSubtitleFromCategoryById = createSelector(
  getCategoryEntryById,
  (categoryEntry) => categoryEntry.category.subheading || null
);
export const SelectMenuFooterFromCategoryById = createSelector(
  getCategoryEntryById,
  (categoryEntry) => categoryEntry.category.footnotes || null
);
export const SelectMenuNestingFromCategoryById = createSelector(
  getCategoryEntryById,
  (categoryEntry) => categoryEntry.category.display_flags.nesting
);

export const SelectCategoryExistsAndIsAllowedForFulfillment = createSelector(
  (state: EntityState<CatalogCategoryEntry, string>, categoryId: string, _fulfillmentId: string) => getCategoryEntryById(state, categoryId),
  (_state: EntityState<CatalogCategoryEntry, string>, _categoryId: string, fulfillmentId: string) => fulfillmentId,
  (categoryEntry, fulfillmentId) => categoryEntry && categoryEntry.category.serviceDisable.indexOf(fulfillmentId) === -1
);

/**
* Selects/Computes the product metadata for a potentially custom product (product class ID and selected modifiers) using the currently populated fulfillment info
*/
export const SelectProductMetadataFromCustomProductWithCurrentFulfillmentData = weakMapCreateSelector(
  (_s: RootState, productId: string, _modifiers: ProductModifierEntry[]) => productId,
  (_s: RootState, _productId: string, modifiers: ProductModifierEntry[]) => modifiers,
  (s: RootState, _productInstanceId: string, _modifiers: ProductModifierEntry[]) => s.ws,
  (s: RootState, _productInstanceId: string) => SelectServiceDateTime(s.fulfillment)!,
  (s: RootState, _productInstanceId: string) => s.fulfillment.selectedService!,
  (productId, modifiers, socketIoState, service_time, fulfillmentId) => SelectProductMetadata(socketIoState, productId, modifiers, service_time, fulfillmentId),
);  

/** move this to WCPShared */
export const FilterUnselectableModifierOption = (mmEntry: MetadataModifierMapEntry, moid: string) => {
  const optionMapEntry = mmEntry.options[moid];
  return optionMapEntry.enable_left.enable === DISABLE_REASON.ENABLED || optionMapEntry.enable_right.enable === DISABLE_REASON.ENABLED || optionMapEntry.enable_whole.enable === DISABLE_REASON.ENABLED;
}

export const SortProductModifierEntries = (mods: ProductModifierEntry[], modifierTypeSelector: Selector<CatalogModifierEntry>) =>
  mods.sort((a, b) => modifierTypeSelector(a.modifierTypeId)!.modifierType.ordinal - modifierTypeSelector(b.modifierTypeId)!.modifierType.ordinal)

export const SortProductModifierOptions = (mods: IOptionInstance[], modifierOptionSelector: Selector<IOption>) =>
  mods.sort((a, b) => modifierOptionSelector(a.optionId)!.ordinal - modifierOptionSelector(b.optionId)!.ordinal)

export const SelectShouldFilterModifierTypeDisplay = weakMapCreateSelector(
  (s: RootState, modifierTypeId: string, _hasSelectable: boolean) => getModifierTypeEntryById(s.ws.modifierEntries, modifierTypeId),
  (_s: RootState, _modifierTypeId: string, hasSelectable: boolean) => hasSelectable,
  // cases to not show:
  // modifier.display_flags.omit_section_if_no_available_options && (has selected item, all other options cannot be selected, currently selected items cannot be deselected)
  // modifier.display_flags.hidden is true
  (modifierTypeEntry, hasSelectable) => !modifierTypeEntry.modifierType.displayFlags.hidden && (!modifierTypeEntry.modifierType.displayFlags.omit_section_if_no_available_options || hasSelectable)
)