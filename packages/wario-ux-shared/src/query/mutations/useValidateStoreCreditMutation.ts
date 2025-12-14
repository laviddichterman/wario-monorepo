import { useMutation } from '@tanstack/react-query';
import type { AxiosInstance, AxiosResponse } from 'axios';

import type { ValidateAndLockCreditResponse } from '@wcp/wario-shared/types';

import { handleAxiosError } from '@/common/axios';

export interface ValidateStoreCreditMutationOptions {
  axiosInstance: AxiosInstance;
}

/**
 * Creates a mutation hook for validating store credit codes
 *
 * @example
 * ```tsx
 * const validateCredit = useValidateStoreCreditMutation({ axiosInstance });
 *
 * const handleValidate = () => {
 *   validateCredit.mutate(creditCode, {
 *     onSuccess: (data) => {
 *       if (data.valid) {
 *         // Handle valid credit
 *       }
 *     }
 *   });
 * };
 * ```
 */
export function useValidateStoreCreditMutation({ axiosInstance }: ValidateStoreCreditMutationOptions) {
  return useMutation<ValidateAndLockCreditResponse, Error, string>({
    mutationKey: ['storeCredit', 'validate'],
    mutationFn: async (code: string) => {
      try {
        const response: AxiosResponse<ValidateAndLockCreditResponse> = await axiosInstance.get(
          '/api/v1/payments/storecredit/validate',
          { params: { code } },
        );
        return response.data;
      } catch (error) {
        // Re-throw for TanStack Query to handle
        throw handleAxiosError(error, (err) => new Error(JSON.stringify(err)));
      }
    },
  });
}
