/**
 * useLiveTableStatus - Hook to compute current table status from live orders.
 *
 * Provides a map of tableId -> status information for rendering the live table map.
 * Currently stubbed with mock data; will be updated to use real order queries.
 */

import { useMemo } from 'react';

import { WSeatingStatus } from '@wcp/wario-shared/types';

export interface TableStatusEntry {
  /** The table resource ID */
  tableId: string;
  /** The order ID if table is occupied, null if empty */
  orderId: string | null;
  /** Current seating status, null if no order */
  status: WSeatingStatus | null;
  /** Other table IDs assigned to the same order (for multi-table parties) */
  linkedTableIds: string[];
  /** Party size for this order */
  partySize: number | null;
  /** Customer name for quick reference */
  customerName: string | null;
}

export interface LiveTableStatusResult {
  /** Map of tableId to status entry */
  tableStatusMap: Record<string, TableStatusEntry>;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Error if query failed */
  error: Error | null;
}

/**
 * Status color mapping for visualization.
 * Exported for use by components that need consistent coloring.
 */
export const STATUS_COLORS: Record<WSeatingStatus, string> = {
  [WSeatingStatus.PENDING]: '#9E9E9E', // Gray
  [WSeatingStatus.ASSIGNED]: '#2196F3', // Blue
  [WSeatingStatus.WAITING_ARRIVAL]: '#FFC107', // Yellow/Amber
  [WSeatingStatus.SEATED_WAITING]: '#FF9800', // Orange
  [WSeatingStatus.SEATED]: '#4CAF50', // Green
  [WSeatingStatus.WAITING_FOR_CHECK]: '#9C27B0', // Purple
  [WSeatingStatus.PAID]: '#00BCD4', // Teal/Cyan
  [WSeatingStatus.COMPLETED]: '#E0E0E0', // Light gray (essentially empty)
};

/**
 * Human-readable status labels.
 */
export const STATUS_LABELS: Record<WSeatingStatus, string> = {
  [WSeatingStatus.PENDING]: 'Pending',
  [WSeatingStatus.ASSIGNED]: 'Assigned',
  [WSeatingStatus.WAITING_ARRIVAL]: 'Waiting for Arrival',
  [WSeatingStatus.SEATED_WAITING]: 'Partially Seated',
  [WSeatingStatus.SEATED]: 'Seated',
  [WSeatingStatus.WAITING_FOR_CHECK]: 'Waiting for Check',
  [WSeatingStatus.PAID]: 'Paid',
  [WSeatingStatus.COMPLETED]: 'Completed',
};

/**
 * Hook to get live table status for the restaurant floor view.
 *
 * TODO: Replace stub with real implementation that:
 * 1. Fetches orders with status OPEN, CONFIRMED, PROCESSING for today
 * 2. Filters to DineIn fulfillment type
 * 3. Extracts fulfillment.dineInInfo.seating data
 * 4. Builds tableId -> status map
 *
 * Future: Subscribe to RxDB or GraphQL for real-time updates.
 */
export function useLiveTableStatus(): LiveTableStatusResult {
  // TODO: Replace with real order query
  // const { data: orders, isLoading, error } = useOrdersQuery({
  //   status: [WOrderStatus.OPEN, WOrderStatus.CONFIRMED, WOrderStatus.PROCESSING],
  //   fulfillmentType: FulfillmentType.DineIn,
  //   date: formatISODate(new Date()),
  // });

  // STUB: Return empty map for now
  const tableStatusMap = useMemo<Record<string, TableStatusEntry>>(() => {
    // Stubbed implementation - returns empty map
    // When real data is available, this will be populated from orders

    // Example of what the populated map would look like:
    // return {
    //   'table-1': {
    //     tableId: 'table-1',
    //     orderId: 'order-123',
    //     status: WSeatingStatus.SEATED,
    //     linkedTableIds: ['table-2'], // Same party spans 2 tables
    //     partySize: 6,
    //     customerName: 'Smith',
    //   },
    //   'table-2': {
    //     tableId: 'table-2',
    //     orderId: 'order-123', // Same order as table-1
    //     status: WSeatingStatus.SEATED,
    //     linkedTableIds: ['table-1'],
    //     partySize: 6,
    //     customerName: 'Smith',
    //   },
    // };

    return {};
  }, []);

  return {
    tableStatusMap,
    isLoading: false, // Stub always returns immediately
    error: null,
  };
}
