import { combineReducers, configureStore, createSelector } from "@reduxjs/toolkit";
import { formatISO } from "date-fns";

import {
  type FulfillmentConfig,
  GetNextAvailableServiceDate,
  WDateUtils
} from "@wcp/wario-shared";
import {
  getCategoryEntryById,
  getFulfillmentById,
  getModifierTypeEntryById,
  IProductInstancesAdapter,
  ProductInstanceFunctionsAdapter,
  SelectDefaultFulfillmentId,
  SocketIoReducer,
  weakMapCreateSelector,
} from '@wcp/wario-ux-shared';

import { SocketIoMiddleware } from "./slices/SocketIoMiddleware";
import WFulfillmentReducer from './slices/WFulfillmentSlice';

export const RootReducer = combineReducers({
  fulfillment: WFulfillmentReducer,
  ws: SocketIoReducer,
});

export const store = configureStore({
  reducer: RootReducer,
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware().concat([SocketIoMiddleware])
  },
});

export type RootState = ReturnType<typeof RootReducer>;
export type AppDispatch = typeof store.dispatch;

export const IProductInstancesSelectors = IProductInstancesAdapter.getSelectors((state: RootState) => state.ws.productInstances);
export const ProductInstanceFunctionsSelectors = ProductInstanceFunctionsAdapter.getSelectors((state: RootState) => state.ws.productInstanceFunctions);

const SelectSomethingFromFulfillment = <T extends keyof FulfillmentConfig>(field: T) => weakMapCreateSelector(
  (s: RootState) => s.ws.fulfillments,
  (s: RootState) => s.fulfillment.selectedService,
  (fulfillments, fulfillmentId) =>
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

export const GetNextAvailableServiceDateTimeForService = createSelector(
  (s: RootState, service: string, _: Date | number) => getFulfillmentById(s.ws.fulfillments, service),
  (_: RootState, __: string, now: Date | number) => formatISO(now),
  (fulfillment, now) => GetNextAvailableServiceDate([fulfillment], now, 0)
);

const SelectSelectedServiceFulfillment = createSelector(
  (s: RootState) => s.fulfillment.selectedService,
  (s: RootState) => s.ws.fulfillments,
  SelectDefaultFulfillmentId,
  (selectedService, fulfillments, defaultFulfillment) => {
    const fulfillmentId = selectedService ?? defaultFulfillment;
    return fulfillmentId ? getFulfillmentById(fulfillments, fulfillmentId) : null;
  }
);

/**
 * If we don't have a selected service or if we're open now, return the current time
 * Otherwise, return the next available service date
 */
export const GetNextAvailableServiceDateTimeForMenu = createSelector(
  (s: RootState) => SelectSelectedServiceFulfillment(s),
  (s: RootState) => s.ws.currentTime,
  (selectedServiceFulfillment, currentTime) => {
    if (selectedServiceFulfillment === null || WDateUtils.AreWeOpenNow([selectedServiceFulfillment], currentTime)) {
      return WDateUtils.ComputeFulfillmentTime(currentTime);
    }

    const nextAvailableServiceDate = GetNextAvailableServiceDate([selectedServiceFulfillment], formatISO(currentTime), 0);
    if (nextAvailableServiceDate) {
      return nextAvailableServiceDate;
    }
    console.warn("There should be a service date available, falling back to now. Likely a config or programming error.")
    return WDateUtils.ComputeFulfillmentTime(currentTime);
  });



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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return (nextAvailableForServiceFunction(defaultFulfillment!) ??
      WDateUtils.ComputeFulfillmentTime(currentTime));
  });


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


export const SelectShouldFilterModifierTypeDisplay = weakMapCreateSelector(
  (s: RootState, modifierTypeId: string, _hasSelectable: boolean) => getModifierTypeEntryById(s.ws.modifierEntries, modifierTypeId),
  (_s: RootState, _modifierTypeId: string, hasSelectable: boolean) => hasSelectable,
  // cases to not show:
  // modifier.display_flags.omit_section_if_no_available_options && (has selected item, all other options cannot be selected, currently selected items cannot be deselected)
  // modifier.display_flags.hidden is true
  (modifierTypeEntry, hasSelectable) => !modifierTypeEntry.modifierType.displayFlags.hidden && (!modifierTypeEntry.modifierType.displayFlags.omit_section_if_no_available_options || hasSelectable)
)