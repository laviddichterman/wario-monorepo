/**
 * TanStack Query hook for server time data
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import type { ServerTimeData } from '../types';
import { QUERY_KEYS } from '../types';

/**
 * Hook to query server time data
 * Data is populated via Socket.io events, not HTTP requests
 */
export function useServerTimeQuery(options?: Omit<UseQueryOptions<ServerTimeData | null>, 'queryKey' | 'queryFn'>) {
  return useQuery<ServerTimeData | null>({
    queryKey: QUERY_KEYS.serverTime,
    queryFn: () => {
      // Data is set via socket events, not fetched
      return null;
    },
    staleTime: Infinity, // Never refetch - data comes from socket
    gcTime: Infinity,
    ...options,
  });
}
