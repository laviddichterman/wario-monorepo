import { DateTimeIntervalBuilder, WOrderStatus } from '@wcp/wario-shared';
import { useServerTime } from '@wcp/wario-ux-shared/query';

import { useOrdersQuery } from '@/hooks/useOrdersQuery';

import { CalendarComponent } from '@/components/calendar/calendar-component';
import type { ICalendarEvent, ICalendarView } from '@/components/calendar/types';
import { WOrderComponentCard } from '@/components/wario/orders/WOrderComponentCard';

export type OrderCalendarProps = {
  initialView?: ICalendarView;
  handleConfirmOrder: (id: string) => void;
};

export function OrderCalendar({ initialView, handleConfirmOrder }: OrderCalendarProps) {
  const currentTime = useServerTime();

  const { data: ordersMap = {} } = useOrdersQuery(null);

  const ordersAsEvents: ICalendarEvent[] = Object.values(ordersMap)
    .filter((order) => order.status !== WOrderStatus.CANCELED)
    .map((order) => {
      // Default maxDuration to 30 since getFulfillmentById is missing
      const maxDuration = 30;
      const dateTimeInterval = DateTimeIntervalBuilder(order.fulfillment, maxDuration);
      return {
        id: order.id,
        title: `${order.customerInfo.givenName} ${order.customerInfo.familyName} `, // Simplified title
        allDay: false,
        start: dateTimeInterval.start,
        end: dateTimeInterval.end,
      };
    });

  const getEventById = (id: string) => ordersAsEvents.find((x) => x.id === id);

  return (
    <CalendarComponent
      events={ordersAsEvents}
      eventsLoading={false}
      initialDate={currentTime.currentTime || Date.now()}
      initialView={initialView}
      eventById={getEventById}
      updateEvent={() => undefined}
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
    />
  );
}
