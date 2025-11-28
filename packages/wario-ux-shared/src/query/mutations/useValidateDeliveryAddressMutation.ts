import { useMutation } from '@tanstack/react-query';
import type { AxiosInstance, AxiosResponse } from 'axios';

import type {
  DeliveryAddressValidateRequest,
  DeliveryAddressValidateResponse,
  DeliveryInfo,
} from '@wcp/wario-shared';

import { handleAxiosError } from '@/common/axios';

export type DeliveryInfoFormData = Omit<DeliveryInfo, 'validation'> & { fulfillmentId: string };

export interface ValidateDeliveryAddressMutationOptions {
  axiosInstance: AxiosInstance;
}

/**
 * Creates a mutation hook for validating delivery addresses
 * 
 * @example
 * ```tsx
 * const validateAddress = useValidateDeliveryAddressMutation({ axiosInstance });
 * 
 * const handleValidate = () => {
 *   validateAddress.mutate(formData, {
 *     onSuccess: (data) => {
 *       if (data.in_area) {
 *         // Address is valid and in delivery range
 *       }
 *     }
 *   });
 * };
 * ```
 */
export function useValidateDeliveryAddressMutation({
  axiosInstance,
}: ValidateDeliveryAddressMutationOptions) {
  return useMutation<DeliveryAddressValidateResponse, Error, DeliveryInfoFormData>({
    mutationKey: ['deliveryAddress', 'validate'],
    mutationFn: async (formData: DeliveryInfoFormData) => {
      try {
        const request: DeliveryAddressValidateRequest = {
          fulfillmentId: formData.fulfillmentId,
          address: formData.address,
          city: 'Seattle',
          state: 'WA',
          zipcode: formData.zipcode,
        };

        const response: AxiosResponse<DeliveryAddressValidateResponse> = await axiosInstance.get(
          '/api/v1/addresses',
          { params: request }
        );
        return response.data;
      } catch (error) {
        throw handleAxiosError(error, (err) => new Error(JSON.stringify(err)));
      }
    },
  });
}
