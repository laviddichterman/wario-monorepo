/**
 * TanStack Query hook for settings data
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import type { IWSettings } from '@wcp/wario-shared';

import { QUERY_KEYS } from '../types';

/**
 * Hook to query settings data
 * Data is populated via Socket.io events, not HTTP requests
 */
export function useSettingsQuery(options?: Omit<UseQueryOptions<IWSettings | null>, 'queryKey' | 'queryFn'>) {
  return useQuery<IWSettings | null>({
    queryKey: QUERY_KEYS.settings,
    queryFn: () => {
      // Data is set via socket events, not fetched
      return null;
    },
    staleTime: Infinity, // Never refetch - data comes from socket
    gcTime: Infinity,
    ...options,
  });
}

/**
 * Hook to get a specific setting by key
 * @param key
 * @returns
 */
export function useSetting(key: keyof IWSettings['config']) {
  const { data: settings } = useSettingsQuery();

  // Simple derived value - returns the setting or null
  const setting = settings ? settings.config[key] : null;
  return setting;
}

export const useSquareAppId = () => useSetting('SQUARE_APPLICATION_ID') as string | null;
export const useSquareLocationId = () => useSetting('SQUARE_LOCATION') as string | null;
export const useDefaultFulfillmentId = () => useSetting('DEFAULT_FULFILLMENTID') as string | null;
export const useAllowAdvanced = () => useSetting('ALLOW_ADVANCED') as boolean | null;
export const useGratuityServiceCharge = () => useSetting('SERVICE_CHARGE') as number | null;
// todo: put this on the fulfillment
export const useDeliveryAreaLink = () => useSetting('DELIVERY_LINK') as string | null;
export const useTipPreamble = () => useSetting('TIP_PREAMBLE') as string | null;
export const useTaxRate = () => useSetting('TAX_RATE') as number | null;
export const useAutoGratutityThreshold = () => useSetting('AUTOGRAT_THRESHOLD') as number | null;
export const useMessageRequestVegan = () => useSetting('MESSAGE_REQUEST_VEGAN') as string | null;
export const useMessageRequestHalf = () => useSetting('MESSAGE_REQUEST_HALF') as string | null;
export const useMessageRequestWellDone = () => useSetting('MESSAGE_REQUEST_WELLDONE') as string | null;
export const useMessageRequestSlicing = () => useSetting('MESSAGE_REQUEST_SLICING') as string | null;
