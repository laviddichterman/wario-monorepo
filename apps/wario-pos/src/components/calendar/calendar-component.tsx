import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import Calendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
// import { startTransition } from 'react';
import timelinePlugin from '@fullcalendar/timeline';

import { DialogTitle } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { useBoolean } from '@/hooks/useBoolean';
import { useSetState } from '@/hooks/useSetState';

import { fIsAfter, fIsBetween } from '@/utils/dateFunctions';

import { Iconify } from '@/components/iconify';

import { useTranslate } from '@/locales';

import { CalendarFilters } from './calendar-filters';
import { CalendarFiltersResult } from './calendar-filters-result';
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
  CalendarForm: React.ComponentType<{
    currentEvent: ICalendarEvent | null;
    onClose: () => void;
  }>;
  updateEvent: (event: Partial<ICalendarEvent>) => void;
};

export function CalendarComponent({ events, eventsLoading, initialDate, initialView, CalendarForm, eventById }: CalendarProps) {
  const theme = useTheme();
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
    onOpenForm,
    onCloseForm,
    /********/
    // selectedRange,
    selectedEventId,
    /********/
    onClickEventInFilters,
  } = useCalendar({ defaultDesktopView: initialView, defaultMobileView: initialView });
  const { currentLang } = useTranslate();


  const canReset =
    (!!currentFilters.startDate && !!currentFilters.endDate);

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

  const renderCreateFormDialog = () => (
    <Dialog
      fullWidth
      // maxWidth="xs"
      open={openForm}
      onClose={onCloseForm}
      transitionDuration={{
        enter: theme.transitions.duration.shortest,
        exit: theme.transitions.duration.shortest - 80,
      }}
      slotProps={{
        paper: {
          sx: {
            display: 'flex',
            overflow: 'hidden',
            flexDirection: 'column',
            '& form': { ...flexStyles, minHeight: 0 },
          },
        },
      }}
    >
      <DialogTitle sx={{ minHeight: 76 }}>
        {openForm && <> {eventById(selectedEventId)?.title}  event</>}
      </DialogTitle>

      <CalendarForm
        currentEvent={eventById(selectedEventId) ?? null}
        onClose={onCloseForm}
      />
    </Dialog>
  );

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

  const renderResults = () => (
    <CalendarFiltersResult
      filters={filters}
      totalResults={dataFiltered.length}
      sx={{ mb: { xs: 3, md: 5 } }}
    />
  );

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: { xs: 3, md: 5 },
        }}
      >
        <Typography variant="h4">Calendar</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={onOpenForm}
        >
          Add event
        </Button>
      </Box>

      {canReset && renderResults()}

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
            eventClick={onClickEvent}
            // businessHours={{
            //   daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
            // }}
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

      {renderCreateFormDialog()}
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
