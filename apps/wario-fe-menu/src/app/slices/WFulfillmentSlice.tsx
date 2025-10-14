import { createAsyncThunk, createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as yup from "yup";
import { DeliveryAddressValidateRequest, DeliveryAddressValidateResponse, DeliveryInfoDto, DineInInfoDto, FulfillmentDto, NullablePartial, WDateUtils } from "@wcp/wcpshared";
import axiosInstance from "../../utils/axios";

export const deliveryAddressSchema = yup.object().shape({
  address: yup.string().ensure().required("Please enter your street address"),
  address2: yup.string().ensure().notRequired(),
  zipcode: yup.string().ensure().required()
    .matches(/^[0-9]+$/, "Please enter a 5 digit zipcode")
    .min(5, "Please enter a 5 digit zipcode")
    .max(5, "Please enter a 5 digit zipcode"),
  //deliveryInstructions: yup.string().ensure().notRequired()
});

export const dineInSchema = yup.object().shape({
  partySize: yup.number().integer().min(1).required("Please specify the size of your party.")
});

// export const fulfillmentSchemaInstance = (fulfillments: Record<string, FulfillmentConfig>) =>
//   yup.object().shape({
//     serviceNum: yup.string().ensure().required("Please select a service."),
//     serviceDate: yup.date().required("Please select a service date."),
//     serviceTime: yup.number().integer().min(0).max(1439).required(),
//     hasAgreedToTerms: yup.bool().when('serviceNum', (serviceNum, s) => {
//       return serviceNum && 
//         Object.hasOwn(fulfillments, serviceNum) && 
//         fulfillments[serviceNum].terms.length > 0 ?
//         s.test('hasAgreedToTerms', "Please accept the terms of service.", (v: boolean | undefined) => v === true) :
//         s
//     })
//   });

export type DeliveryInfoFormData = Omit<DeliveryInfoDto, "validation"> & { fulfillmentId: string; };

export type WFulfillmentState = {
  hasSelectedTimeExpired: boolean;
  hasSelectedDateExpired: boolean;
  hasAgreedToTerms: boolean;
  deliveryValidationStatus: 'IDLE' | 'PENDING' | 'VALID' | 'INVALID' | 'OUTSIDE_RANGE';
} & NullablePartial<Omit<FulfillmentDto, 'status' | 'thirdPartyInfo'>>;

export const validateDeliveryAddress = createAsyncThunk<DeliveryAddressValidateResponse, DeliveryInfoFormData>(
  'addressRequest/validate',
  async (req) => {
    const request: DeliveryAddressValidateRequest = {
      fulfillmentId: req.fulfillmentId,
      address: req.address,
      city: "Seattle",
      state: "WA",
      zipcode: req.zipcode
    };
    const response = await axiosInstance.get('/api/v1/addresses', {
      params: request,
    });
    return response.data;
  }
);

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
  (selectedDate: string | null, selectedTime: number | null) => selectedDate !== null && selectedTime !== null ? WDateUtils.ComputeServiceDateTime({selectedDate, selectedTime}) : null
);

export const { setService, setDate, setTime, setDineInInfo, setDeliveryInfo, setHasAgreedToTerms, setSelectedDateExpired, setSelectedTimeExpired } = WFulfillmentSlice.actions;


export default WFulfillmentSlice.reducer;
