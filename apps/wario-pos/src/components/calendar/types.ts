import type { EventInput } from '@fullcalendar/core';

import type { InferType } from '@wcp/wario-shared';

import type { IDatePickerControl } from '@/types/common';

export type ICalendarFilters = {
  startDate: IDatePickerControl;
  endDate: IDatePickerControl;
};

export type ICalendarDate = Date | number;

export type ICalendarRange = {
  start: ICalendarDate;
  end: ICalendarDate;
} | null;

export type ListView = 'list' | 'listDay' | 'listWeek' | 'listMonth' | 'listYear';
export type DayGridView = 'dayGrid' | 'dayGridDay' | 'dayGridWeek' | 'dayGridMonth' | 'dayGridYear';
export type TimeGridView = 'timeGrid' | 'timeGridDay' | 'timeGridWeek';
export type ICalendarView = ListView | DayGridView | TimeGridView;

export type ICalendarEvent = InferType<
  EventInput & {
    id: string;
    title: string;
    allDay: boolean;
    end: ICalendarDate;
    start: ICalendarDate;
  }
>;
