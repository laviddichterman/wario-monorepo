import { endOfDay, getTime } from 'date-fns';

import { Grid } from "@mui/material";
import { DateTimePicker } from '@mui/x-date-pickers';

import type { IWInterval } from "@wcp/wario-shared";
import { type ValSetVal } from '@wcp/wario-ux-shared/common';
import { useCurrentTime } from '@wcp/wario-ux-shared/query';

import { ToggleBooleanPropertyComponent } from "./property-components/ToggleBooleanPropertyComponent";

export type DatetimeBasedDisableComponentProps = {
  disabled: boolean;
} & ValSetVal<IWInterval | null>;

export const IsDisableValueValid = (value: IWInterval | null) =>
  value === null || (value.start === 1 && value.end === 0) || (value.start <= value.end);

const DatetimeBasedDisableComponent = (props: DatetimeBasedDisableComponentProps) => {
  const currentTime = useCurrentTime();

  const updateDisabledStart = (start: Date | number) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    props.setValue({ ...props.value!, start: getTime(start) });
  };

  const updateDisabledEnd = (end: Date | number) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    props.setValue({ ...props.value!, end: getTime(end) });
  };

  return (
    <Grid container spacing={2}>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={props.disabled}
          label="Enabled"
          value={props.value === null}
          setValue={(enable) => { props.setValue(enable ? null : { start: 1, end: 0 }); }}
          labelPlacement='end'
        />
      </Grid>
      {props.value !== null &&
        <Grid size={6}>
          <ToggleBooleanPropertyComponent
            disabled={props.disabled}
            label="Blanket Disable"
            value={props.value.start > props.value.end}
            setValue={(isBlanket) => {
              props.setValue(isBlanket ?
                { start: 1, end: 0 } :
                { start: currentTime, end: getTime(endOfDay(currentTime)) });
            }}
            labelPlacement='end'
          />
        </Grid>
      }
      {(props.value !== null && (props.value.start <= props.value.end)) &&
        <>
          <Grid size={6}>
            <DateTimePicker
              label="Disabled Start"
              disablePast
              value={props.value.start}
              onChange={(date: Date | number | null) => { if (date !== null) updateDisabledStart(date); }}
              format="MMM dd, y hh:mm a"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid size={6}>
            <DateTimePicker
              label="Disabled End"
              disablePast
              minDateTime={props.value.start}
              value={props.value.end}
              onChange={(date: Date | number | null) => { if (date !== null) updateDisabledEnd(date); }}
              format="MMM dd, y hh:mm a"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
        </>
      }
    </Grid>
  );
};

export default DatetimeBasedDisableComponent;
