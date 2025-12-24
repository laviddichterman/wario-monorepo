import type { BusinessHoursInput, DatesSetArg } from '@fullcalendar/core';
import { useSetAtom } from 'jotai';
import { useCallback, useMemo, useRef, useState } from 'react';

import {
  DateTimeIntervalBuilder,
  EventTitleStringBuilder,
  GenerateCategoryOrderList,
  RebuildAndSortCart,
  WDateUtils,
  WOrderStatus,
} from '@wcp/wario-shared/logic';
import { useCatalogSelectors, useFulfillments } from '@wcp/wario-ux-shared/query';

import { useEventTitleStringForOrder, useOrderById, useOrdersQuery } from '@/hooks/useOrdersQuery';

import { CalendarComponent } from '@/components/calendar/calendar-component';
import type { ICalendarEvent, ICalendarRange, ICalendarView } from '@/components/calendar/types';
import { WOrderDrawerContent } from '@/components/wario/orders/WOrderDrawerContent';

import { orderDrawerAtom } from '@/atoms/drawerState';

// Component that computes the event title using hooks
function OrderDrawerTitle({ eventId }: { eventId: string }) {
  const order = useOrderById(eventId);
  const title = useEventTitleStringForOrder(order);
  return <>{title || 'Loading...'}</>;
}

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
};

// Helper component to wrap WOrderDrawerContent for use as CalendarForm
function OrderDrawerWrapper({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  return <WOrderDrawerContent orderId={orderId} onClose={onClose} key={orderId} />;
}

export function OrderCalendar({ initialView }: OrderCalendarProps) {
  const [activeRange, setActiveRange] = useState<ICalendarRange>(null);
  const fulfillments = useFulfillments();
  const catalogSelectors = useCatalogSelectors();

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

  const fulfillmentCategoryMaps = useMemo(() => {
    if (!catalogSelectors || fulfillments.length === 0) return {};

    const map: Record<string, Record<string, number>> = {};

    for (const fulfillment of fulfillments) {
      const fulfillmentMainCategory = fulfillment.orderBaseCategoryId;
      const fulfillmentSecondaryCategory = fulfillment.orderSupplementaryCategoryId as string | undefined;

      const categoryOrderArrayMain = GenerateCategoryOrderList(fulfillmentMainCategory, catalogSelectors.category);
      const categoryOrderArraySecondary = fulfillmentSecondaryCategory
        ? GenerateCategoryOrderList(fulfillmentSecondaryCategory, catalogSelectors.category)
        : [];

      map[fulfillment.id] = Object.fromEntries(
        [...categoryOrderArrayMain, ...categoryOrderArraySecondary].map((x, i) => [x, i]),
      );
    }
    return map;
  }, [catalogSelectors, fulfillments]);

  const ordersAsEvents: ICalendarEvent[] = useMemo(
    () =>
      Object.values(ordersMap)
        .filter((order) => order.status !== WOrderStatus.CANCELED)
        .map((order) => {
          // Find the fulfillment config to get the correct maxDuration
          const fulfillment = fulfillments.find((f) => f.id === order.fulfillment.selectedService);
          const maxDuration = fulfillment?.maxDuration ?? 30;
          const dateTimeInterval = DateTimeIntervalBuilder(order.fulfillment, maxDuration);

          let title = `${order.customerInfo.givenName} ${order.customerInfo.familyName} `;

          if (catalogSelectors && fulfillment) {
            const orderMap = fulfillmentCategoryMaps[fulfillment.id] as Record<string, number> | undefined;
            if (orderMap) {
              const serviceTime = WDateUtils.ComputeServiceDateTime(order.fulfillment);
              const cart = RebuildAndSortCart(
                order.cart,
                catalogSelectors,
                serviceTime,
                order.fulfillment.selectedService,
              );
              title = EventTitleStringBuilder(
                catalogSelectors,
                orderMap,
                fulfillment,
                title,
                order.fulfillment,
                cart,
                order.specialInstructions ?? '',
              );
            }
          }

          return {
            id: order.id,
            title,
            allDay: false,
            start: dateTimeInterval.start,
            end: dateTimeInterval.end,
          };
        }),
    [ordersMap, catalogSelectors, fulfillments, fulfillmentCategoryMaps],
  );

  const getEventById = useCallback((id: string) => ordersAsEvents.find((x) => x.id === id), [ordersAsEvents]);

  // Memoize CalendarForm component to prevent remounting on parent re-renders
  const CalendarFormComponent = useMemo(
    () =>
      function CalendarForm({ currentEvent, onClose }: { currentEvent: ICalendarEvent | null; onClose: () => void }) {
        return currentEvent ? <OrderDrawerWrapper orderId={currentEvent.id} onClose={onClose} /> : null;
      },
    [],
  );

  const setDrawerState = useSetAtom(orderDrawerAtom);

  return (
    <CalendarComponent
      events={ordersAsEvents}
      eventsLoading={false}
      initialDate={initialDateRef.current}
      initialView={initialView}
      eventById={getEventById}
      DrawerTitle={OrderDrawerTitle}
      updateEvent={() => undefined}
      businessHours={businessHours}
      CalendarForm={CalendarFormComponent}
      datesSet={handleDatesSet}
      disableDrawer={true}
      onEventClick={(arg) => {
        setDrawerState({ orderId: arg.event.id, isOpen: true });
      }}
    />
  );
}
