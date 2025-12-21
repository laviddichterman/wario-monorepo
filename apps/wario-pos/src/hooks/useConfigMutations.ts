import { useMutation } from '@tanstack/react-query';

import { AuthScopes } from '@wcp/wario-shared-private';
import type { IWInterval, IWSettings, KeyValue, PostBlockedOffToFulfillmentsRequest } from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';

import { useGetAuthToken } from './useGetAuthToken';

// ============================================================================
// Types
// ============================================================================

export interface DeleteBlockedOffRequest {
  fulfillmentId: string;
  date: string;
  interval: IWInterval;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Mutation hook for updating Key Value Store
 */
export function useUpdateKeyValueStoreMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (values: KeyValue[]) => {
      const token = await getToken(AuthScopes.WRITE_SETTINGS);
      const body = values.reduce((acc: Record<string, string>, x) => ({ ...acc, [x.key]: x.value }), {});

      const response = await axiosInstance.post<Record<string, string>>('/api/v1/config/kvstore', body, {
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
 * Mutation hook for updating Customer Facing Store Configuration (Settings)
 */
export function useUpdateSettingsMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (settings: IWSettings) => {
      const token = await getToken(AuthScopes.WRITE_ORDER_CONFIG);

      const response = await axiosInstance.post<IWSettings>('/api/v1/config/settings', settings, {
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
 * Mutation hook for updating Lead Times
 */
export function useUpdateLeadTimeMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (leadtimes: Record<string, number>) => {
      const token = await getToken(AuthScopes.WRITE_ORDER_CONFIG);

      const response = await axiosInstance.post<unknown>('/api/v1/config/timing/leadtime', leadtimes, {
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
 * Mutation hook for adding blocked off time
 */
export function useBlockOffMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (body: PostBlockedOffToFulfillmentsRequest) => {
      const token = await getToken(AuthScopes.WRITE_ORDER_CONFIG);

      const response = await axiosInstance.post<unknown>('/api/v1/config/timing/blockoff', body, {
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
 * Mutation hook for removing blocked off time
 */
export function useRemoveBlockOffMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ fulfillmentId, date, interval }: DeleteBlockedOffRequest) => {
      const token = await getToken(AuthScopes.WRITE_ORDER_CONFIG);

      const body: PostBlockedOffToFulfillmentsRequest = {
        date,
        fulfillmentIds: [fulfillmentId],
        interval,
      };

      const response = await axiosInstance.delete<unknown>('/api/v1/config/timing/blockoff', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: body,
      });

      return response.data;
    },
  });
}
