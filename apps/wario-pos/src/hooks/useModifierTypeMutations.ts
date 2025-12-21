import { useMutation } from '@tanstack/react-query';

import { AuthScopes } from '@wcp/wario-shared-private';
import type { IOption, IOptionType } from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';

import { type ModifierTypeFormState, toModifierTypeApiBody } from '@/atoms/forms/modifierTypeFormAtoms';

import { useGetAuthToken } from './useGetAuthToken';

// ============================================================================
// Types
// ============================================================================

interface AddModifierTypeRequest {
  form: ModifierTypeFormState;
  options: Omit<IOption, 'modifierTypeId' | 'id'>[];
}

interface EditModifierTypeRequest {
  id: string;
  form: ModifierTypeFormState;
  dirtyFields?: Set<keyof ModifierTypeFormState>;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Mutation hook for adding a modifier type
 */
export function useAddModifierTypeMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ form, options }: AddModifierTypeRequest) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      const body = {
        ...toModifierTypeApiBody(form),
        options,
      };

      const response = await axiosInstance.post<IOptionType>('/api/v1/menu/option/', body, {
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
 * Mutation hook for editing a modifier type.
 * If dirtyFields is provided, only the modified fields are sent (partial update).
 */
export function useEditModifierTypeMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ id, form, dirtyFields }: EditModifierTypeRequest) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      // Only send dirty fields for PATCH/update
      const body = dirtyFields ? toModifierTypeApiBody(form, dirtyFields) : toModifierTypeApiBody(form);

      const response = await axiosInstance.patch<IOptionType>(`/api/v1/menu/option/${id}`, body, {
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
 * Mutation hook for deleting a modifier type
 */
export function useDeleteModifierTypeMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken(AuthScopes.DELETE_CATALOG);

      const response = await axiosInstance.delete<IOptionType>(`/api/v1/menu/option/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    },
  });
}
