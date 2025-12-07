import { useAuth0 } from '@auth0/auth0-react';
import { useMutation } from '@tanstack/react-query';

import type { IProductInstance, UncommittedIProductInstance } from '@wcp/wario-shared';

import axiosInstance from '@/utils/axios';

import { type ProductInstanceFormState, toProductInstanceApiBody } from '@/atoms/forms/productInstanceFormAtoms';

// ============================================================================
// Types
// ============================================================================

interface AddProductInstanceRequest {
  productId: string;
  form: ProductInstanceFormState;
}

interface EditProductInstanceRequest {
  productId: string;
  instanceId: string;
  form: ProductInstanceFormState;
}

interface DeleteProductInstanceRequest {
  productId: string;
  instanceId: string;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Mutation hook for adding a product instance to an existing product
 */
export function useAddProductInstanceMutation() {
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ productId, form }: AddProductInstanceRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
      const body: UncommittedIProductInstance = toProductInstanceApiBody(form);

      const response = await axiosInstance.post<IProductInstance>(`/api/v1/menu/product/${productId}`, body, {
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
 * Mutation hook for editing a product instance
 */
export function useEditProductInstanceMutation() {
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ productId, instanceId, form }: EditProductInstanceRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
      const body = toProductInstanceApiBody(form);

      const response = await axiosInstance.patch<IProductInstance>(
        `/api/v1/menu/product/${productId}/${instanceId}`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    },
  });
}

/**
 * Mutation hook for deleting a product instance
 */
export function useDeleteProductInstanceMutation() {
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ productId, instanceId }: DeleteProductInstanceRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'delete:catalog' } });

      const response = await axiosInstance.delete<IProductInstance>(`/api/v1/menu/product/${productId}/${instanceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    },
  });
}
