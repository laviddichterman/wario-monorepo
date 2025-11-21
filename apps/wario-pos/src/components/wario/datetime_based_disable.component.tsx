import { endOfDay, getTime } from 'date-fns';

import { Grid } from "@mui/material";
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';

import type { IWInterval } from "@wcp/wario-shared";
import { SelectDateFnsAdapter, type ValSetVal } from '@wcp/wario-ux-shared';

import { useAppSelector } from "../../hooks/useRedux";

import { ToggleBooleanPropertyComponent } from "./property-components/ToggleBooleanPropertyComponent";

export type DatetimeBasedDisableComponentProps = {
  disabled: boolean;
} & ValSetVal<IWInterval | null>;

export const IsDisableValueValid = (value: IWInterval | null) =>
  value === null || (value.start === 1 && value.end === 0) || (value.start <= value.end);

const DatetimeBasedDisableComponent = (props: DatetimeBasedDisableComponentProps) => {
  const CURRENT_TIME = useAppSelector(s => s.ws.currentTime);
  const DateAdapter = useAppSelector(s => SelectDateFnsAdapter(s));

  const updateDisabledStart = (start: number) => {
    props.setValue({ ...props.value!, start: getTime(start) });
  };

  const updateDisabledEnd = (end: number) => {
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
            setValue={(isBlanket) => { props.setValue(isBlanket ?
              { start: 1, end: 0 } :
              { start: CURRENT_TIME, end: getTime(endOfDay(CURRENT_TIME)) }); }}
            labelPlacement='end'
          />
        </Grid>
      }
      {(props.value !== null && (props.value.start <= props.value.end)) &&
        <LocalizationProvider dateAdapter={DateAdapter}>
          <Grid size={6}>
            <DateTimePicker
              label="Disabled Start"
              disablePast
              value={props.value.start}
              onChange={(date) => date !== null && updateDisabledStart(date)}
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
              onChange={(date) => date !== null && updateDisabledEnd(date)}
              format="MMM dd, y hh:mm a"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
        </LocalizationProvider>}
    </Grid>
  );
};

export default DatetimeBasedDisableComponent;
