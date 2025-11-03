import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { type FulfillmentDto, type NullablePartial } from "@wcp/wario-shared";

export type WFulfillmentState = NullablePartial<Pick<FulfillmentDto, 'selectedService'>>;

const initialState: WFulfillmentState = {
  selectedService: null,

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
  }
});

export const { setService } = WFulfillmentSlice.actions;


export default WFulfillmentSlice.reducer;
