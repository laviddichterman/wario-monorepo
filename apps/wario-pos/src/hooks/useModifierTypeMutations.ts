import { useAuth0 } from '@auth0/auth0-react';
import { useMutation } from '@tanstack/react-query';

import type { IOption, IOptionType } from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';

import { type ModifierTypeFormState, toModifierTypeApiBody } from '@/atoms/forms/modifierTypeFormAtoms';

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
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Mutation hook for adding a modifier type
 */
export function useAddModifierTypeMutation() {
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ form, options }: AddModifierTypeRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
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
 * Mutation hook for editing a modifier type
 */
export function useEditModifierTypeMutation() {
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ id, form }: EditModifierTypeRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
      const body = toModifierTypeApiBody(form);

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
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'delete:catalog' } });

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
