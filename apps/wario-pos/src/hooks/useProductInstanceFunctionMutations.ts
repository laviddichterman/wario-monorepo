import { useAuth0 } from '@auth0/auth0-react';
import { useMutation } from '@tanstack/react-query';

import type { IProductInstanceFunction } from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';

import {
  type ProductInstanceFunctionFormState,
  toProductInstanceFunctionApiBody,
} from '@/atoms/forms/productInstanceFunctionFormAtoms';

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
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ form }: AddProductInstanceFunctionRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
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
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ id, form }: EditProductInstanceFunctionRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
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
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'delete:catalog' } });

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
