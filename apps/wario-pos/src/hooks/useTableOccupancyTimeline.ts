/**
 * Hook to fetch dine-in orders and compute table occupancy timeline.
 */

import { getDay, parseISO } from 'date-fns';
import { useCallback, useMemo } from 'react';

import { WDateUtils } from '@wcp/wario-shared/logic';
import { useFulfillments } from '@wcp/wario-ux-shared/query';

import type { TableStatusMapEntry } from '@/sections/seating/SeatingCanvas';
import {
  computeTableOccupancyAtTime,
  extractOccupancyFromOrders,
  getTimeRangeForOccupancies,
  type OrderOccupancy,
  type TableOccupancyInfo,
} from '@/sections/seating/utils/table-occupancy-utils';

import { STATUS_COLORS } from './useLiveTableStatus';
import { useOrdersQuery } from './useOrdersQuery';

export interface UseTableOccupancyTimelineOptions {
  /** Date in YYYYMMDD format */
  date: string;
}

export interface TableOccupancyTimelineResult {
  /** All occupancies for the day */
  occupancies: OrderOccupancy[];
  /** Min/max time range for the day (based on operating hours) */
  timeRange: { start: number; end: number };
  /** Compute occupancy at any time, returning map suitable for SeatingCanvas */
  getOccupancyAtTime: (targetTime: number) => Map<string, TableStatusMapEntry>;
  /** Raw occupancy info (for tooltips, etc.) */
  getOccupancyInfoAtTime: (targetTime: number) => Map<string, TableOccupancyInfo>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to compute table occupancy timeline for a given date.
 * Fetches orders, filters to active dine-in reservations, and provides
 * functions to compute occupancy at any point in time.
 */
export function useTableOccupancyTimeline(options: UseTableOccupancyTimelineOptions): TableOccupancyTimelineResult {
  const { date } = options;

  // Fetch orders for the date
  const { data: ordersMap, isLoading: ordersLoading, error: ordersError } = useOrdersQuery({ date });

  // Get fulfillment configs
  const fulfillments = useFulfillments();

  // Extract occupancy data from orders
  const occupancies = useMemo(() => {
    if (!ordersMap || !fulfillments.length) return [];
    const orders = Object.values(ordersMap);
    return extractOccupancyFromOrders(orders, fulfillments);
  }, [ordersMap, fulfillments]);

  // Compute operating hours for the selected date
  const operatingHours = useMemo(() => {
    if (!fulfillments.length) return [];

    // Parse YYYYMMDD to get day of week
    const dayIndex = getDay(parseISO(date));

    return WDateUtils.GetOperatingHoursForServicesAndDate(fulfillments, date, dayIndex);
  }, [fulfillments, date]);

  // Compute time range based on operating hours
  const timeRange = useMemo(() => {
    return getTimeRangeForOccupancies(operatingHours, occupancies, date);
  }, [operatingHours, occupancies, date]);

  // Function to get raw occupancy info at a time
  const getOccupancyInfoAtTime = useCallback(
    (targetTime: number): Map<string, TableOccupancyInfo> => {
      return computeTableOccupancyAtTime(occupancies, targetTime);
    },
    [occupancies],
  );

  // Function to get SeatingCanvas-compatible status map at a time
  const getOccupancyAtTime = useCallback(
    (targetTime: number): Map<string, TableStatusMapEntry> => {
      const occupancyMap = computeTableOccupancyAtTime(occupancies, targetTime);
      const statusMap = new Map<string, TableStatusMapEntry>();

      for (const [tableId, info] of occupancyMap) {
        statusMap.set(tableId, {
          color: STATUS_COLORS[info.seatingStatus],
          orderId: info.orderId,
        });
      }

      return statusMap;
    },
    [occupancies],
  );

  return {
    occupancies,
    timeRange,
    getOccupancyAtTime,
    getOccupancyInfoAtTime,
    isLoading: ordersLoading,
    error: ordersError ?? null,
  };
}

/**
 * Get current date in YYYYMMDD format.
 */
export function getTodayDateString(): string {
  return WDateUtils.formatISODate(new Date());
}
