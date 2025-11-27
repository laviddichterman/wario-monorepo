import { createSelector } from "@reduxjs/toolkit";

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { type CoreCartEntry, GroupAndOrderCart, type WProduct } from "@wcp/wario-shared";

import { AdapterCurrentTimeOverrideUtils } from "@/common/DateFnsAdapter";
import { getCategoryEntryById, type SocketIoState } from "@/redux/SocketIoSlice";


export const selectGroupedAndOrderedCart = <T extends CoreCartEntry<WProduct>>(s: { ws: SocketIoState }, cart: T[]) => {
  return GroupAndOrderCart(cart, (id) => getCategoryEntryById(s.ws.categories, id));
}

export const SelectSquareAppId = (s: { ws: SocketIoState }) => s.ws.settings?.config.SQUARE_APPLICATION_ID as string || "";
export const SelectSquareLocationId = (s: { ws: SocketIoState }) => s.ws.settings?.config.SQUARE_LOCATION as string || "";
export const SelectDefaultFulfillmentId = (s: { ws: SocketIoState }) => s.ws.settings?.config.DEFAULT_FULFILLMENTID as string || null;
export const SelectAllowAdvanced = (s: { ws: SocketIoState }) => s.ws.settings?.config.ALLOW_ADVANCED as boolean || false;
export const SelectGratuityServiceCharge = (s: { ws: SocketIoState }) => s.ws.settings?.config.SERVICE_CHARGE as number || 0;
export const SelectDeliveryAreaLink = (s: { ws: SocketIoState }) => s.ws.settings?.config.DELIVERY_LINK as string || "";
export const SelectTipPreamble = (s: { ws: SocketIoState }) => s.ws.settings?.config.TIP_PREAMBLE as string || "";
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const SelectTaxRate = (s: { ws: SocketIoState }) => s.ws.settings!.config.TAX_RATE as number;
export const SelectAutoGratutityThreshold = (s: { ws: SocketIoState }) => s.ws.settings?.config.AUTOGRAT_THRESHOLD as number || 5;
export const SelectMessageRequestVegan = (s: { ws: SocketIoState }) => s.ws.settings?.config.MESSAGE_REQUEST_VEGAN as string || "";
export const SelectMessageRequestHalf = (s: { ws: SocketIoState }) => s.ws.settings?.config.MESSAGE_REQUEST_HALF as string || "";
export const SelectMessageRequestWellDone = (s: { ws: SocketIoState }) => s.ws.settings?.config.MESSAGE_REQUEST_WELLDONE as string || "";
export const SelectMessageRequestSlicing = (s: { ws: SocketIoState }) => s.ws.settings?.config.MESSAGE_REQUEST_SLICING as string || "";

export const SelectDateFnsAdapter = createSelector(
  (s: { ws: { currentTime: number } }) => s.ws.currentTime,
  (currentTime) => currentTime !== 0 ? AdapterCurrentTimeOverrideUtils(currentTime) : AdapterDateFns);
