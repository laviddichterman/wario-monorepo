/**
 * Hooks for table assignment and seating status operations.
 * Uses useUpdateOrderInfoMutation to update order seating data via the backend API.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AuthScopes } from '@wcp/wario-shared-private';
import { WSeatingStatus } from '@wcp/wario-shared/logic';
import type { FulfillmentData, WOrderInstance } from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';
import { uuidv4 } from '@/utils/uuidv4';

import { toast } from '@/components/snackbar';

import { useGetAuthToken } from './useGetAuthToken';

export interface AssignTablePayload {
  orderId: string;
  tableIds: string[];
  /** Current order - needed to preserve existing fulfillment fields */
  order: WOrderInstance;
}

export interface UpdateSeatingStatusPayload {
  orderId: string;
  status: WSeatingStatus;
  /** Current order - needed to preserve existing fulfillment fields */
  order: WOrderInstance;
}

/**
 * Build fulfillment payload with updated seating info.
 * Preserves all existing fulfillment fields.
 */
function buildSeatingFulfillment(order: WOrderInstance, tableIds: string[], status: WSeatingStatus): FulfillmentData {
  return {
    selectedDate: order.fulfillment.selectedDate,
    selectedTime: order.fulfillment.selectedTime,
    selectedService: order.fulfillment.selectedService,
    status: order.fulfillment.status,
    dineInInfo: {
      partySize: order.fulfillment.dineInInfo?.partySize ?? 1,
      seating: {
        tableId: tableIds,
        status,
        mtime: Date.now(),
      },
    },
    ...(order.fulfillment.deliveryInfo ? { deliveryInfo: order.fulfillment.deliveryInfo } : {}),
    ...(order.fulfillment.thirdPartyInfo ? { thirdPartyInfo: order.fulfillment.thirdPartyInfo } : {}),
  };
}

/**
 * Mutation hook for assigning tables to an order.
 * Sets status to ASSIGNED when tables are assigned.
 */
export function useAssignTableMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ orderId, tableIds, order }: AssignTablePayload) => {
      const token = await getToken(AuthScopes.WRITE_ORDER);

      // When assigning tables, set status to ASSIGNED
      const fulfillment = buildSeatingFulfillment(order, tableIds, WSeatingStatus.ASSIGNED);

      await axiosInstance.put(
        `/api/v1/order/${orderId}/info`,
        { fulfillment },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': uuidv4(),
          },
        },
      );
    },
    onSuccess: async (_data, variables) => {
      toast.success('Table assigned successfully');
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
    },
    onError: (error) => {
      toast.error('Failed to assign table');
      console.error(error);
    },
  });
}

/**
 * Mutation hook for updating seating status.
 * Preserves existing table assignment.
 */
export function useUpdateSeatingStatusMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ orderId, status, order }: UpdateSeatingStatusPayload) => {
      const token = await getToken(AuthScopes.WRITE_ORDER);

      // Preserve existing table IDs, only update status
      const existingTableIds = order.fulfillment.dineInInfo?.seating?.tableId ?? [];
      const fulfillment = buildSeatingFulfillment(order, existingTableIds, status);

      await axiosInstance.put(
        `/api/v1/order/${orderId}/info`,
        { fulfillment },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': uuidv4(),
          },
        },
      );
    },
    onSuccess: async (_data, variables) => {
      toast.success('Seating status updated');
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
    },
    onError: (error) => {
      toast.error('Failed to update seating status');
      console.error(error);
    },
  });
}
