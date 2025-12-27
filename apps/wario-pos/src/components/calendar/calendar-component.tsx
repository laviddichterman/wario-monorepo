import type { BusinessHoursInput, DatesSetArg, EventClickArg } from '@fullcalendar/core/';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import Calendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
// import { startTransition } from 'react';
import timelinePlugin from '@fullcalendar/timeline';

import { Box, Drawer, IconButton, Typography } from '@mui/material';
import Card from '@mui/material/Card';
import type { SxProps, Theme } from '@mui/material/styles';

import { useBoolean } from '@/hooks/useBoolean';
import { useSetState } from '@/hooks/useSetState';

import { fIsAfter, fIsBetween } from '@/utils/dateFunctions';

import { Iconify } from '@/components/iconify';

import { useTranslate } from '@/locales';

import { CalendarFilters } from './calendar-filters';
import { CalendarToolbar } from './calendar-toolbar';
import { useCalendar } from './hooks/use-calendar';
import { CalendarRoot } from './styles';
import type { ICalendarEvent, ICalendarFilters, ICalendarView } from './types';

// ----------------------------------------------------------------------

export type CalendarProps = {
  events: ICalendarEvent[];
  eventsLoading: boolean;
  initialDate?: Date | string | number;
  initialView?: ICalendarView;
  eventById: (id: string) => ICalendarEvent | undefined;
  /** Optional component to render a custom title in the drawer header. Receives eventId. */
  DrawerTitle?: React.ComponentType<{ eventId: string }>;
  CalendarForm: React.ComponentType<{
    currentEvent: ICalendarEvent | null;
    onClose: () => void;
  }>;
  updateEvent: (event: Partial<ICalendarEvent>) => void;
  businessHours?: BusinessHoursInput;
  datesSet?: (arg: DatesSetArg) => void;
  onEventClick?: (arg: EventClickArg) => void; // Optional override
  disableDrawer?: boolean; // Optional flag to disable built-in drawer
  /** Optional slot for custom controls to render in the toolbar */
  toolbarSlot?: React.ReactNode;
};

export function CalendarComponent({
  events,
  eventsLoading,
  initialDate,
  initialView,
  CalendarForm,
  eventById,
  DrawerTitle,
  businessHours,
  datesSet,
  onEventClick,
  disableDrawer = false,
  toolbarSlot,
}: CalendarProps) {
  // const currentEvent = useCallback((id: string) => eventById(id), [eventById]);
  const openFilters = useBoolean();

  const filters = useSetState<ICalendarFilters>({ startDate: null, endDate: null });
  const { state: currentFilters } = filters;

  const dateError = fIsAfter(currentFilters.startDate, currentFilters.endDate);

  const {
    calendarRef,
    /********/
    view,
    title,
    /********/
    // onDropEvent,
    onChangeView,
    onSelectRange,
    onClickEvent,
    // onResizeEvent,
    onDateNavigation,
    /********/
    openForm,
    onCloseForm,
    /********/
    // selectedRange,
    selectedEventId,
    /********/
    onClickEventInFilters,
  } = useCalendar({ defaultDesktopView: initialView, defaultMobileView: initialView });
  const { currentLang } = useTranslate();

  const canReset = !!currentFilters.startDate && !!currentFilters.endDate;

  const dataFiltered = applyFilter({
    inputData: events,
    filters: currentFilters,
    dateError,
  });

  const flexStyles: SxProps<Theme> = {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
  };

  const renderOrderDrawer = () => {
    if (disableDrawer) return null;
    return (
      <Drawer
        anchor="right"
        open={openForm}
        onClose={onCloseForm}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 480 },
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6">
            {DrawerTitle ? <DrawerTitle eventId={selectedEventId} /> : eventById(selectedEventId)?.title}
          </Typography>
          <IconButton onClick={onCloseForm} edge="end">
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          <CalendarForm currentEvent={eventById(selectedEventId) ?? null} onClose={onCloseForm} />
        </Box>
      </Drawer>
    );
  };

  const renderFiltersDrawer = () => (
    <CalendarFilters
      events={events}
      filters={filters}
      canReset={canReset}
      dateError={dateError}
      open={openFilters.value}
      onClose={openFilters.onFalse}
      onClickEvent={onClickEventInFilters}
    />
  );

  return (
    <>
      <Card sx={{ ...flexStyles, minHeight: '50vh' }}>
        <CalendarRoot sx={{ ...flexStyles }}>
          <CalendarToolbar
            view={view}
            title={title}
            canReset={canReset}
            loading={eventsLoading}
            onChangeView={onChangeView}
            onDateNavigation={onDateNavigation}
            onOpenFilters={openFilters.onTrue}
            toolbarSlot={toolbarSlot}
            filterProps={{ filters: filters, totalResults: dataFiltered.length, sx: { mb: { xs: 3, md: 5 } } }}
            viewOptions={[
              { value: 'dayGridMonth', label: 'Month', icon: 'mingcute:calendar-month-line' },
              { value: 'timeGridWeek', label: 'Week', icon: 'mingcute:calendar-week-line' },
              { value: 'timeGridDay', label: 'Day', icon: 'mingcute:calendar-day-line' },
              { value: 'listWeek', label: 'Agenda', icon: 'custom:calendar-agenda-outline' },
            ]}
          />

          <Calendar
            weekends
            // editable
            // droppable
            selectable
            allDayMaintainDuration
            // eventResizableFromStart
            firstDay={1}
            aspectRatio={3}
            locales={[esLocale]}
            locale={currentLang.value === 'es' ? 'es' : 'en-us'}
            dayMaxEvents={3}
            eventMaxStack={2}
            rerenderDelay={10}
            headerToolbar={false}
            eventDisplay="block"
            ref={calendarRef}
            initialView={view}
            initialDate={initialDate}
            events={dataFiltered}
            select={onSelectRange}
            eventClick={onEventClick || onClickEvent}
            businessHours={businessHours}
            datesSet={datesSet}
            scrollTimeReset={false}
            // eventDrop={(arg) => {
            //   startTransition(() => {
            //     onDropEvent(arg, updateEvent);
            //   });
            // }}
            // eventResize={(arg) => {
            //   startTransition(() => {
            //     onResizeEvent(arg, updateEvent);
            //   });
            // }}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, timelinePlugin]}
          />
        </CalendarRoot>
      </Card>

      {renderOrderDrawer()}
      {renderFiltersDrawer()}
    </>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  dateError: boolean;
  filters: ICalendarFilters;
  inputData: ICalendarEvent[];
};

function applyFilter({ inputData, filters, dateError }: ApplyFilterProps) {
  const { startDate, endDate } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  inputData = stabilizedThis.map((el) => el[0]);

  if (!dateError) {
    if (startDate && endDate) {
      inputData = inputData.filter((event) => fIsBetween(event.start, startDate, endDate));
    }
  }

  return inputData;
}
