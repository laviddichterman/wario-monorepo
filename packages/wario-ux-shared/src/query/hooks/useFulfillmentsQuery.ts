/**
 * TanStack Query hook for fulfillments data
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import type { FulfillmentConfig } from '@wcp/wario-shared';

import { QUERY_KEYS } from '../types';

/**
 * Hook to query fulfillments data
 * Data is populated via Socket.io events, not HTTP requests
 */
export function useFulfillmentsQuery(
  options?: Omit<UseQueryOptions<FulfillmentConfig[] | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery<FulfillmentConfig[] | null>({
    queryKey: QUERY_KEYS.fulfillments,
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
 * Hook to get a specific fulfillment by ID
 * Uses a derived query that selects from the fulfillments data
 */
export function useFulfillmentById(fulfillmentId: string | null) {
  const { data: fulfillments } = useFulfillmentsQuery();

  // Simple derived value - returns the fulfillment or null
  const fulfillment = fulfillments && fulfillmentId
    ? fulfillments.find((f) => f.id === fulfillmentId) ?? null
    : null;

  return { data: fulfillment };
}
