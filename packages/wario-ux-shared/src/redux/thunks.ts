import { createAsyncThunk } from "@reduxjs/toolkit";
import type { ValidateAndLockCreditResponse } from "@wcp/wario-shared";
import type { AxiosInstance } from "axios";

export const CreateValidateStoreCreditThunk =
  (axiosInstance: AxiosInstance) =>
    createAsyncThunk<ValidateAndLockCreditResponse, string>(
      'credit/validate',
      async (code) => {
        const response = await axiosInstance.get('/api/v1/payments/storecredit/validate', {
          params: { code },
        });
        return response.data;
      }
    );