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
export function useSettingsQuery(
  options?: Omit<UseQueryOptions<IWSettings | null>, 'queryKey' | 'queryFn'>
) {
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
