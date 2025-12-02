import { differenceInMinutes, format, isValid, setDay, setMilliseconds, setMinutes, setMonth, setSeconds, startOfDay, toDate } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { Frequency, RRule, Weekday } from 'rrule';

import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Autocomplete, FormControlLabel, Grid, IconButton, TextField, Typography } from "@mui/material";
import { DateTimePicker, TimePicker } from '@mui/x-date-pickers';

import { formatDecimal, type IRecurringInterval, type IWInterval, parseInteger, WDateUtils } from "@wcp/wario-shared";
import { type ValSetVal, type ValSetValNamed } from "@wcp/wario-ux-shared/common";
import { CheckedNumericInput } from '@wcp/wario-ux-shared/components';

import { IntNumericPropertyComponent } from './property-components/IntNumericPropertyComponent';
import { MappingEnumPropertyComponent } from './property-components/MappingEnumPropertyComponent';
import { ToggleBooleanPropertyComponent } from "./property-components/ToggleBooleanPropertyComponent";


export type RecurrenceRuleBuilderComponentProps =
  ValSetVal<IRecurringInterval | null> &
  ValSetValNamed<boolean, 'availabilityIsValid'> & {
    disabled: boolean;
  };

// if useRRule === false, 
// ... IWInterval.start represents the epoch start time or -1 if unbounded, IWInterval.end if -1 is unbounded otherwise IWInterval.end is the epoch end time of the availability
// ... IWInterval.rrule === ""
// if useRRule === true...
// ...IWInterval.start,end is the minutes from the matching day of the rule representing the minutes from the start/end of the day [start, end]
// ...IWInterval.rrule is the toString representation of the recurrence rule
// 

