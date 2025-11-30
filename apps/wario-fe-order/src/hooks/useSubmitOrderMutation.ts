import { useMutation } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';

import type { CreateOrderRequestV2, CrudOrderResponse, ResponseFailure } from '@wcp/wario-shared';
import { handleAxiosError, scrollToIdOffsetAfterDelay } from '@wcp/wario-ux-shared/common';

import axiosInstance from '@/utils/axios';

export interface SubmitOrderMutationContext {
  submitTime: number;
}

export interface SubmitOrderError {
  errors: string[];
  originalError: Error;
}

/**
 * Mutation hook for submitting orders to Wario
 * 
 * @example
 * ```tsx
 * const submitOrder = useSubmitOrderMutation();
 * 
 * const handleSubmit = (request: CreateOrderRequestV2) => {
 *   submitOrder.mutate(request, {
 *     onSuccess: (data) => {
 *       // Order submitted successfully
 *     },
 *     onError: (error) => {
 *       // Handle error - error.errors contains the error messages
 *     }
 *   });
 * };
 * 
 * // Access mutation state
 * if (submitOrder.isPending) { ... }
 * if (submitOrder.isSuccess) { ... }
 * if (submitOrder.isError) { ... }
 * ```
 */
export function useSubmitOrderMutation() {
  return useMutation<CrudOrderResponse, SubmitOrderError, CreateOrderRequestV2, SubmitOrderMutationContext>(
    {
      mutationKey: ['order', 'submit'],
      mutationFn: async (request: CreateOrderRequestV2) => {
        try {
          const result: AxiosResponse<CrudOrderResponse> = await axiosInstance.post(
            '/api/v1/order',
            request
          );
          return result.data;
        } catch (err: unknown) {
          console.log(err);
          const errorMessages: string[] = [];

          handleAxiosError<ResponseFailure, undefined>(
            err,
            () => {
              errorMessages.push('An unexpected error occurred');
              return undefined;
            },
            (error) => {
              errorMessages.push(...error.error.map((x: { detail: string }) => x.detail));
              return undefined;
            }
          );

          const submitError: SubmitOrderError = {
            errors: errorMessages.length > 0 ? errorMessages : ['An unexpected error occurred'],
            originalError: err instanceof Error ? err : new Error(String(err)),
          };

          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw submitError;
        }
      },
      onSuccess: () => {
        // Scroll to order section after successful submission
        scrollToIdOffsetAfterDelay('WARIO_order', 500);
      },
    }
  );
}

