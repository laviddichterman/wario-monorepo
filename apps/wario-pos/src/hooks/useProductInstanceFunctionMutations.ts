import { useMutation } from '@tanstack/react-query';

import { AuthScopes } from '@wcp/wario-shared-private';
import type { IProductInstanceFunction } from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';

import {
  type ProductInstanceFunctionFormState,
  toProductInstanceFunctionApiBody,
} from '@/atoms/forms/productInstanceFunctionFormAtoms';

import { useGetAuthToken } from './useGetAuthToken';

// ============================================================================
// Types
// ============================================================================

interface AddProductInstanceFunctionRequest {
  form: ProductInstanceFunctionFormState;
}

interface EditProductInstanceFunctionRequest {
  id: string;
  form: ProductInstanceFunctionFormState;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Mutation hook for adding a product instance function
 */
export function useAddProductInstanceFunctionMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ form }: AddProductInstanceFunctionRequest) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      const body = toProductInstanceFunctionApiBody(form);

      const response = await axiosInstance.post<IProductInstanceFunction>(
        '/api/v1/query/language/productinstancefunction/',
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
 * Mutation hook for editing a product instance function
 */
export function useEditProductInstanceFunctionMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ id, form }: EditProductInstanceFunctionRequest) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      const body = toProductInstanceFunctionApiBody(form);

      const response = await axiosInstance.patch<IProductInstanceFunction>(
        `/api/v1/query/language/productinstancefunction/${id}`,
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
 * Mutation hook for deleting a product instance function
 */
export function useDeleteProductInstanceFunctionMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken(AuthScopes.DELETE_CATALOG);

      const response = await axiosInstance.delete<IProductInstanceFunction>(
        `/api/v1/query/language/productinstancefunction/${id}`,
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
