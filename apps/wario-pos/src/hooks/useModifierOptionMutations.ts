import { useAuth0 } from '@auth0/auth0-react';
import { useMutation } from '@tanstack/react-query';

import type { IOption, IWInterval } from '@wcp/wario-shared';

import axiosInstance from '@/utils/axios';

import { type ModifierOptionFormState, toModifierOptionApiBody } from '@/atoms/forms/modifierOptionFormAtoms';

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
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ modifierTypeId, form }: AddModifierOptionRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
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
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ modifierTypeId, optionId, form }: EditModifierOptionRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
      const body = toModifierOptionApiBody(form);

      const response = await axiosInstance.patch<IOption>(
        `/api/v1/menu/option/${modifierTypeId}/${optionId}`,
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
 * Mutation hook for deleting a modifier option
 */
export function useDeleteModifierOptionMutation() {
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ modifierTypeId, optionId }: DeleteModifierOptionRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'delete:catalog' } });

      const response = await axiosInstance.delete<IOption>(
        `/api/v1/menu/option/${modifierTypeId}/${optionId}`,
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
 * Mutation hook for enabling/disabling a modifier option
 * Used for enable, disable, and disable_until_eod operations
 */
export function useSetModifierOptionDisabledMutation() {
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ modifierTypeId, option, disabled }: DisableModifierOptionRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
      const body: IOption = {
        ...option,
        disabled,
      };

      const response = await axiosInstance.patch<IOption>(
        `/api/v1/menu/option/${modifierTypeId}/${option.id}`,
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
