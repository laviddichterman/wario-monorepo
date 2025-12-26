/**
 * TanStack Query hook for settings data
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import type { IWSettings } from '@wcp/wario-shared/types';

import { QUERY_KEYS } from '../types';

import { useSocket } from './useSocket';

/**
 * Hook to query settings data
 * Data is populated via Socket.io events, not HTTP requests
 */
export function useSettingsQuery(options?: Omit<UseQueryOptions<IWSettings | null>, 'queryKey' | 'queryFn'>) {
  const { hostAPI } = useSocket();
  return useQuery<IWSettings | null>({
    queryKey: [...QUERY_KEYS.settings, hostAPI],
    queryFn: async () => {
      if (!hostAPI) return null;
      const response = await fetch(`${hostAPI}/api/v1/catalog/settings`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      return response.json() as Promise<IWSettings>;
    },
    staleTime: Infinity, // Never refetch - data comes from socket
    gcTime: Infinity,
    ...options,
  });
}

/**
 * Hook to get a specific setting by key
 * 2025 Schema Update: IWSettings now has typed fields directly (no more config object)
 * @param key
 * @returns
 */
export function useSetting<K extends keyof IWSettings>(key: K) {
  const { data: settings } = useSettingsQuery();
  return settings ? settings[key] : null;
}

// Settings that exist in the new IWSettings schema:
export const useSquareAppId = () => useSetting('SQUARE_APPLICATION_ID');
export const useSquareLocationId = () => useSetting('SQUARE_LOCATION');
export const useDefaultFulfillmentId = () => useSetting('DEFAULT_FULFILLMENTID');
export const useAllowAdvanced = () => useSetting('ALLOW_ADVANCED');
export const useTipPreamble = () => useSetting('TIP_PREAMBLE');
export const useTaxRate = () => useSetting('TAX_RATE');
export const useLocationName = () => useSetting('LOCATION_NAME');
export const useLocationPhoneNumber = () => useSetting('LOCATION_PHONE_NUMBER');

// TODO: These settings were removed from IWSettings - they may need to be re-added
// or moved to fulfillment config or environment variables:
// - SERVICE_CHARGE (now on FulfillmentConfig.autograt)
// - DELIVERY_LINK (move to fulfillment or env)
// - AUTOGRAT_THRESHOLD (now on FulfillmentConfig.autograt)
// - MESSAGE_REQUEST_VEGAN (move to catalog/product config)
// - MESSAGE_REQUEST_HALF (move to catalog/product config)
// - MESSAGE_REQUEST_WELLDONE (move to catalog/product config)
// - MESSAGE_REQUEST_SLICING (move to catalog/product config)
