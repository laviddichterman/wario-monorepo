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
export function useFulfillmentById(fulfillmentId: string) {
  const { data: fulfillments } = useFulfillmentsQuery();

  // Simple derived value - returns the fulfillment or null
  const fulfillment = fulfillments && fulfillmentId
    ? fulfillments.find((f) => f.id === fulfillmentId) ?? null
    : null;

  return fulfillment;
}


export function useValueFromFulfillmentById<K extends keyof FulfillmentConfig>(fulfillmentId: string, key: K) {
  const fulfillment = useFulfillmentById(fulfillmentId);
  // Simple derived value - returns the specific key from the fulfillment or null
  const value = fulfillment ? fulfillment[key] : null;
  return value;
}

export const useFulfillmentDisplayName = (fId: string) => useValueFromFulfillmentById(fId, 'displayName');
export const useFulfillmentMainCategoryId = (fId: string) => useValueFromFulfillmentById(fId, 'orderBaseCategoryId');
export const useFulfillmentSupplementalCategoryId = (fId: string) => useValueFromFulfillmentById(fId, 'orderSupplementaryCategoryId');
export const useFulfillmentMenuCategoryId = (fId: string) => useValueFromFulfillmentById(fId, 'menuBaseCategoryId');
export const useFulfillmentMaxPartySize = (fId: string) => useValueFromFulfillmentById(fId, 'maxGuests');
export const useFulfillmentServiceFeeSetting = (fId: string) => useValueFromFulfillmentById(fId, 'serviceCharge');
export const useFulfillmentAllowTipping = (fId: string) => useValueFromFulfillmentById(fId, 'allowTipping');
export const useFulfillmentMinDuration = (fId: string) => useValueFromFulfillmentById(fId, 'minDuration');
export const useFulfillmentServiceTerms = (fId: string) => useValueFromFulfillmentById(fId, 'terms');
export const useFulfillmentService = (fId: string) => useValueFromFulfillmentById(fId, 'service');
export const useFulfillmentMaxGuests = (fId: string) => useValueFromFulfillmentById(fId, 'maxGuests');
export const useFulfillmentServiceArea = (fId: string) => useValueFromFulfillmentById(fId, 'serviceArea');
export const useFulfillmentOperatingHours = (fId: string) => useValueFromFulfillmentById(fId, 'operatingHours');
