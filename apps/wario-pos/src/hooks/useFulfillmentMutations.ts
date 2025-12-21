import { useMutation } from '@tanstack/react-query';

import { AuthScopes } from '@wcp/wario-shared-private';
import type { FulfillmentConfig } from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';

import { type FulfillmentFormState, toFulfillmentApiBody } from '@/atoms/forms/fulfillmentFormAtoms';

import { useGetAuthToken } from './useGetAuthToken';

// ============================================================================
// Types
// ============================================================================

interface EditFulfillmentRequest {
  id: string;
  form: FulfillmentFormState;
  dirtyFields?: Set<keyof FulfillmentFormState>;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Mutation hook for adding a fulfillment
 */
export function useAddFulfillmentMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (form: FulfillmentFormState) => {
      const token = await getToken(AuthScopes.WRITE_CONFIG);
      const body = toFulfillmentApiBody(form);

      const response = await axiosInstance.post<FulfillmentConfig>('/api/v1/config/fulfillment/', body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    },
  });
}

/**
 * Mutation hook for editing a fulfillment.
 * If dirtyFields is provided, only the modified fields are sent (partial update).
 */
export function useEditFulfillmentMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ id, form, dirtyFields }: EditFulfillmentRequest) => {
      const token = await getToken(AuthScopes.WRITE_CONFIG);
      // Only send dirty fields for PATCH/update
      const body = dirtyFields ? toFulfillmentApiBody(form, dirtyFields) : toFulfillmentApiBody(form);

      const response = await axiosInstance.patch<FulfillmentConfig>(`/api/v1/config/fulfillment/${id}`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    },
  });
}

/**
 * Mutation hook for deleting a fulfillment
 */
export function useDeleteFulfillmentMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken(AuthScopes.DELETE_CONFIG);

      const response = await axiosInstance.delete<FulfillmentConfig>(`/api/v1/config/fulfillment/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    },
  });
}
