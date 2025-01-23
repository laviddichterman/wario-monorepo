import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { createSelector } from "@reduxjs/toolkit";
import { CoreCartEntry, WProduct } from "@wcp/wcpshared";
import { AdapterCurrentTimeOverrideUtils } from "../common/DateFnsAdapter";
import { getCategoryEntryById, SocketIoState } from "./SocketIoSlice";

export const selectGroupedAndOrderedCart = <RootState extends { ws: SocketIoState }, T extends CoreCartEntry<WProduct>>(s: RootState, cart: T[]) => {
  return Object.entries(cart.reduce((cartMap: Record<string, T[]>, entry: T) =>
    Object.hasOwn(cartMap, entry.categoryId) ?
      { ...cartMap, [entry.categoryId]: [...cartMap[entry.categoryId], entry] } :
      { ...cartMap, [entry.categoryId]: [entry] },
    {})).sort(([keyA, _], [keyB, __]) => getCategoryEntryById(s.ws.categories, keyA)!.category.ordinal - getCategoryEntryById(s.ws.categories, keyB)!.category.ordinal);
}

// export const SelectSquareAppId = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings?.SQUARE_APPLICATION_ID as string ?? "";
// export const SelectStoreName = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings?.STORE_NAME as string ?? "";
// export const SelectStoreEmail = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings?.EMAIL_ADDRESS as string ?? "";
// export const SelectStorePhoneNumber = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings?.STORE_PHONE_NUMBER as string ?? "";
// export const SelectSquareLocationId = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings?.SQUARE_LOCATION as string ?? "";
// export const SelectDefaultFulfillmentId = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings?.DEFAULT_FULFILLMENTID as string ?? null;
// export const SelectAllowTipping = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings?.ALLOW_TIPPING as boolean ?? true;
// export const SelectAllowAdvanced = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings?.ALLOW_ADVANCED as boolean ?? false;
// export const SelectDeliveryAreaLink = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.DELIVERY_LINK as string;
// export const SelectTipPreamble = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.TIP_PREAMBLE as string ?? "";
// export const SelectTaxRate = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.TAX_RATE as number;
// export const SelectAutoGratutityThreshold = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.AUTOGRAT_THRESHOLD as number ?? 5;
// export const SelectMessageRequestVegan = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.SPECIAL_REQUEST_MESSAGES.VEGAN as string ?? "";
// export const SelectMessageRequestHalf = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.SPECIAL_REQUEST_MESSAGES.HALF as string ?? "";
// export const SelectMessageRequestWellDone = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.SPECIAL_REQUEST_MESSAGES.WELLDONE as string ?? "";
// export const SelectMessageRequestSlicing = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.SPECIAL_REQUEST_MESSAGES.SLICING as string ?? "";

export const SelectSquareAppId = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings?.config.SQUARE_APPLICATION_ID as string ?? "";
export const SelectSquareLocationId = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings?.config.SQUARE_LOCATION as string ?? "";
export const SelectDefaultFulfillmentId = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings?.config.DEFAULT_FULFILLMENTID as string ?? null;
export const SelectAllowAdvanced = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings?.config.ALLOW_ADVANCED as boolean ?? false;
export const SelectGratuityServiceCharge = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings?.config.SERVICE_CHARGE as number ?? 0;
export const SelectDeliveryAreaLink = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.config.DELIVERY_LINK as string;
export const SelectTipPreamble = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.config.TIP_PREAMBLE as string ?? "";
export const SelectTaxRate = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.config.TAX_RATE as number;
export const SelectAutoGratutityThreshold = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.config.AUTOGRAT_THRESHOLD as number ?? 5;
export const SelectMessageRequestVegan = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.config.MESSAGE_REQUEST_VEGAN as string ?? "";
export const SelectMessageRequestHalf = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.config.MESSAGE_REQUEST_HALF as string ?? "";
export const SelectMessageRequestWellDone = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.config.MESSAGE_REQUEST_WELLDONE as string ?? "";
export const SelectMessageRequestSlicing = <RootState extends { ws: SocketIoState }>(s: RootState) => s.ws.settings!.config.MESSAGE_REQUEST_SLICING as string ?? "";

export const SelectDateFnsAdapter = createSelector(
  (s: any) => s.ws.currentTime,
  (currentTime) => currentTime !== 0 ? AdapterCurrentTimeOverrideUtils(currentTime) : AdapterDateFns);