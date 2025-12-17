import type { BusinessHoursInput, DatesSetArg } from '@fullcalendar/core';
import { useCallback, useMemo, useRef, useState } from 'react';

import { DateTimeIntervalBuilder, WDateUtils, WOrderStatus } from '@wcp/wario-shared/logic';
import { useFulfillments } from '@wcp/wario-ux-shared/query';

import { useOrdersQuery } from '@/hooks/useOrdersQuery';

import { CalendarComponent } from '@/components/calendar/calendar-component';
import type { ICalendarEvent, ICalendarRange, ICalendarView } from '@/components/calendar/types';
import { WOrderComponentCard } from '@/components/wario/orders/WOrderComponentCard';

/**
 * Converts minutes from midnight to a time string in HH:MM format
 */
function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export type OrderCalendarProps = {
  initialView?: ICalendarView;
  handleConfirmOrder: (id: string) => void;
};

export function OrderCalendar({ initialView, handleConfirmOrder }: OrderCalendarProps) {
  const [activeRange, setActiveRange] = useState<ICalendarRange>(null);
  const fulfillments = useFulfillments();

  // Capture the initial date only once on mount to prevent scroll position resets
  const initialDateRef = useRef<number>(Date.now());

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setActiveRange({ start: arg.start, end: arg.end });
  }, []);

  const queryOptions = useMemo(
    () =>
      activeRange
        ? {
            date: new Date(activeRange.start).toISOString(),
            endDate: new Date(activeRange.end).toISOString(),
          }
        : null,
    [activeRange],
  );

  const { data: ordersMap = {} } = useOrdersQuery(queryOptions);

  // Compute business hours from fulfillment configs
  // For each day of the week, get the union of operating hours across all fulfillments
  const businessHours: BusinessHoursInput = useMemo(() => {
    if (fulfillments.length === 0) {
      return false; // No business hours to display
    }

    const result: { daysOfWeek: number[]; startTime: string; endTime: string }[] = [];
    const today = new Date();
    const isoDate = WDateUtils.formatISODate(today);

    // Compute operating hours for each day of the week (0 = Sunday, 6 = Saturday)
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const intervals = WDateUtils.GetOperatingHoursForServicesAndDate(
        fulfillments,
        isoDate,
        dayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      );

      // Convert each interval to FullCalendar format
      for (const interval of intervals) {
        result.push({
          daysOfWeek: [dayIndex],
          startTime: minutesToTimeString(interval.start),
          endTime: minutesToTimeString(interval.end),
        });
      }
    }

    return result.length > 0 ? result : false;
  }, [fulfillments]);

  const ordersAsEvents: ICalendarEvent[] = useMemo(
    () =>
      Object.values(ordersMap)
        .filter((order) => order.status !== WOrderStatus.CANCELED)
        .map((order) => {
          // Default maxDuration to 30 since getFulfillmentById is missing
          const maxDuration = 30;
          const dateTimeInterval = DateTimeIntervalBuilder(order.fulfillment, maxDuration);
          return {
            id: order.id,
            title: `${order.customerInfo.givenName} ${order.customerInfo.familyName} `,
            allDay: false,
            start: dateTimeInterval.start,
            end: dateTimeInterval.end,
          };
        }),
    [ordersMap],
  );

  const getEventById = useCallback((id: string) => ordersAsEvents.find((x) => x.id === id), [ordersAsEvents]);

  return (
    <CalendarComponent
      events={ordersAsEvents}
      eventsLoading={false}
      initialDate={initialDateRef.current}
      initialView={initialView}
      eventById={getEventById}
      updateEvent={() => undefined}
      businessHours={businessHours}
      CalendarForm={({ currentEvent, onClose }) => {
        return (
          currentEvent && (
            <WOrderComponentCard
              orderId={currentEvent.id}
              handleConfirmOrder={handleConfirmOrder}
              onCloseCallback={onClose}
            />
          )
        );
      }}
      datesSet={handleDatesSet}
    />
  );
}
