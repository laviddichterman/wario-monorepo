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
export function useFulfillmentById(fulfillmentId: string | null) {
  const { data: fulfillments } = useFulfillmentsQuery();

  // Simple derived value - returns the fulfillment or null
  const fulfillment = fulfillments && fulfillmentId
    ? fulfillments.find((f) => f.id === fulfillmentId) ?? null
    : null;

  return { data: fulfillment };
}


export function useValueFromFulfillmentById<K extends keyof FulfillmentConfig>(fulfillmentId: string | null, key: K) {
  const { data: fulfillment } = useFulfillmentById(fulfillmentId);

  // Simple derived value - returns the specific key from the fulfillment or null
  const value = fulfillment ? fulfillment[key] : null;

  return { data: value };
}

// export const SelectFulfillmentDisplayName = SelectSomethingFromFulfillment('displayName');
// export const SelectMainCategoryId = SelectSomethingFromFulfillment('orderBaseCategoryId');
// export const SelectSupplementalCategoryId = SelectSomethingFromFulfillment('orderSupplementaryCategoryId');
// export const SelectMenuCategoryId = SelectSomethingFromFulfillment('menuBaseCategoryId');
// export const SelectMaxPartySize = SelectSomethingFromFulfillment('maxGuests');
// export const SelectServiceFeeSetting = SelectSomethingFromFulfillment('serviceCharge');
// export const SelectAllowTipping = SelectSomethingFromFulfillment('allowTipping');
// export const SelectFulfillmentMinDuration = SelectSomethingFromFulfillment('minDuration');
// export const SelectFulfillmentServiceTerms = SelectSomethingFromFulfillment('terms');
// export const SelectFulfillmentService = SelectSomethingFromFulfillment('service');
// export const SelectFulfillmentMaxGuests = SelectSomethingFromFulfillment('maxGuests');

export const useFulfillmentDisplayName = (fId: string | null) => useValueFromFulfillmentById(fId, 'displayName');
export const useFulfillmentMainCategoryId = (fId: string | null) => useValueFromFulfillmentById(fId, 'orderBaseCategoryId');
export const useFulfillmentSupplementalCategoryId = (fId: string | null) => useValueFromFulfillmentById(fId, 'orderSupplementaryCategoryId');
export const useFulfillmentMenuCategoryId = (fId: string | null) => useValueFromFulfillmentById(fId, 'menuBaseCategoryId');
export const useFulfillmentMaxPartySize = (fId: string | null) => useValueFromFulfillmentById(fId, 'maxGuests');
export const useFulfillmentServiceFeeSetting = (fId: string | null) => useValueFromFulfillmentById(fId, 'serviceCharge');
export const useFulfillmentAllowTipping = (fId: string | null) => useValueFromFulfillmentById(fId, 'allowTipping');
export const useFulfillmentMinDuration = (fId: string | null) => useValueFromFulfillmentById(fId, 'minDuration');
export const useFulfillmentServiceTerms = (fId: string | null) => useValueFromFulfillmentById(fId, 'terms');
export const useFulfillmentService = (fId: string | null) => useValueFromFulfillmentById(fId, 'service');
export const useFulfillmentMaxGuests = (fId: string | null) => useValueFromFulfillmentById(fId, 'maxGuests');