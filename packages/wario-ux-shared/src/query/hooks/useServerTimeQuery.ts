/**
 * TanStack Query hook for server time data
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import type { ServerTimeData } from '../types';
import { QUERY_KEYS } from '../types';

import { useSocket } from './useSocket';

/**
 * Hook to query server time data
 * Data is populated via Socket.io events, not HTTP requests
 */
export function useServerTimeQuery(options?: Omit<UseQueryOptions<ServerTimeData | null>, 'queryKey' | 'queryFn'>) {
  const { hostAPI } = useSocket();
  return useQuery<ServerTimeData | null>({
    queryKey: [...QUERY_KEYS.serverTime, hostAPI],
    queryFn: async () => {
      if (!hostAPI) return null;
      const response = await fetch(`${hostAPI}/api/v1/catalog/server-time`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch server time');
      }
      return response.json() as Promise<ServerTimeData>;
    },
    staleTime: Infinity, // Never refetch - data comes from socket
    gcTime: Infinity,
    ...options,
  });
}