const RecurrenceRuleBuilderComponent = (props: RecurrenceRuleBuilderComponentProps) => {
  const { setAvailabilityIsValid, setValue } = props;
  const [isExpanded, setIsExpanded] = useState(false);
  const [useRRule, setUseRRule] = useState(props.value !== null && props.value.rrule !== "");
  const [localInterval, setLocalInterval] = useState<IWInterval>(props.value?.interval ?? { start: -1, end: -1 });
  const [frequency, setFreqency] = useState<Frequency>(props.value?.rrule ? RRule.fromString(props.value.rrule).options.freq : Frequency.WEEKLY);
  const [rInterval, setRInterval] = useState<number>(props.value?.rrule ? RRule.fromString(props.value.rrule).options.interval : 1);
  const [byWeekDay, setByWeekDay] = useState<Weekday[]>(props.value?.rrule ? RRule.fromString(props.value.rrule).options.byweekday.map(x => new Weekday(x)) : []);
  const [byMonth, setByMonth] = useState<number[]>(props.value?.rrule ? RRule.fromString(props.value.rrule).options.bymonth : []);
  const [count, setCount] = useState<number | null>(null);
  // const [until, setUntil] = useState<Date | null>(null);
  // const [from, setFrom] = useState<Date | null>(null);
  const currentRRule = useMemo(() => {
    if (useRRule) {
      try {
        const rrule = new RRule({
          freq: frequency,
          // dtstart: from,
          // until,
          count,
          interval: rInterval,
          byweekday: byWeekDay.length === 0 ? undefined : byWeekDay,
          bymonth: byMonth.length === 0 ? undefined : byMonth
        });
        return rrule;
      }
      catch (err: unknown) {
        console.log({ err })
      }
    }
  }, [useRRule, frequency, count, rInterval, byWeekDay, byMonth]);
  useEffect(() => {
    if ((useRRule && localInterval.start > localInterval.end) ||
      (useRRule && currentRRule === undefined) ||
      (!useRRule && localInterval.start > 0 && localInterval.end > 0 && localInterval.start > localInterval.end)) {
      setAvailabilityIsValid(false);
      return;
    }
    setValue({ interval: localInterval, rrule: currentRRule?.toString() ?? "" });
    setAvailabilityIsValid(true);
  }, [localInterval, currentRRule, useRRule, setAvailabilityIsValid, setValue]);

  const handleSetUseRRule = (newValue: boolean) => {
    if (useRRule && !newValue) {
      setLocalInterval({ start: -1, end: -1 });
    }
    else if (!useRRule && newValue) {
      setLocalInterval({ start: 0, end: 1439 });
    }
    setUseRRule(newValue);
  }
  return (
    <Accordion sx={{ p: 2 }} expanded={isExpanded} onChange={(_e, ex) => { setIsExpanded(ex); }}  >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Grid container>
          <Grid size="grow">
            <Typography sx={{ ml: 4 }}>
              {(props.value !== null && props.availabilityIsValid ?
                (currentRRule ?
                  (`${currentRRule.toText()} from ${WDateUtils.MinutesToPrintTime(localInterval.start)} to ${WDateUtils.MinutesToPrintTime(localInterval.end)}`) :
                  `${localInterval.start === -1 ? 'The Beginning of Time' : format(localInterval.start, WDateUtils.ISODateTimeNoOffset)} to ${localInterval.end === -1 ? 'The End of Time' :
                    format(localInterval.end, WDateUtils.ISODateTimeNoOffset)}`) :
                "Availability is not valid")}
            </Typography>
          </Grid>
          <Grid size={2}>
            <FormControlLabel sx={{ float: "right" }} control={
              <IconButton edge="end" size="small" disabled={props.disabled} aria-label="delete" onClick={() => { props.setValue(null); }}></IconButton>
            }
              label="Delete"
            />
          </Grid>
        </Grid>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid size={6}>
            <ToggleBooleanPropertyComponent
              disabled={props.disabled}
              label="Use Recurrence Rule"
              value={useRRule}
              setValue={handleSetUseRRule}
            />
          </Grid>
          {useRRule ? (
            <>
              <Grid
                container
                size={{
                  xs: 6,
                  sm: 4
                }}>
                <MappingEnumPropertyComponent
                  disabled={props.disabled}
                  label="Frequency"
                  value={frequency}
                  setValue={setFreqency}
                  options={{ 'Daily': Frequency.DAILY, 'Weekly': Frequency.WEEKLY, 'Monthly': Frequency.MONTHLY }}
                />
              </Grid>

              <Grid
                size={{
                  xs: 6,
                  sm: 4
                }}>
                <CheckedNumericInput
                  label="Count"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  numberProps={{
                    allowEmpty: true,
                    formatFunction: (i) => formatDecimal(i, 2),
                    parseFunction: parseInteger,
                    min: 1
                  }}
                  pattern="[0-9]*"
                  value={count}
                  disabled={props.disabled}
                  onChange={(e: number | "") => { setCount(e ? e : null); }}
                />
              </Grid>
              <Grid
                size={{
                  xs: 6,
                  sm: 4
                }}>
                <IntNumericPropertyComponent
                  disabled={props.disabled}
                  label="Interval"
                  value={rInterval}
                  setValue={setRInterval}
                />
              </Grid>
              <Grid size={6}>
                <Autocomplete
                  multiple
                  filterSelectedOptions
                  options={[RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU,]}
                  value={byWeekDay}
                  onChange={(_, v: Weekday[]) => { setByWeekDay(v.sort((a, b) => a.getJsWeekday() - b.getJsWeekday())); }}
                  getOptionLabel={(option) => format(setDay(Date.now(), option.getJsWeekday()), 'EEEE')}
                  isOptionEqualToValue={(option, value) => option.weekday === value.weekday}
                  renderInput={(params) => <TextField {...params} label="By Weekday" />}
                />
              </Grid>
              <Grid size={6}>
                <Autocomplete
                  multiple
                  filterSelectedOptions
                  options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
                  value={byMonth}
                  onChange={(_, v: number[]) => { setByMonth(v.sort()); }}
                  getOptionLabel={(option) => format(setMonth(Date.now(), option - 1), 'MMM')}
                  isOptionEqualToValue={(option, value) => option === value}
                  renderInput={(params) => <TextField {...params} label="By Month" />}
                />
              </Grid>
              <Grid size={6}>
                <TimePicker
                  slotProps={{ textField: { fullWidth: true } }}
                  label="From Time"
                  //maxTime={setMinutes(startOfDay(Date.now()), localInterval.end)}
                  value={setMinutes(startOfDay(Date.now()), localInterval.start)}
                  onChange={(e: Date | number | null) => { if (e !== null && isValid(e)) { setLocalInterval({ ...localInterval, start: differenceInMinutes(e, startOfDay(Date.now())) }) } }}
                // localeText={ { toolbarTitle: "From Time"}}
                />
              </Grid>
              <Grid size={6}>
                <TimePicker
                  slotProps={{ textField: { fullWidth: true } }}
                  label="Until Time"
                  //minTime={setMinutes(startOfDay(Date.now()), localInterval.start)}
                  value={setMinutes(startOfDay(Date.now()), localInterval.end)}
                  onChange={(e: Date | number | null) => {
                    console.log({ e })
                    if (e !== null && isValid(e)) {
                      setLocalInterval({ ...localInterval, end: differenceInMinutes(e, startOfDay(Date.now())) })
                    } else {
                      setLocalInterval({ ...localInterval, end: 1439 })
                    }
                  }}
                // renderInput={(params) => <TextField {...params} fullWidth label="Until Time" />}
                />
              </Grid>
            </>
          ) : (
            // show a from and to date-time picker similar to disable 
            (<>
              <Grid size={6}></Grid>
              <Grid size={6}>
                <DateTimePicker
                  slotProps={{ textField: { fullWidth: true } }}
                  disabled={props.disabled}
                  label={"Start"}
                  value={localInterval.start > 0 ? toDate(localInterval.start) : null}
                  onChange={(date: Date | null) => { setLocalInterval({ start: date && date.valueOf() > 0 ? setMilliseconds(setSeconds(date, 0), 0).valueOf() : -1, end: localInterval.end }); }}
                  format="MMM dd, y hh:mm a"
                />
              </Grid>
              <Grid size={6}>
                <DateTimePicker
                  disabled={props.disabled}
                  slotProps={{ textField: { fullWidth: true } }}
                  label={"End"}
                  minDateTime={localInterval.start > 0 ? toDate(localInterval.start) : null}
                  value={localInterval.end > 0 ? toDate(localInterval.end) : null}
                  onChange={(date: Date | null) => { setLocalInterval({ start: localInterval.start, end: date && date.valueOf() > 0 ? setMilliseconds(setSeconds(date, 0), 0).valueOf() : -1 }); }}
                  format="MMM dd, y hh:mm a"
                />
              </Grid>
            </>)
          )}

        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default RecurrenceRuleBuilderComponent;
