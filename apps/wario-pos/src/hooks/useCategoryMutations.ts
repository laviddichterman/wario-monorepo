import { useAuth0 } from '@auth0/auth0-react';
import { useMutation } from '@tanstack/react-query';

import type { ICategory } from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';

import { type CategoryFormState, toCategoryApiBody } from '@/atoms/forms/categoryFormAtoms';

// ============================================================================
// Types
// ============================================================================

interface EditCategoryRequest {
  id: string;
  form: CategoryFormState;
}

interface DeleteCategoryRequest {
  id: string;
  deleteContainedProducts: boolean;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Mutation hook for adding a category
 */
export function useAddCategoryMutation() {
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (form: CategoryFormState) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
      const body = toCategoryApiBody(form);

      const response = await axiosInstance.post<ICategory>('/api/v1/menu/category', body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    },
    // No onSuccess invalidation needed - socket handles catalog refresh
  });
}

/**
 * Mutation hook for editing a category
 */
export function useEditCategoryMutation() {
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ id, form }: EditCategoryRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
      const body = toCategoryApiBody(form);

      const response = await axiosInstance.patch<ICategory>(`/api/v1/menu/category/${id}`, body, {
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
 * Mutation hook for deleting a category
 */
export function useDeleteCategoryMutation() {
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ id, deleteContainedProducts }: DeleteCategoryRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'delete:catalog' } });

      const response = await axiosInstance.delete<ICategory>(`/api/v1/menu/category/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: { delete_contained_products: deleteContainedProducts },
      });

      return response.data;
    },
  });
}
