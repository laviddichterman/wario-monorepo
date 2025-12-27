import { add, formatISO, parseISO, startOfDay } from 'date-fns';
import { useCallback, useEffect, useMemo } from 'react';

import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';

import { WDateUtils } from '@wcp/wario-shared/logic';
import { useServerTime } from '@wcp/wario-ux-shared/query';

import {
  useCartBasedLeadTime,
  useNextAvailableServiceDateTimeForSelectedOrDefaultFulfillment,
  useOptionsForFulfillmentAndDate,
  useSelectedFulfillment,
} from '@/hooks/useDerivedState';

import { useFulfillmentStore } from '@/stores/useFulfillmentStore';
import { useMetricsStore } from '@/stores/useMetricsStore';

function useHasOptionsForSameDay() {
  const selectedService = useFulfillmentStore((s) => s.selectedService);
  const { currentTime } = useServerTime();
  const options = useOptionsForFulfillmentAndDate(
    formatISO(currentTime, { representation: 'date' }),
    selectedService || '',
  );
  return options.length > 0;
}

export default function FulfillmentDateTimeSelector() {
  const selectedService = useFulfillmentStore((s) => s.selectedService);
  const selectedDate = useFulfillmentStore((s) => s.selectedDate);
  const selectedTime = useFulfillmentStore((s) => s.selectedTime);
  const hasSelectedTimeExpired = useFulfillmentStore((s) => s.hasSelectedTimeExpired);
  const setDate = useFulfillmentStore((s) => s.setDate);
  const setTime = useFulfillmentStore((s) => s.setTime);
  const setTimeToServiceDate = useMetricsStore((s) => s.setTimeToServiceDate);
  const setTimeToServiceTime = useMetricsStore((s) => s.setTimeToServiceTime);

  const fulfillment = useSelectedFulfillment();
  const cartBasedLeadTime = useCartBasedLeadTime();
  const { currentTime } = useServerTime();
  const nextAvailableDateTime = useNextAvailableServiceDateTimeForSelectedOrDefaultFulfillment();
  const hasOptionsForSameDay = useHasOptionsForSameDay();

  // Get options for the currently selected date
  const optionsForSelectedDate = useOptionsForFulfillmentAndDate(
    selectedDate || formatISO(currentTime, { representation: 'date' }),
    selectedService || '',
  );

  const timeOptions = useMemo(() => {
    return optionsForSelectedDate.reduce<{ [index: number]: { value: number; disabled: boolean } }>(
      (acc, v) => ({ ...acc, [v.value]: v }),
      {},
    );
  }, [optionsForSelectedDate]);

  // Callback to check if a date has available options
  const hasOptionsForDate = useCallback(
    (date: Date): boolean => {
      if (!selectedService || !fulfillment) return false;
      const dateStr = formatISO(date, { representation: 'date' });
      const infoMap = WDateUtils.GetInfoMapForAvailabilityComputation([fulfillment], dateStr, cartBasedLeadTime);
      const options = WDateUtils.GetOptionsForDate(infoMap, dateStr, formatISO(currentTime));
      return options.length > 0;
    },
    [selectedService, fulfillment, cartBasedLeadTime, currentTime],
  );

  const onSetServiceDate = useCallback(
    (v: Date | number | null) => {
      if (v !== null) {
        const serviceDateString = WDateUtils.formatISODate(v);
        // Check if the selected service time is valid in the new service date
        if (selectedTime !== null) {
          if (!selectedService || !fulfillment) {
            setTime(null);
          } else {
            const infoMap = WDateUtils.GetInfoMapForAvailabilityComputation(
              [fulfillment],
              serviceDateString,
              cartBasedLeadTime,
            );
            const newDateOptions = WDateUtils.GetOptionsForDate(infoMap, serviceDateString, formatISO(currentTime));
            const foundServiceTimeOption = newDateOptions.findIndex((x) => x.value === selectedTime);
            if (foundServiceTimeOption === -1) {
              setTime(null);
            }
          }
        }
        setDate(serviceDateString);
        setTimeToServiceDate(Date.now());
      }
    },
    [
      selectedTime,
      setDate,
      setTime,
      setTimeToServiceDate,
      selectedService,
      fulfillment,
      cartBasedLeadTime,
      currentTime,
    ],
  );

  const onSetServiceTime = useCallback(
    (v: number | null) => {
      setTime(v);
      if (v !== null) {
        setTimeToServiceTime(Date.now());
      }
    },
    [setTime, setTimeToServiceTime],
  );

  // If the service date is null and there are options for the same day, set the service date to the current time
  useEffect(() => {
    if (selectedDate === null && hasOptionsForSameDay) {
      onSetServiceDate(currentTime);
    }
  }, [selectedDate, hasOptionsForSameDay, currentTime, onSetServiceDate]);

  if (selectedService === null) return null;

  const minDate = startOfDay(parseISO(nextAvailableDateTime.selectedDate));
  const maxDate = add(currentTime, { days: 6 });
  const timeOptionsArray = Object.values(timeOptions);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 2,
        width: '100%',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontFamily: 'Source Sans Pro',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 600,
          mb: 2,
          color: 'text.secondary',
        }}
      >
        Select Date & Time
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          alignItems: 'center',
        }}
      >
        {/* Calendar Section */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <StaticDatePicker
              displayStaticWrapperAs="desktop"
              openTo="day"
              disableHighlightToday={!hasOptionsForSameDay}
              disablePast
              minDate={minDate}
              maxDate={maxDate}
              shouldDisableDate={(date: Date) => !hasOptionsForDate(date)}
              value={selectedDate ? parseISO(selectedDate) : null}
              onChange={onSetServiceDate}
              slotProps={{ actionBar: { actions: [] } }}
            />
          </LocalizationProvider>
        </Box>
        {/* Time Selection */}
        <Autocomplete
          sx={{
            width: { xs: '100%', sm: 300 },
            maxWidth: '100%',
          }}
          openOnFocus
          disableClearable
          noOptionsText={'Select an available service date first'}
          id="service-time"
          options={timeOptionsArray.map((x) => x.value)}
          getOptionDisabled={(o) => timeOptionsArray.find((x) => x.value === o)?.disabled ?? true}
          isOptionEqualToValue={(o, v) => o === v}
          getOptionLabel={(o) => (o ? WDateUtils.MinutesToPrintTime(o) : '')}
          // @ts-expect-error needed to keep the component controlled. We get "MUI: A component is changing the uncontrolled value state of Autocomplete to be controlled." if switching to || undefined
          value={selectedTime || null}
          onChange={(_, v) => {
            onSetServiceTime(v);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Time"
              error={hasSelectedTimeExpired}
              helperText={
                hasSelectedTimeExpired
                  ? 'The previously selected service time has expired.'
                  : 'Please note this time can change depending on what you order. Times are confirmed after orders are sent.'
              }
            />
          )}
        />
      </Box>
    </Paper>
  );
}
