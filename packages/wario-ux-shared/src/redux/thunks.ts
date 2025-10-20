import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosInstance } from "axios";

import type { DeliveryAddressValidateRequest, DeliveryAddressValidateResponse, DeliveryInfoDto, ValidateAndLockCreditResponse } from "@wcp/wario-shared";

export const CreateValidateStoreCreditThunk =
  (axiosInstance: AxiosInstance) =>
    createAsyncThunk<ValidateAndLockCreditResponse, string>(
      'credit/validate',
      async (code) => {
        const response = await axiosInstance.get('/api/v1/payments/storecredit/validate', {
          params: { code },
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return response.data;
      }
    );


export type DeliveryInfoFormData = Omit<DeliveryInfoDto, "validation"> & { fulfillmentId: string; };

export const CreateValidateDeliveryAddressThunk =
  (axiosInstance: AxiosInstance) => createAsyncThunk<DeliveryAddressValidateResponse, DeliveryInfoFormData>(
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data;
    }
  );