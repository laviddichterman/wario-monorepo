import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { z } from "zod";
import { type DeliveryInfoDto, type DineInInfoDto, type FulfillmentDto, type NullablePartial, WDateUtils } from "@wcp/wario-shared";
import { CreateValidateDeliveryAddressThunk } from "@wcp/wario-ux-shared";
import axiosInstance from "../../utils/axios";

export const deliveryAddressSchema = z.object({
  address: z.string().min(1, "Please enter your street address"),
  address2: z.string(),
  zipcode: z.string()
    .regex(/^[0-9]+$/, "Please enter a 5 digit zipcode")
    .length(5, "Please enter a 5 digit zipcode"),
  deliveryInstructions: z.string(),
  fulfillmentId: z.string()
});

export const dineInSchema = z.object({
  partySize: z.coerce.number()
    .refine((n) => !Number.isNaN(n), { message: "Please specify the size of your party." })
    .int()
    .min(1, "Please specify the size of your party.")
});

export type DeliveryInfoFormData = Omit<DeliveryInfoDto, "validation"> & { fulfillmentId: string; };

export type WFulfillmentState = {
  hasSelectedTimeExpired: boolean;
  hasSelectedDateExpired: boolean;
  hasAgreedToTerms: boolean;
  deliveryValidationStatus: 'IDLE' | 'PENDING' | 'VALID' | 'INVALID' | 'OUTSIDE_RANGE';
} & NullablePartial<Omit<FulfillmentDto, 'status' | 'thirdPartyInfo'>>;


export const validateDeliveryAddress = CreateValidateDeliveryAddressThunk(axiosInstance);

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
  },
  extraReducers: (builder) => {
    // Add reducers for additional action types here, and handle loading state as needed
    builder
      .addCase(validateDeliveryAddress.fulfilled, (state, action) => {
        state.deliveryInfo!.validation = action.payload;
        state.deliveryValidationStatus = action.payload.in_area ? 'VALID' : 'OUTSIDE_RANGE';
      })
      .addCase(validateDeliveryAddress.pending, (state, action) => {
        state.deliveryInfo = {
          address: action.meta.arg.address,
          address2: action.meta.arg.address2,
          zipcode: action.meta.arg.zipcode,
          deliveryInstructions: action.meta.arg.deliveryInstructions,
          validation: null
        }
        state.deliveryValidationStatus = 'PENDING';
      })
      .addCase(validateDeliveryAddress.rejected, (state) => {
        state.deliveryValidationStatus = 'INVALID';
      })
  },
});

export const SelectServiceDateTime = createSelector(
  (s: WFulfillmentState) => s.selectedDate,
  (s: WFulfillmentState) => s.selectedTime,
  (selectedDate: string | null, selectedTime: number | null) => selectedDate !== null && selectedTime !== null ? WDateUtils.ComputeServiceDateTime({ selectedDate, selectedTime }) : null
);

export const { setService, setDate, setTime, setDineInInfo, setDeliveryInfo, setHasAgreedToTerms, setSelectedDateExpired, setSelectedTimeExpired } = WFulfillmentSlice.actions;


export default WFulfillmentSlice.reducer;
