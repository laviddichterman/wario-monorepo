/**
 * Table occupancy utilities for the seating timeline feature.
 *
 * Computes which tables are occupied at any given time based on active dine-in orders.
 */

import { addMinutes, parseISO, startOfDay } from 'date-fns';

import { WDateUtils, WSeatingStatus } from '@wcp/wario-shared/logic';
import type { FulfillmentConfig, WOrderInstance } from '@wcp/wario-shared/types';

/**
 * Round up to nearest 15-minute increment.
 * Ensures minimum 15-minute duration if value is 0 or less.
 */
export function ceilToFifteen(minutes: number): number {
  return Math.ceil(Math.max(minutes, 15) / 15) * 15;
}

export interface OrderOccupancy {
  orderId: string;
  tableIds: string[];
  /** Epoch ms */
  startTime: number;
  /** Epoch ms (start + ceilToFifteen(maxDuration)) */
  endTime: number;
  partySize: number;
  customerName: string;
  seatingStatus: WSeatingStatus;
}

/**
 * Extract occupancy data from dine-in orders.
 * Filters out orders where seating status is PAID or COMPLETED.
 *
 * @param orders - All orders (will be filtered to those with active seating)
 * @param fulfillments - Fulfillment configs (to get maxDuration)
 */
export function extractOccupancyFromOrders(
  orders: WOrderInstance[],
  fulfillments: FulfillmentConfig[],
): OrderOccupancy[] {
  const fulfillmentMap = new Map(fulfillments.map((f) => [f.id, f]));
  const occupancies: OrderOccupancy[] = [];

  for (const order of orders) {
    const seating = order.fulfillment.dineInInfo?.seating;

    // Skip orders without seating assignment
    if (!seating || seating.tableId.length === 0) continue;

    // Skip PAID and COMPLETED - they've vacated
    if (seating.status === WSeatingStatus.PAID || seating.status === WSeatingStatus.COMPLETED) continue;

    const fulfillment = fulfillmentMap.get(order.fulfillment.selectedService);
    const maxDuration = fulfillment?.maxDuration ?? 0;
    const durationMinutes = ceilToFifteen(maxDuration);

    // Use WDateUtils.ComputeServiceDateTime which handles YYYYMMDD + minutes
    const startDate = WDateUtils.ComputeServiceDateTime(order.fulfillment);
    const startTime = startDate.getTime();
    const endTime = addMinutes(startDate, durationMinutes).getTime();

    occupancies.push({
      orderId: order.id,
      tableIds: seating.tableId,
      startTime,
      endTime,
      partySize: order.fulfillment.dineInInfo?.partySize ?? 0,
      customerName: `${order.customerInfo.givenName} ${order.customerInfo.familyName}`,
      seatingStatus: seating.status,
    });
  }

  return occupancies;
}

export interface TableOccupancyInfo {
  orderId: string;
  partySize: number;
  customerName: string;
  seatingStatus: WSeatingStatus;
  /** Other tables in the same reservation */
  linkedTableIds: string[];
}

/**
 * Compute which tables are occupied at a specific timestamp.
 *
 * @param occupancies - Pre-computed occupancy data
 * @param targetTime - Epoch ms timestamp to check
 * @returns Map of tableId -> occupancy info for occupied tables
 */
export function computeTableOccupancyAtTime(
  occupancies: OrderOccupancy[],
  targetTime: number,
): Map<string, TableOccupancyInfo> {
  const result = new Map<string, TableOccupancyInfo>();

  for (const occ of occupancies) {
    // Check if this reservation is active at the target time
    if (targetTime >= occ.startTime && targetTime < occ.endTime) {
      for (const tableId of occ.tableIds) {
        // Only set if not already occupied (first match wins in case of conflicts)
        if (!result.has(tableId)) {
          result.set(tableId, {
            orderId: occ.orderId,
            partySize: occ.partySize,
            customerName: occ.customerName,
            seatingStatus: occ.seatingStatus,
            linkedTableIds: occ.tableIds.filter((id) => id !== tableId),
          });
        }
      }
    }
  }

  return result;
}

/**
 * Get the time range for a day based on operating hours and occupancies.
 * TODO: use DateFns instead of raw Date methods, use WDateUtils where possible, namely to get operating hours
 * @param operatingHours - Union of operating hour intervals for the day (in minutes since midnight)
 * @param occupancies - Occupancy data for the day
 * @param dateString - Date string (YYYYMMDD format)
 * @returns Start/end epoch ms based on operating hours (expanded to include all occupancies)
 */
export function getTimeRangeForOccupancies(
  operatingHours: Array<{ start: number; end: number }>,
  occupancies: OrderOccupancy[],
  dateString: string,
): { start: number; end: number } {
  // Parse YYYYMMDD to get start of day
  const dayStart = startOfDay(parseISO(dateString));

  // Get operating hours range (or default to 10 AM - 10 PM)
  let opStartMinutes = 10 * 60; // 10 AM
  let opEndMinutes = 22 * 60; // 10 PM

  if (operatingHours.length > 0) {
    opStartMinutes = Math.min(...operatingHours.map((h) => h.start));
    opEndMinutes = Math.max(...operatingHours.map((h) => h.end));
  }

  let minStartMs = addMinutes(dayStart, opStartMinutes).getTime();
  let maxEndMs = addMinutes(dayStart, opEndMinutes).getTime();

  // Extend range to include all occupancies
  for (const occ of occupancies) {
    if (occ.startTime < minStartMs) minStartMs = occ.startTime;
    if (occ.endTime > maxEndMs) maxEndMs = occ.endTime;
  }

  return { start: minStartMs, end: maxEndMs };
}
