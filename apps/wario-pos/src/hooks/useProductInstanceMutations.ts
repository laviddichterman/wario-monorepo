import { useMutation } from '@tanstack/react-query';

import { AuthScopes } from '@wcp/wario-shared-private';
import type { CreateIProductInstanceRequest, IProductInstance } from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';

import { type ProductInstanceFormState, toProductInstanceApiBody } from '@/atoms/forms/productInstanceFormAtoms';

import { useGetAuthToken } from './useGetAuthToken';

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
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ productId, form }: AddProductInstanceRequest) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      const body: CreateIProductInstanceRequest = toProductInstanceApiBody(form);

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
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ productId, instanceId, form }: EditProductInstanceRequest) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
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
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ productId, instanceId }: DeleteProductInstanceRequest) => {
      const token = await getToken(AuthScopes.DELETE_CATALOG);

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
