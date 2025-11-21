import { format, setDay } from 'date-fns';
import type { Polygon } from 'geojson';
import React, { useMemo, useState } from 'react';

import {
  Autocomplete,
  Button,
  Card,
  CardHeader,
  Chip,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import { type DateIntervalsEntries, type DayOfTheWeek, FulfillmentType, type IWInterval, type OperatingHourSpecification, WDateUtils } from '@wcp/wario-shared';
import { CheckedNumericInput, type ValSetValNamed } from '@wcp/wario-ux-shared';

import { useAppSelector } from '@/hooks/useRedux';

import { ElementActionComponent } from './menu/element.action.component';
import { IntNumericPropertyComponent } from './property-components/IntNumericPropertyComponent';
import { StringEnumPropertyComponent } from './property-components/StringEnumPropertyComponent';
import { StringPropertyComponent } from './property-components/StringPropertyComponent';
import { ToggleBooleanPropertyComponent } from './property-components/ToggleBooleanPropertyComponent';


export interface OperatingHoursIntervalFormProps {
  timeStep: number;
  disabled: boolean;
  onAddInterval: (interval: IWInterval) => void;
};

const OperatingHoursIntervalForm = ({
  timeStep,
  disabled,
  onAddInterval
}: OperatingHoursIntervalFormProps) => {
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const onSubmitHandler = () => {
    if (start !== null && end !== null) {
      onAddInterval({ start, end });
    }
    setStart(null);
    setEnd(null);
  }
  const startOptions = useMemo(() => {
    let earliest = 0;
    const latest = 1440 - timeStep;
    const retval = [];
    while (earliest <= latest) {
      retval.push(earliest);
      earliest += timeStep;
    }
    return retval;
  }, [timeStep]);

  const endOptions = useMemo(() => start !== null ?
    startOptions.filter(x => x >= start) : [], [start, startOptions]);

  return (
    <Grid container sx={{ mx: 'auto', width: '100%' }} spacing={1} alignContent="center" justifyContent="center">
      <Grid size={5}>
        <Autocomplete
          disableClearable
          fullWidth
          options={startOptions}
          isOptionEqualToValue={(o, v) => o === v}
          getOptionLabel={x => WDateUtils.MinutesToPrintTime(x)}
          // @ts-ignore
          value={start}
          onChange={(_, v) => { setStart(v); }}
          renderInput={(params) => <TextField {...params} label={"Start"}
          />}
        />
      </Grid>
      <Grid size={5}>
        <Autocomplete
          disableClearable
          fullWidth
          options={endOptions}
          isOptionEqualToValue={(o, v) => o === v}
          getOptionLabel={x => WDateUtils.MinutesToPrintTime(x)}
          // @ts-ignore
          value={end}
          disabled={start === null || disabled}
          onChange={(_, v) => { setEnd(v); }}
          renderInput={(params) => <TextField {...params} label={"End"}
          />}
        />
      </Grid>
      <Grid sx={{ m: 'auto' }} size={2}>
        <Button
          disabled={start === null || end === null || disabled}
          onClick={() => { onSubmitHandler(); }}>Add</Button>
      </Grid>
    </Grid>
  );
}

type IntervalsComponentBaseProps = {
  label: string;
  disabled: boolean;
  timeStep: number;
}

const OperatingHoursComponent = function (props: IntervalsComponentBaseProps & ValSetValNamed<OperatingHourSpecification, 'operatingHours'>) {
  function onAddOperatingHours(day: DayOfTheWeek, interval: IWInterval) {
    props.setOperatingHours(WDateUtils.AddIntervalToOperatingHours(
      day,
      interval,
      props.operatingHours))
  };
  function onRemoveOperatingHours(day: DayOfTheWeek, interval: IWInterval) {
    props.setOperatingHours({ ...props.operatingHours, [day]: WDateUtils.ComputeSubtractionOfIntervalSets(props.operatingHours[day], [interval], props.timeStep) });
  };
  return (
    <Card>
      <CardHeader title={props.label} />
      <Divider sx={{ m: 1 }} />
      <Grid container spacing={2} justifyContent={'center'}>
        {Object.keys(props.operatingHours).filter(x => x !== "_id").map((key, day: DayOfTheWeek) =>
          <React.Fragment key={day}>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Typography sx={{ px: 1 }} variant='h6'>{format(setDay(Date.now(), day), 'EEEE')}:</Typography>
            </Grid>
            <Grid
              container
              size={{
                xs: 12,
                sm: 8
              }}>
              {props.operatingHours[day].map((interval, j) => (
                <Stack direction='row' key={j} sx={{ m: 1 }} spacing={2}>
                  <Chip label={`${WDateUtils.MinutesToPrintTime(interval.start)} - ${WDateUtils.MinutesToPrintTime(interval.end)}`}
                    onDelete={() => { onRemoveOperatingHours(day, interval); }} />
                </Stack>
              ))}
            </Grid>
            <Grid size={12}>
              <OperatingHoursIntervalForm
                disabled={props.disabled}
                onAddInterval={(i) => { onAddOperatingHours(day, i); }}
                timeStep={props.timeStep}
              />
            </Grid>
          </React.Fragment>
        )}
      </Grid>
    </Card >
  );
}

// const DateIntervalsComponent = function (props: IntervalsComponentBaseProps & ValSetValNamed<DateIntervalEntry[], 'dateIntervals'>) {

// }

export type FulfillmentComponentProps =
  ValSetValNamed<string, 'shortcode'> &
  ValSetValNamed<string, 'displayName'> &
  ValSetValNamed<boolean, 'exposeFulfillment'> &
  ValSetValNamed<number, 'ordinal'> &
  ValSetValNamed<FulfillmentType, 'service'> &
  ValSetValNamed<string[], 'terms'> &
  ValSetValNamed<string, 'fulfillmentDescription'> &
  ValSetValNamed<string, 'confirmationMessage'> &
  ValSetValNamed<string, 'instructions'> &
  ValSetValNamed<string | null, 'menuCategoryId'> &
  ValSetValNamed<string | null, 'orderCategoryId'> &
  ValSetValNamed<string | null, 'orderSupplementaryCategoryId'> &
  ValSetValNamed<boolean, 'requirePrepayment'> &
  ValSetValNamed<boolean, 'allowPrepayment'> &
  ValSetValNamed<boolean, 'allowTipping'> &
  ValSetValNamed<{ function: string, percentage: number } | null, 'autograt'> &
  ValSetValNamed<string | null, 'serviceChargeFunctionId'> &
  ValSetValNamed<number, 'leadTime'> &
  ValSetValNamed<OperatingHourSpecification, 'operatingHours'> &
  ValSetValNamed<DateIntervalsEntries, 'specialHours'> &
  ValSetValNamed<DateIntervalsEntries, 'blockedOff'> &
  ValSetValNamed<number, 'minDuration'> &
  ValSetValNamed<number, 'maxDuration'> &
  ValSetValNamed<number, 'timeStep'> &
  ValSetValNamed<number | null, 'maxGuests'> &
  ValSetValNamed<Polygon | null, 'serviceArea'> &
  {
    onCloseCallback: React.MouseEventHandler<HTMLButtonElement>;
    onConfirmClick: React.MouseEventHandler<HTMLButtonElement>;
    isProcessing: boolean;
    disableConfirmOn: boolean;
    confirmText: string;
  };

const FulfillmentComponent = (props: FulfillmentComponentProps) => {
  const catalog = useAppSelector(s => s.ws.catalog!);
  const [isServiceAreaDirty, setIsServiceAreaDirty] = useState(false);
  const [isServiceAreaParsingError, setIsServiceAreaParsingError] = useState(false);
  const [localServiceAreaString, setLocalServiceAreaString] = useState(props.serviceArea ? JSON.stringify(props.serviceArea) : null)
  function onSetServiceArea(json: string | null) {
    try {
      props.setServiceArea(json ? JSON.parse(json) : null);
      setIsServiceAreaParsingError(false);
    }
    catch (e) {
      setIsServiceAreaParsingError(true);
    }
  }
  const onChangeLocalServiceAreaString = (val: string) => {
    setIsServiceAreaDirty(true);
    setLocalServiceAreaString(val);
  }
  return (
    <ElementActionComponent
      onCloseCallback={props.onCloseCallback}
      onConfirmClick={props.onConfirmClick}
      isProcessing={props.isProcessing}
      disableConfirmOn={props.disableConfirmOn || isServiceAreaParsingError}
      confirmText={props.confirmText}
      body={
        <>
          <Grid size={12}>
            <StringEnumPropertyComponent
              disabled={props.isProcessing}
              label="Fulfillment Type"
              value={props.service}
              setValue={props.setService}
              options={Object.keys(FulfillmentType)}
            />
          </Grid>
          { /* universal break */}
          <Grid
            size={{
              xs: 12,
              md: 9
            }}>
            <StringPropertyComponent
              disabled={props.isProcessing}
              label="Display Name"
              value={props.displayName}
              setValue={props.setDisplayName}
            />
          </Grid>
          { /* xs break */}
          <Grid
            size={{
              xs: 6,
              md: 2
            }}>
            <StringPropertyComponent
              disabled={props.isProcessing}
              label="Short Code"
              value={props.shortcode}
              setValue={props.setShortcode}
            />
          </Grid>
          <Grid
            size={{
              xs: 6,
              md: 1
            }}>
            <IntNumericPropertyComponent
              disabled={props.isProcessing}
              label="Ordinal"
              value={props.ordinal}
              setValue={props.setOrdinal}
            />
          </Grid>
          { /* universal break */}
          <Grid size={12}>
            <TextField
              multiline
              fullWidth
              rows={props.terms.length + 1}
              label="Service Terms (Each line a new bullet point)"
              type="text"
              value={props.terms.join('\n')}
              onChange={(e) => { props.setTerms(e.target.value.trim().split('\n').filter(x => x.length > 0)); }}
            />
          </Grid>
          { /* universal break */}
          <Grid size={12}>
            <StringPropertyComponent
              disabled={props.isProcessing}
              label="Fulfillment Description"
              value={props.fulfillmentDescription || ""}
              setValue={props.setFulfillmentDescription}
            />
          </Grid>
          { /* universal break */}
          <Grid size={12}>
            <StringPropertyComponent
              disabled={props.isProcessing}
              label="Order Confirmation Message"
              value={props.confirmationMessage || ""}
              setValue={props.setConfirmationMessage}
            />
          </Grid>
          { /* universal break */}
          <Grid size={12}>
            <StringPropertyComponent
              disabled={props.isProcessing}
              label="Order Instructions Message"
              value={props.instructions || ""}
              setValue={props.setInstructions}
            />
          </Grid>
          { /* universal break */}
          <Grid
            size={{
              xs: 12,
              md: 4
            }}>
            <Autocomplete
              unselectable='off'
              disableClearable
              filterSelectedOptions
              disabled={props.isProcessing}
              options={Object.keys(catalog.categories)}
              // @ts-ignore
              value={props.menuCategoryId}
              onChange={(_, v) => v && props.setMenuCategoryId(v)}
              getOptionLabel={(option) => catalog.categories[option].category.name}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => <TextField {...params} label="Menu Category" />}
            />
          </Grid>
          { /* xs break */}
          <Grid
            size={{
              xs: 12,
              md: 4
            }}>
            <Autocomplete
              unselectable='off'
              disableClearable
              filterSelectedOptions
              disabled={props.isProcessing}
              options={Object.keys(catalog.categories)}
              // @ts-ignore
              value={props.orderCategoryId}
              onChange={(_, v) => v && props.setOrderCategoryId(v)}
              getOptionLabel={(option) => catalog.categories[option].category.name}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => <TextField {...params} label="Order Category" />}
            />
          </Grid>
          { /* xs break */}
          <Grid
            size={{
              xs: 12,
              md: 4
            }}>
            <Autocomplete
              filterSelectedOptions
              disabled={props.isProcessing}
              options={Object.keys(catalog.categories)}
              // @ts-ignore
              value={props.orderSupplementaryCategoryId}
              onChange={(_, v) => v && props.setOrderSupplementaryCategoryId(v)}
              getOptionLabel={(option) => catalog.categories[option].category.name}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => <TextField {...params} label="Order Supplement Category" />}
            />
          </Grid>
          { /* universal break */}
          <Grid size={6}>
            <ToggleBooleanPropertyComponent
              disabled={props.isProcessing}
              label="Allow Pre-Payment"
              value={props.allowPrepayment}
              setValue={props.setAllowPrepayment}
              labelPlacement='end'
            />
          </Grid>
          <Grid size={6}>
            <ToggleBooleanPropertyComponent
              disabled={props.isProcessing || !props.allowPrepayment}
              label="Require Pre-Payment"
              value={props.allowPrepayment && props.requirePrepayment}
              setValue={props.setRequirePrepayment}
              labelPlacement='end'
            />
          </Grid>
          <Grid size={6}>
            <ToggleBooleanPropertyComponent
              disabled={props.isProcessing}
              label="Allow Tipping"
              value={props.allowTipping}
              setValue={props.setAllowTipping}
              labelPlacement='end'
            />
          </Grid>
          <Grid size={6}>
            <ToggleBooleanPropertyComponent
              disabled={props.isProcessing}
              label="Expose Fulfillment"
              value={props.exposeFulfillment}
              setValue={props.setExposeFulfillment}
              labelPlacement='end'
            />
          </Grid>
          {/* //ValSetValNamed<{ function: string, percentage: number } | null, 'autograt'> & */}
          <Grid size={12}>
            <Autocomplete
              fullWidth
              options={Object.keys(catalog.orderInstanceFunctions)}
              value={props.serviceChargeFunctionId}
              onChange={(e, v) => { props.setServiceChargeFunctionId(v); }}
              getOptionLabel={(option) => catalog.orderInstanceFunctions[option].name ?? "CORRUPT DATA"}
              isOptionEqualToValue={(o, v) => o === v}
              renderInput={(params) => <TextField {...params} label="Service Charge Function" />}
            />
          </Grid>
          <Grid size={12}>
            <OperatingHoursComponent
              disabled={props.isProcessing}
              label='Operating Hours'
              operatingHours={props.operatingHours}
              setOperatingHours={props.setOperatingHours}
              timeStep={props.timeStep} />
          </Grid>
          <Grid size={4}>
            <IntNumericPropertyComponent
              disabled={props.isProcessing}
              label="Lead Time"
              value={props.leadTime}
              setValue={props.setLeadTime}
            />
          </Grid>
          <Grid size={4}>
            <IntNumericPropertyComponent
              disabled={props.isProcessing}
              label="Min Duration"
              max={props.maxDuration}
              value={props.minDuration}
              setValue={props.setMinDuration}
            />
          </Grid>
          <Grid size={4}>
            <IntNumericPropertyComponent
              disabled={props.isProcessing}
              label="Max Duration"
              min={props.minDuration}
              value={props.maxDuration}
              setValue={props.setMaxDuration}
            />
          </Grid>
          <Grid size={6}>
            <IntNumericPropertyComponent
              disabled={props.isProcessing}
              min={1}
              max={1440}
              label="Time Step"
              value={props.timeStep}
              setValue={props.setTimeStep}
            />
          </Grid>
          <Grid size={6}>
            <CheckedNumericInput
              label="Max Guests"
              fullWidth
              type="number"
              inputProps={{ inputMode: 'numeric', min: 0, pattern: '[0-9]*', step: 1 }}
              disabled={props.isProcessing}
              value={props.maxGuests}
              onChange={(e) => { props.setMaxGuests(e); }}
              parseFunction={(v) => v !== null && v ? parseInt(v) : null}
              allowEmpty={true} />
          </Grid>
          <Grid size={12}>
            <TextField
              aria-label="textarea"
              label="Service Area (GeoJSON Polygon)"
              rows={(isServiceAreaDirty && localServiceAreaString) || props.serviceArea ? 15 : 1}
              fullWidth
              multiline
              value={isServiceAreaDirty ? localServiceAreaString : (props.serviceArea ? JSON.stringify(props.serviceArea) : "")}
              onChange={e => { onChangeLocalServiceAreaString(e.target.value); }}
              onBlur={() => { onSetServiceArea(localServiceAreaString); }}
              error={isServiceAreaParsingError}
              helperText={isServiceAreaParsingError ? "JSON Parsing Error" : ""}
            />
          </Grid>
        </>
      }
    />
  );
};

export default FulfillmentComponent;
