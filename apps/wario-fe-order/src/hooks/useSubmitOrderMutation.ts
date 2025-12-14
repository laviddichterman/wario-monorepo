import { useMutation } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';

import type {
  CreateOrderRequestV2,
  CrudOrderResponse,
  ResponseFailure,
  ResponseSuccess,
  WOrderInstance,
} from '@wcp/wario-shared/types';
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
 * Mutation hook for submitting orders to WARIO
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
  return useMutation<
    ResponseSuccess<WOrderInstance>,
    SubmitOrderError,
    CreateOrderRequestV2,
    SubmitOrderMutationContext
  >({
    mutationKey: ['order', 'submit'],
    mutationFn: async (request: CreateOrderRequestV2) => {
      try {
        const result: AxiosResponse<CrudOrderResponse> = await axiosInstance.post('/api/v1/order', request);

        if (!result.data.success) {
          const errorMessages = result.data.error.map((e) => e.detail);
          const submitError: SubmitOrderError = {
            errors: errorMessages,
            originalError: new Error('Server returned failure response'),
          };
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw submitError;
        }

        return result.data;
      } catch (err: unknown) {
        console.log(err);
        const errorMessages: string[] = [];

        // If we already threw a SubmitOrderError (from the success check above), rethrow it
        if (err && typeof err === 'object' && 'errors' in err && 'originalError' in err) {
          throw err;
        }

        handleAxiosError<ResponseFailure, undefined>(
          err,
          () => {
            errorMessages.push('An unexpected error occurred');
            return undefined;
          },
          (error) => {
            errorMessages.push(...error.error.map((x: { detail: string }) => x.detail));
            return undefined;
          },
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
  });
}
