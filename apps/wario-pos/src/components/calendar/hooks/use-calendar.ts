import type { CalendarApi, DateSelectArg, EventClickArg, ViewApi } from '@fullcalendar/core';
import type FullCalendar from '@fullcalendar/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Breakpoint } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import type { ICalendarRange, ICalendarView } from '../types';

// ----------------------------------------------------------------------

export type DateNavigationAction = 'today' | 'prev' | 'next';

export type UseCalendarReturn = {
  openForm: boolean;
  view: ICalendarView;
  title: ViewApi['title'];
  selectedEventId: string;
  selectedRange: ICalendarRange | null;
  calendarRef: React.RefObject<FullCalendar | null>;
  onOpenForm: () => void;
  onCloseForm: () => void;
  getCalendarApi: () => CalendarApi | null;
  onClickEvent: (arg: EventClickArg) => void;
  onSelectRange: (arg: DateSelectArg) => void;
  onChangeView: (view: ICalendarView) => void;
  onClickEventInFilters: (eventId: string) => void;
  onDateNavigation: (action: DateNavigationAction) => void;
};

export type UseCalendarProps = {
  breakpoint?: Breakpoint;
  defaultMobileView?: ICalendarView;
  defaultDesktopView?: ICalendarView;
};

export function useCalendar({
  breakpoint = 'sm',
  defaultMobileView = 'listWeek',
  defaultDesktopView = 'dayGridMonth',
}: UseCalendarProps = {}): UseCalendarReturn {
  const calendarRef = useRef<FullCalendar>(null);
  const smUp = useMediaQuery((theme) => theme.breakpoints.up(breakpoint));

  const [openForm, setOpenForm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedRange, setSelectedRange] = useState<ICalendarRange>(null);

  const [title, setTitle] = useState<ViewApi['title']>('');
  const [view, setView] = useState<ICalendarView>(defaultDesktopView);
  const [lastDesktopView, setLastDesktopView] = useState<ICalendarView>(defaultDesktopView);

  const getCalendarApi = useCallback(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) {
      console.warn('Calendar API is not available');
      return null;
    }
    return calendarApi;
  }, []);

  const onOpenForm = useCallback(() => {
    setOpenForm(true);
  }, []);

  const onCloseForm = useCallback(() => {
    setOpenForm(false);
    setSelectedRange(null);
    setSelectedEventId('');
  }, []);

  const syncView = useCallback(() => {
    const calendarApi = getCalendarApi();
    if (!calendarApi) return;

    const targetView = smUp ? lastDesktopView : defaultMobileView;

    if (targetView !== calendarApi.view.type) {
      calendarApi.changeView(targetView);
      setView(targetView);
    }

    if (title !== calendarApi.view.title) {
      setTitle(calendarApi.view.title);
    }
  }, [defaultMobileView, getCalendarApi, lastDesktopView, smUp, title]);

  useEffect(() => {
    syncView();
  }, [syncView]);

  const onChangeView = useCallback(
    (newView: ICalendarView) => {
      const calendarApi = getCalendarApi();
      if (!calendarApi) return;

      if (smUp) {
        setLastDesktopView(newView);
      }

      calendarApi.changeView(newView);
      setView(newView);
    },
    [getCalendarApi, smUp],
  );

  const onDateNavigation = useCallback(
    (action: DateNavigationAction) => {
      const calendarApi = getCalendarApi();
      if (!calendarApi) return;

      switch (action) {
        case 'today':
          calendarApi.today();
          break;
        case 'prev':
          calendarApi.prev();
          break;
        case 'next':
          calendarApi.next();
          break;
        default:
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          console.warn(`Unknown action: ${action}`);
          return;
      }

      setTitle(calendarApi.view.title);
    },
    [getCalendarApi],
  );

  const onSelectRange = useCallback(
    (arg: DateSelectArg) => {
      const calendarApi = getCalendarApi();
      if (!calendarApi) return;

      calendarApi.unselect();
      onOpenForm();
      setSelectedRange({ start: arg.start, end: arg.end });
    },
    [getCalendarApi, onOpenForm],
  );

  const onClickEvent = useCallback(
    (arg: EventClickArg) => {
      const { event } = arg;

      onOpenForm();
      setSelectedEventId(event.id);
    },
    [onOpenForm],
  );

  const onClickEventInFilters = useCallback(
    (eventId: string) => {
      if (eventId) {
        onOpenForm();
        setSelectedEventId(eventId);
      }
    },
    [onOpenForm],
  );

  return {
    calendarRef,
    getCalendarApi,
    /********/
    view,
    title,
    /********/
    onClickEvent,
    onChangeView,
    onSelectRange,
    onDateNavigation,
    /********/
    openForm,
    onOpenForm,
    onCloseForm,
    /********/
    selectedRange,
    selectedEventId,
    /********/
    onClickEventInFilters,
  };
}
