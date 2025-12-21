import { useMutation } from '@tanstack/react-query';

import { AuthScopes } from '@wcp/wario-shared-private';
import type { IOption, IWInterval } from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';

import { type ModifierOptionFormState, toModifierOptionApiBody } from '@/atoms/forms/modifierOptionFormAtoms';

import { useGetAuthToken } from './useGetAuthToken';

// ============================================================================
// Types
// ============================================================================

interface AddModifierOptionRequest {
  modifierTypeId: string;
  form: ModifierOptionFormState;
}

interface EditModifierOptionRequest {
  modifierTypeId: string;
  optionId: string;
  form: ModifierOptionFormState;
  dirtyFields?: Set<keyof ModifierOptionFormState>;
}

interface DeleteModifierOptionRequest {
  modifierTypeId: string;
  optionId: string;
}

interface DisableModifierOptionRequest {
  modifierTypeId: string;
  option: IOption;
  disabled: IWInterval | null;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Mutation hook for adding a modifier option
 */
export function useAddModifierOptionMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ modifierTypeId, form }: AddModifierOptionRequest) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      const body = toModifierOptionApiBody(form);

      const response = await axiosInstance.post<IOption>(`/api/v1/menu/option/${modifierTypeId}/`, body, {
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
 * Mutation hook for editing a modifier option
 */
export function useEditModifierOptionMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ modifierTypeId, optionId, form, dirtyFields }: EditModifierOptionRequest) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      const body = toModifierOptionApiBody(form, dirtyFields || new Set());

      const response = await axiosInstance.patch<IOption>(`/api/v1/menu/option/${modifierTypeId}/${optionId}`, body, {
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
 * Mutation hook for deleting a modifier option
 */
export function useDeleteModifierOptionMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ modifierTypeId, optionId }: DeleteModifierOptionRequest) => {
      const token = await getToken(AuthScopes.DELETE_CATALOG);

      const response = await axiosInstance.delete<IOption>(`/api/v1/menu/option/${modifierTypeId}/${optionId}`, {
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
 * Mutation hook for enabling/disabling a modifier option
 * Used for enable, disable, and disable_until_eod operations
 */
export function useSetModifierOptionDisabledMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ modifierTypeId, option, disabled }: DisableModifierOptionRequest) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      // Only send the fields we want to update (partial update matching UpdateIOptionRequestBody)
      const body = { disabled };

      const response = await axiosInstance.patch<IOption>(`/api/v1/menu/option/${modifierTypeId}/${option.id}`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    },
  });
}
