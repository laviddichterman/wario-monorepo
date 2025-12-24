/**
 * Mock hooks for table assignment operations.
 * TODO: Implement actual backend API integration.
 */

import { useCallback, useState } from 'react';

import type { WSeatingStatus } from '@wcp/wario-shared';

export interface AssignTablePayload {
  orderId: string;
  tableIds: string[];
}

export interface MarkArrivedPayload {
  orderId: string;
  status: WSeatingStatus;
}

/**
 * Mock mutation hook for assigning tables to an order.
 * Logs the payload to console and returns a success promise.
 */
export function useAssignTableMutation() {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (payload: AssignTablePayload) => {
    setIsLoading(true);
    console.log('[useAssignTableMutation] Assigning tables:', payload);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    setIsLoading(false);
    // TODO: Replace with actual API call
    // await api.put(`/api/v1/order/${payload.orderId}/seating`, { tableIds: payload.tableIds });

    return { success: true };
  }, []);

  return { mutate, isLoading };
}

/**
 * Mock mutation hook for marking order arrival status.
 * Logs the payload to console and returns a success promise.
 */
export function useMarkArrivedMutation() {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (payload: MarkArrivedPayload) => {
    setIsLoading(true);
    console.log('[useMarkArrivedMutation] Marking arrival:', payload);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    setIsLoading(false);
    // TODO: Replace with actual API call
    // await api.put(`/api/v1/order/${payload.orderId}/seating/arrival`, { status: payload.status });

    return { success: true };
  }, []);

  return { mutate, isLoading };
}
