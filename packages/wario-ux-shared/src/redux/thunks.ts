import { createAsyncThunk } from "@reduxjs/toolkit";
import { type AxiosInstance, type AxiosResponse } from "axios";

import { type DeliveryAddressValidateRequest, type DeliveryAddressValidateResponse, type DeliveryInfoDto, type ValidateAndLockCreditResponse } from "@wcp/wario-shared";

import { handleAxiosError } from "@/common/axios";

export const CreateValidateStoreCreditThunk =
  (axiosInstance: AxiosInstance) =>
    createAsyncThunk<ValidateAndLockCreditResponse, string>(
      'credit/validate',
      async (code, api) => {
        try {
          const response: AxiosResponse<ValidateAndLockCreditResponse> = await axiosInstance.get('/api/v1/payments/storecredit/validate', {
            params: { code },
          });
          return api.fulfillWithValue(response.data);
        } catch (error) {
          return handleAxiosError(error, (err) => { return api.rejectWithValue(err); });
        }
      }
    );


export type DeliveryInfoFormData = Omit<DeliveryInfoDto, "validation"> & { fulfillmentId: string; };

export const CreateValidateDeliveryAddressThunk =
  (axiosInstance: AxiosInstance) => createAsyncThunk<DeliveryAddressValidateResponse, DeliveryInfoFormData>(
    'addressRequest/validate',
    async (req, api) => {
      try {
        const request: DeliveryAddressValidateRequest = {
          fulfillmentId: req.fulfillmentId,
          address: req.address,
          city: "Seattle",
          state: "WA",
          zipcode: req.zipcode
        };
        const response: AxiosResponse<DeliveryAddressValidateResponse> = await axiosInstance.get('/api/v1/addresses', {
          params: request,
        });
        return api.fulfillWithValue(response.data);
      } catch (error) {
        return handleAxiosError(error, (err) => { return api.rejectWithValue(err); });
      }
    }
  );