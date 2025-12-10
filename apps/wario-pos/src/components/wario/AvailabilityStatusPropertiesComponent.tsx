import { endOfDay, getTime } from 'date-fns';
import { useMemo } from 'react';

import { FormControl, Grid, InputLabel, MenuItem, Select } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';

import type { IWInterval } from '@wcp/wario-shared';
import { type ValSetVal } from '@wcp/wario-ux-shared/common';
import { useCurrentTime } from '@wcp/wario-ux-shared/query';

export type AvailabilityStatusPropertiesComponentProps = {
  disabled: boolean;
} & ValSetVal<IWInterval | null>;

enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE', // value === null. Product is enabled.
  DISABLED_INDEFINITELY = 'DISABLED_INDEFINITELY', // value === { start: 1, end: 0 }
  DISABLED_RANGE = 'DISABLED_RANGE', // value !== null && start <= end
}

export const AvailabilityStatusPropertiesComponent = (props: AvailabilityStatusPropertiesComponentProps) => {
  const currentTime = useCurrentTime();

  // Derive status from value
  const status = useMemo(() => {
    if (props.value === null) return AvailabilityStatus.AVAILABLE;
    if (props.value.start > props.value.end) return AvailabilityStatus.DISABLED_INDEFINITELY;
    return AvailabilityStatus.DISABLED_RANGE;
  }, [props.value]);

  const handleStatusChange = (newStatus: AvailabilityStatus) => {
    if (newStatus === AvailabilityStatus.AVAILABLE) {
      props.setValue(null);
    } else if (newStatus === AvailabilityStatus.DISABLED_INDEFINITELY) {
      props.setValue({ start: 1, end: 0 });
    } else {
      // Default range: Now to End of Day
      props.setValue({ start: currentTime, end: getTime(endOfDay(currentTime)) });
    }
  };

  const updateDisabledStart = (start: Date | number) => {
    if (props.value) {
      props.setValue({ ...props.value, start: getTime(start) });
    }
  };

  const updateDisabledEnd = (end: Date | number) => {
    if (props.value) {
      props.setValue({ ...props.value, end: getTime(end) });
    }
  };

  return (
    <Grid container spacing={2}>
      {/* Status Dropdown */}
      <Grid size={12}>
        <FormControl fullWidth disabled={props.disabled}>
          <InputLabel>Product Status</InputLabel>
          <Select
            label="Product Status"
            value={status}
            onChange={(e) => {
              handleStatusChange(e.target.value as AvailabilityStatus);
            }}
          >
            <MenuItem value={AvailabilityStatus.AVAILABLE}>Available</MenuItem>
            <MenuItem value={AvailabilityStatus.DISABLED_INDEFINITELY}>Disabled (Indefinitely)</MenuItem>
            <MenuItem value={AvailabilityStatus.DISABLED_RANGE}>Disabled (Date Range)</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* Date Pickers (Only visible if DISABLED_RANGE) */}
      {status === AvailabilityStatus.DISABLED_RANGE && props.value && (
        <>
          <Grid size={6}>
            <DateTimePicker
              label="Disable Start"
              disablePast
              value={props.value.start}
              onChange={(date: Date | number | null) => {
                if (date !== null) updateDisabledStart(date);
              }}
              format="MMM dd, y hh:mm a"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid size={6}>
            <DateTimePicker
              label="Disable End"
              disablePast
              minDateTime={props.value.start}
              value={props.value.end}
              onChange={(date: Date | number | null) => {
                if (date !== null) updateDisabledEnd(date);
              }}
              format="MMM dd, y hh:mm a"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
        </>
      )}
    </Grid>
  );
};
