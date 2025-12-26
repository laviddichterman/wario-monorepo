/**
 * TanStack Query hook for fulfillments data
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { WDateUtils } from '@wcp/wario-shared/logic';
import { type FulfillmentConfig } from '@wcp/wario-shared/types';

import { QUERY_KEYS } from '../types';

import { useSocket } from './useSocket';

/**
 * Hook to query fulfillments data
 * Data is populated via Socket.io events, not HTTP requests
 */
export function useFulfillmentsQuery(
  options?: Omit<UseQueryOptions<FulfillmentConfig[] | null>, 'queryKey' | 'queryFn'>,
) {
  const { hostAPI } = useSocket();
  return useQuery<FulfillmentConfig[] | null>({
    queryKey: [...QUERY_KEYS.fulfillments, hostAPI],
    queryFn: async () => {
      if (!hostAPI) return null;
      const response = await fetch(`${hostAPI}/api/v1/catalog/fulfillments`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch fulfillments');
      }
      return response.json() as Promise<FulfillmentConfig[]>;
    },
    staleTime: Infinity, // Never refetch - data comes from socket
    gcTime: Infinity,
    ...options,
  });
}

/**
 * Gets all fulfillments as a non-null array
 *
 */
export function useFulfillments() {
  const { data: fulfillments } = useFulfillmentsQuery();
  return fulfillments || [];
}

/**
 * Hook to get a specific fulfillment by ID
 * Uses a derived query that selects from the fulfillments data
 */
export function useFulfillmentById(fulfillmentId: string | null) {
  const { data: fulfillments } = useFulfillmentsQuery();

  // Simple derived value - returns the fulfillment or null
  const fulfillment = fulfillments && fulfillmentId ? (fulfillments.find((f) => f.id === fulfillmentId) ?? null) : null;

  return fulfillment;
}

export function useValueFromFulfillmentById<K extends keyof FulfillmentConfig>(fulfillmentId: string | null, key: K) {
  const fulfillment = useFulfillmentById(fulfillmentId);
  // Simple derived value - returns the specific key from the fulfillment or null
  const value = fulfillment ? fulfillment[key] : null;
  return value;
}

export const useFulfillmentDisplayName = (fId: string | null) => useValueFromFulfillmentById(fId, 'displayName');
export const useFulfillmentMainCategoryId = (fId: string | null) =>
  useValueFromFulfillmentById(fId, 'orderBaseCategoryId');
export const useFulfillmentSupplementalCategoryId = (fId: string | null) =>
  useValueFromFulfillmentById(fId, 'orderSupplementaryCategoryId');
export const useFulfillmentMenuCategoryId = (fId: string | null) =>
  useValueFromFulfillmentById(fId, 'menuBaseCategoryId');
export const useFulfillmentServiceFeeSetting = (fId: string | null) =>
  useValueFromFulfillmentById(fId, 'serviceCharge');
export const useFulfillmentAllowTipping = (fId: string | null) => useValueFromFulfillmentById(fId, 'allowTipping');
export const useFulfillmentMinDuration = (fId: string | null) => useValueFromFulfillmentById(fId, 'minDuration');
export const useFulfillmentServiceTerms = (fId: string | null) => useValueFromFulfillmentById(fId, 'terms');
export const useFulfillmentService = (fId: string | null) => useValueFromFulfillmentById(fId, 'service');
export const useFulfillmentMaxGuests = (fId: string | null) => useValueFromFulfillmentById(fId, 'maxGuests');
export const useFulfillmentServiceArea = (fId: string | null) => useValueFromFulfillmentById(fId, 'serviceArea');
export const useFulfillmentOperatingHours = (fId: string | null) => useValueFromFulfillmentById(fId, 'operatingHours');

export function useFulfillmentHasOperatingHours(fulfillmentId: string) {
  const operatingHours = useFulfillmentOperatingHours(fulfillmentId);
  if (!operatingHours) return false;
  return WDateUtils.HasOperatingHours(operatingHours);
}
