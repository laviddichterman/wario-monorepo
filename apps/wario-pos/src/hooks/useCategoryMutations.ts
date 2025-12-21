import { useMutation } from '@tanstack/react-query';

import { AuthScopes } from '@wcp/wario-shared-private';
import type { ICategory } from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';

import { type CategoryFormState, toCategoryApiBody } from '@/atoms/forms/categoryFormAtoms';

import { useGetAuthToken } from './useGetAuthToken';

// ============================================================================
// Types
// ============================================================================

interface EditCategoryRequest {
  id: string;
  form: CategoryFormState;
  dirtyFields?: Set<keyof CategoryFormState>;
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
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (form: CategoryFormState) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
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
 * Mutation hook for editing a category.
 * If dirtyFields is provided, only the modified fields are sent (partial update).
 */
export function useEditCategoryMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ id, form, dirtyFields }: EditCategoryRequest) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      // Only send dirty fields for PATCH/update
      const body = dirtyFields ? toCategoryApiBody(form, dirtyFields) : toCategoryApiBody(form);

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
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ id, deleteContainedProducts }: DeleteCategoryRequest) => {
      const token = await getToken(AuthScopes.DELETE_CATALOG);

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
