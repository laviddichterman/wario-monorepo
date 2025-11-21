
// sections
import { useAppSelector } from '@/hooks/useRedux';

import { CalendarComponent } from '@/components/calendar/calendar-component';
import type { ICalendarView } from '@/components/calendar/types';
import { WOrderComponentCard } from '@/components/wario/orders/WOrderComponentCard';

import { getWOrderInstanceById } from '@/redux/slices/OrdersSlice';
import { selectOrderAsEvent, selectOrdersAsEvents } from '@/redux/store';


// ----------------------------------------------------------------------

export type OrderCalendarProps = {
  initialView?: ICalendarView;
  handleConfirmOrder: (id: string) => void;
}

export function OrderCalendar({ initialView, handleConfirmOrder }: OrderCalendarProps) {
  const currentTime = useAppSelector(s => s.ws.currentTime);

  const orders = useAppSelector(selectOrdersAsEvents);
  const selectOrderById = useAppSelector(s => (id: string) => id ? selectOrderAsEvent(s, getWOrderInstanceById(s.orders.orders, id)) : undefined);

  return (
    <CalendarComponent
      events={orders}
      eventsLoading={false}
      initialDate={currentTime}
      initialView={initialView}
      eventById={selectOrderById}
      updateEvent={() => undefined}
      CalendarForm={({ currentEvent, onClose }) => {
        return currentEvent && <WOrderComponentCard orderId={currentEvent.id} handleConfirmOrder={handleConfirmOrder} onCloseCallback={onClose} />;
      }}
    />

  );
}
