import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { type FulfillmentDto, type NullablePartial, WDateUtils } from "@wcp/wario-shared";

export type WFulfillmentState = NullablePartial<Pick<FulfillmentDto, 'selectedService' | 'selectedDate' | 'selectedTime'>>;

const initialState: WFulfillmentState = {
  selectedService: null,
  selectedDate: null,
  selectedTime: null,

}

const WFulfillmentSlice = createSlice({
  name: 'fulfillment',
  initialState: initialState,
  reducers: {
    setService(state, action: PayloadAction<string>) {
      if (state.selectedService !== action.payload) {
        state.selectedService = action.payload;
      }
    },
    setDate(state, action: PayloadAction<string | null>) {
      state.selectedDate = action.payload;
    },
    setTime(state, action: PayloadAction<number | null>) {
      state.selectedTime = action.payload;
    }
  }
});

export const SelectServiceDateTime = createSelector(
  (s: WFulfillmentState) => s.selectedDate,
  (s: WFulfillmentState) => s.selectedTime,
  (selectedDate: string | null, selectedTime: number | null) => selectedDate !== null && selectedTime !== null ? WDateUtils.ComputeServiceDateTime({ selectedDate, selectedTime }) : null
);

export const { setService, setDate, setTime } = WFulfillmentSlice.actions;


export default WFulfillmentSlice.reducer;
