import { parseISO } from 'date-fns';
import React from 'react';

import Autocomplete from '@mui/material/Autocomplete';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';

import { WDateUtils } from '@wcp/wario-shared';

interface FulfillmentDateTimeSelectorProps {
  selectedDate: string | null;
  selectedTime: number | null;
  minDate: Date;
  maxDate: Date;
  hasOptionsForSameDay: boolean;
  shouldDisableDate: (date: Date) => boolean;
  timeOptions: { value: number; disabled: boolean }[];
  onDateChange: (date: Date | null) => void;
  onTimeChange: (time: number | null) => void;
  hasTimeExpired: boolean;
  hasServiceTerms: boolean;
  visible: boolean;
  children?: React.ReactNode;
}

export default function FulfillmentDateTimeSelector({
  selectedDate,
  selectedTime,
  minDate,
  maxDate,
  hasOptionsForSameDay,
  shouldDisableDate,
  timeOptions,
  onDateChange,
  onTimeChange,
  hasTimeExpired,
  hasServiceTerms,
  visible,
  children
}: FulfillmentDateTimeSelectorProps) {
  if (!visible) return null;

  return (
    <>
      <Grid
        sx={{ justifyContent: 'center', alignContent: 'center', display: 'flex', pb: 3 }}
        size={{
          xs: 12,
          xl: hasServiceTerms ? 6 : 4,
          lg: 6
        }}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <StaticDatePicker
            displayStaticWrapperAs="desktop"
            openTo="day"
            disableHighlightToday={!hasOptionsForSameDay}
            disablePast
            minDate={minDate}
            maxDate={maxDate}
            shouldDisableDate={shouldDisableDate}
            value={selectedDate ? parseISO(selectedDate) : null}
            onChange={onDateChange}
            slotProps={{ actionBar: { actions: [] } }}
          />
        </LocalizationProvider>
      </Grid>
      <Grid
        container
        sx={{ justifyContent: 'center', alignContent: 'center', display: 'flex' }}
        size={{
          xs: 12,
          xl: hasServiceTerms ? 6 : 4,
          lg: 6
        }}>
        <Grid sx={{ pb: 5 }} size={12}>
          <Autocomplete
            sx={{ justifyContent: 'center', alignContent: 'center', display: 'flex', width: 300, margin: 'auto' }}
            openOnFocus
            disableClearable
            noOptionsText={"Select an available service date first"}
            id="service-time"
            options={timeOptions.map(x => x.value)}
            getOptionDisabled={o => timeOptions.find(x => x.value === o)?.disabled ?? true}
            isOptionEqualToValue={(o, v) => o === v}
            getOptionLabel={o => o ? WDateUtils.MinutesToPrintTime(o) : ""}
            // @ts-expect-error needed to keep the component controlled. We get "MUI: A component is changing the uncontrolled value state of Autocomplete to be controlled." if switching to || undefined
            value={selectedTime || null}
            onChange={(_, v) => { onTimeChange(v); }}
            renderInput={(params) => <TextField {...params} label="Time" error={hasTimeExpired} helperText={hasTimeExpired ? "The previously selected service time has expired." : "Please note this time can change depending on what you order. Times are confirmed after orders are sent."} />}
          />
        </Grid>
        {children}
      </Grid>
    </>
  );
}
