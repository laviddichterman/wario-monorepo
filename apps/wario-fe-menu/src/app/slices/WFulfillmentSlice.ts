import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { type DeliveryInfoDto, type DineInInfoDto, type FulfillmentDto, type NullablePartial, WDateUtils } from "@wcp/wario-shared";

export type DeliveryInfoFormData = Omit<DeliveryInfoDto, "validation"> & { fulfillmentId: string; };

export type WFulfillmentState = {
  hasSelectedTimeExpired: boolean;
  hasSelectedDateExpired: boolean;
  hasAgreedToTerms: boolean;
  deliveryValidationStatus: 'IDLE' | 'PENDING' | 'VALID' | 'INVALID' | 'OUTSIDE_RANGE';
} & NullablePartial<Omit<FulfillmentDto, 'status' | 'thirdPartyInfo'>>;

const initialState: WFulfillmentState = {
  hasSelectedTimeExpired: false,
  hasSelectedDateExpired: false,
  selectedService: null,
  selectedDate: null,
  selectedTime: null,
  dineInInfo: null,
  deliveryInfo: null,
  hasAgreedToTerms: false,
  deliveryValidationStatus: 'IDLE'
}

const WFulfillmentSlice = createSlice({
  name: 'fulfillment',
  initialState: initialState,
  reducers: {
    setService(state, action: PayloadAction<string>) {
      if (state.selectedService !== action.payload) {
        state.hasSelectedDateExpired = false;
        state.hasSelectedTimeExpired = false;
        state.hasAgreedToTerms = false;
        state.deliveryInfo = null;
        state.dineInInfo = null;
        state.selectedService = action.payload;
      }
    },
    setDate(state, action: PayloadAction<string | null>) {
      state.selectedDate = action.payload;
      state.hasSelectedDateExpired = state.hasSelectedDateExpired && action.payload === null;
    },
    setTime(state, action: PayloadAction<number | null>) {
      state.selectedTime = action.payload;
      state.hasSelectedTimeExpired = state.hasSelectedTimeExpired && action.payload === null;
    },
    setHasAgreedToTerms(state, action: PayloadAction<boolean>) {
      state.hasAgreedToTerms = action.payload;
    },
    setDineInInfo(state, action: PayloadAction<DineInInfoDto | null>) {
      state.dineInInfo = action.payload;
    },
    setDeliveryInfo(state, action: PayloadAction<DeliveryInfoDto | null>) {
      state.deliveryInfo = action.payload;
    },
    setSelectedDateExpired(state) {
      state.hasSelectedDateExpired = true;
    },
    setSelectedTimeExpired(state) {
      state.hasSelectedTimeExpired = true;
    },
  }
});

export const SelectServiceDateTime = createSelector(
  (s: WFulfillmentState) => s.selectedDate,
  (s: WFulfillmentState) => s.selectedTime,
  (selectedDate: string | null, selectedTime: number | null) => selectedDate !== null && selectedTime !== null ? WDateUtils.ComputeServiceDateTime({ selectedDate, selectedTime }) : null
);

export const { setService, setDate, setTime, setDineInInfo, setDeliveryInfo, setHasAgreedToTerms, setSelectedDateExpired, setSelectedTimeExpired } = WFulfillmentSlice.actions;


export default WFulfillmentSlice.reducer;
