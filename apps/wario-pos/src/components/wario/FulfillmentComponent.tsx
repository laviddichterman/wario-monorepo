import { format, setDay } from 'date-fns';
import type { Polygon } from 'geojson';
import { useAtom, useAtomValue } from 'jotai';
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
  Typography,
} from '@mui/material';

import { formatDecimal, FulfillmentType, parseInteger, WDateUtils } from '@wcp/wario-shared/logic';
import { type DayOfTheWeek, type IWInterval, type OperatingHourSpecification } from '@wcp/wario-shared/types';
import { type ValSetValNamed } from '@wcp/wario-ux-shared/common';
import { CheckedNumericInput } from '@wcp/wario-ux-shared/components';
import { useCatalogQuery } from '@wcp/wario-ux-shared/query';

import {
  fulfillmentFormAtom,
  fulfillmentFormProcessingAtom,
  type FulfillmentFormState,
} from '@/atoms/forms/fulfillmentFormAtoms';

import { ElementActionComponent } from './menu/element.action.component';
import { IntNumericPropertyComponent } from './property-components/IntNumericPropertyComponent';
import { StringEnumPropertyComponent } from './property-components/StringEnumPropertyComponent';
import { StringPropertyComponent } from './property-components/StringPropertyComponent';
import { ToggleBooleanPropertyComponent } from './property-components/ToggleBooleanPropertyComponent';

// =============================================================================
// Operating Hours Form Components
// =============================================================================

export interface OperatingHoursIntervalFormProps {
  timeStep: number;
  disabled: boolean;
  onAddInterval: (interval: IWInterval) => void;
}

const OperatingHoursIntervalForm = ({ timeStep, disabled, onAddInterval }: OperatingHoursIntervalFormProps) => {
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const onSubmitHandler = () => {
    if (start !== null && end !== null) {
      onAddInterval({ start, end });
    }
    setStart(null);
    setEnd(null);
  };
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

  const endOptions = useMemo(
    () => (start !== null ? startOptions.filter((x) => x >= start) : []),
    [start, startOptions],
  );

  return (
    <Grid container sx={{ mx: 'auto', width: '100%' }} spacing={1} alignContent="center" justifyContent="center">
      <Grid size={5}>
        <Autocomplete
          disableClearable
          fullWidth
          options={startOptions}
          isOptionEqualToValue={(o, v) => o === v}
          getOptionLabel={(x) => WDateUtils.MinutesToPrintTime(x)}
          value={start ? start : undefined}
          onChange={(_, v) => {
            setStart(v);
          }}
          renderInput={(params) => <TextField {...params} label={'Start'} />}
        />
      </Grid>
      <Grid size={5}>
        <Autocomplete
          disableClearable
          fullWidth
          options={endOptions}
          isOptionEqualToValue={(o, v) => o === v}
          getOptionLabel={(x) => WDateUtils.MinutesToPrintTime(x)}
          value={end ? end : undefined}
          disabled={start === null || disabled}
          onChange={(_, v) => {
            setEnd(v);
          }}
          renderInput={(params) => <TextField {...params} label={'End'} />}
        />
      </Grid>
      <Grid sx={{ m: 'auto' }} size={2}>
        <Button
          disabled={start === null || end === null || disabled}
          onClick={() => {
            onSubmitHandler();
          }}
        >
          Add
        </Button>
      </Grid>
    </Grid>
  );
};

type IntervalsComponentBaseProps = {
  label: string;
  disabled: boolean;
  timeStep: number;
};

const OperatingHoursComponent = function (
  props: IntervalsComponentBaseProps & ValSetValNamed<OperatingHourSpecification, 'operatingHours'>,
) {
  function onAddOperatingHours(day: DayOfTheWeek, interval: IWInterval) {
    props.setOperatingHours(WDateUtils.AddIntervalToOperatingHours(day, interval, props.operatingHours));
  }
  function onRemoveOperatingHours(day: DayOfTheWeek, interval: IWInterval) {
    props.setOperatingHours({
      ...props.operatingHours,
      [day]: WDateUtils.ComputeSubtractionOfIntervalSets(props.operatingHours[day], [interval], props.timeStep),
    });
  }
  return (
    <Card>
      <CardHeader title={props.label} />
      <Divider sx={{ m: 1 }} />
      <Grid container spacing={2} justifyContent={'center'}>
        {Object.keys(props.operatingHours)
          .filter((x) => x !== '_id')
          .map((_key, day: DayOfTheWeek) => (
            <React.Fragment key={day}>
              <Grid
                size={{
                  xs: 12,
                  sm: 4,
                }}
              >
                <Typography sx={{ px: 1 }} variant="h6">
                  {format(setDay(Date.now(), day), 'EEEE')}:
                </Typography>
              </Grid>
              <Grid
                container
                size={{
                  xs: 12,
                  sm: 8,
                }}
              >
                {props.operatingHours[day].map((interval, j) => (
                  <Stack direction="row" key={j} sx={{ m: 1 }} spacing={2}>
                    <Chip
                      label={`${WDateUtils.MinutesToPrintTime(interval.start)} - ${WDateUtils.MinutesToPrintTime(interval.end)}`}
                      onDelete={() => {
                        onRemoveOperatingHours(day, interval);
                      }}
                    />
                  </Stack>
                ))}
              </Grid>
              <Grid size={12}>
                <OperatingHoursIntervalForm
                  disabled={props.disabled}
                  onAddInterval={(i) => {
                    onAddOperatingHours(day, i);
                  }}
                  timeStep={props.timeStep}
                />
              </Grid>
            </React.Fragment>
          ))}
      </Grid>
    </Card>
  );
};

// =============================================================================
// FulfillmentFormBody - reads/writes directly from Jotai atoms
// =============================================================================

/**
 * Inner form body for Fulfillment.
 * Reads/writes directly from Jotai atoms - no prop drilling needed.
 */
export const FulfillmentFormBody = () => {
  const { data: catalog } = useCatalogQuery();
  const [form, setForm] = useAtom(fulfillmentFormAtom);
  const isProcessing = useAtomValue(fulfillmentFormProcessingAtom);

  // Local state for service area JSON parsing
  const [isServiceAreaDirty, setIsServiceAreaDirty] = useState(false);
  const [isServiceAreaParsingError, setIsServiceAreaParsingError] = useState(false);
  const [localServiceAreaString, setLocalServiceAreaString] = useState(
    form?.serviceArea ? JSON.stringify(form.serviceArea) : null,
  );

  if (!catalog || !form) return null;

  const updateField = <K extends keyof FulfillmentFormState>(field: K, value: FulfillmentFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const onSetServiceArea = (json: string | null) => {
    try {
      updateField('serviceArea', json ? (JSON.parse(json) as Polygon) : null);
      setIsServiceAreaParsingError(false);
    } catch {
      setIsServiceAreaParsingError(true);
    }
  };

  const onChangeLocalServiceAreaString = (val: string) => {
    setIsServiceAreaDirty(true);
    setLocalServiceAreaString(val);
  };

  return (
    <>
      <Grid size={12}>
        <StringEnumPropertyComponent
          disabled={isProcessing}
          label="Fulfillment Type"
          value={form.service}
          setValue={(v) => {
            updateField('service', v);
          }}
          options={Object.values(FulfillmentType)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 9 }}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Display Name"
          value={form.displayName}
          setValue={(v) => {
            updateField('displayName', v);
          }}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 2 }}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Short Code"
          value={form.shortcode}
          setValue={(v) => {
            updateField('shortcode', v);
          }}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 1 }}>
        <IntNumericPropertyComponent
          disabled={isProcessing}
          label="Ordinal"
          value={form.ordinal}
          setValue={(v) => {
            updateField('ordinal', v);
          }}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          multiline
          fullWidth
          rows={form.terms.length + 1}
          label="Service Terms (Each line a new bullet point)"
          type="text"
          value={form.terms.join('\n')}
          onChange={(e) => {
            updateField(
              'terms',
              e.target.value
                .trim()
                .split('\n')
                .filter((x) => x.length > 0),
            );
          }}
        />
      </Grid>
      <Grid size={12}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Fulfillment Description"
          value={form.messageDescription || ''}
          setValue={(v) => {
            updateField('messageDescription', v);
          }}
        />
      </Grid>
      <Grid size={12}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Order Confirmation Message"
          value={form.messageConfirmation || ''}
          setValue={(v) => {
            updateField('messageConfirmation', v);
          }}
        />
      </Grid>
      <Grid size={12}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Order Instructions Message"
          value={form.messageInstructions || ''}
          setValue={(v) => {
            updateField('messageInstructions', v);
          }}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Autocomplete
          unselectable="off"
          disableClearable
          filterSelectedOptions
          disabled={isProcessing}
          options={Object.keys(catalog.categories)}
          value={form.menuBaseCategoryId ?? undefined}
          onChange={(_, v) => {
            if (v) updateField('menuBaseCategoryId', v);
          }}
          getOptionLabel={(option) => catalog.categories[option].name}
          isOptionEqualToValue={(option, value) => option === value}
          renderInput={(params) => <TextField {...params} label="Menu Category" />}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Autocomplete
          unselectable="off"
          disableClearable
          filterSelectedOptions
          disabled={isProcessing}
          options={Object.keys(catalog.categories)}
          value={form.orderBaseCategoryId ?? undefined}
          onChange={(_, v) => {
            if (v) updateField('orderBaseCategoryId', v);
          }}
          getOptionLabel={(option) => catalog.categories[option].name}
          isOptionEqualToValue={(option, value) => option === value}
          renderInput={(params) => <TextField {...params} label="Order Category" />}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Autocomplete
          filterSelectedOptions
          disabled={isProcessing}
          options={Object.keys(catalog.categories)}
          value={form.orderSupplementaryCategoryId ?? undefined}
          onChange={(_, v) => {
            updateField('orderSupplementaryCategoryId', v ?? null);
          }}
          getOptionLabel={(option) => catalog.categories[option].name}
          isOptionEqualToValue={(option, value) => option === value}
          renderInput={(params) => <TextField {...params} label="Order Supplement Category" />}
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={isProcessing}
          label="Allow Pre-Payment"
          value={form.allowPrepayment}
          setValue={(v) => {
            updateField('allowPrepayment', v);
          }}
          labelPlacement="end"
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={isProcessing || !form.allowPrepayment}
          label="Require Pre-Payment"
          value={form.allowPrepayment && form.requirePrepayment}
          setValue={(v) => {
            updateField('requirePrepayment', v);
          }}
          labelPlacement="end"
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={isProcessing}
          label="Allow Tipping"
          value={form.allowTipping}
          setValue={(v) => {
            updateField('allowTipping', v);
          }}
          labelPlacement="end"
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={isProcessing}
          label="Expose Fulfillment"
          value={form.exposeFulfillment}
          setValue={(v) => {
            updateField('exposeFulfillment', v);
          }}
          labelPlacement="end"
        />
      </Grid>
      <Grid size={12}>
        <Autocomplete
          fullWidth
          options={Object.keys(catalog.orderInstanceFunctions)}
          value={form.serviceCharge}
          onChange={(_e, v) => {
            updateField('serviceCharge', v);
          }}
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          getOptionLabel={(option) => catalog.orderInstanceFunctions[option].name ?? 'CORRUPT DATA'}
          isOptionEqualToValue={(o, v) => o === v}
          renderInput={(params) => <TextField {...params} label="Service Charge Function" />}
        />
      </Grid>
      <Grid size={12}>
        <OperatingHoursComponent
          disabled={isProcessing}
          label="Operating Hours"
          operatingHours={form.operatingHours}
          setOperatingHours={(v) => {
            updateField('operatingHours', v);
          }}
          timeStep={form.timeStep}
        />
      </Grid>
      <Grid size={4}>
        <IntNumericPropertyComponent
          disabled={isProcessing}
          label="Lead Time"
          value={form.leadTime}
          setValue={(v) => {
            updateField('leadTime', v);
          }}
        />
      </Grid>
      <Grid size={4}>
        <IntNumericPropertyComponent
          disabled={isProcessing}
          min={-30}
          max={120}
          label="Lead Time Offset"
          value={form.leadTimeOffset}
          setValue={(v) => {
            updateField('leadTimeOffset', v);
          }}
        />
      </Grid>
      <Grid size={4}>
        <IntNumericPropertyComponent
          disabled={isProcessing}
          min={1}
          max={1440}
          label="Time Step"
          value={form.timeStep}
          setValue={(v) => {
            updateField('timeStep', v);
          }}
        />
      </Grid>
      <Grid size={4}>
        <IntNumericPropertyComponent
          disabled={isProcessing}
          label="Min Duration"
          max={form.maxDuration}
          value={form.minDuration}
          setValue={(v) => {
            updateField('minDuration', v);
          }}
        />
      </Grid>
      <Grid size={4}>
        <IntNumericPropertyComponent
          disabled={isProcessing}
          label="Max Duration"
          min={form.minDuration}
          value={form.maxDuration}
          setValue={(v) => {
            updateField('maxDuration', v);
          }}
        />
      </Grid>
      <Grid size={4}>
        <CheckedNumericInput
          label="Max Guests"
          fullWidth
          type="number"
          inputMode="numeric"
          step={1}
          numberProps={{
            allowEmpty: true,
            formatFunction: (i) => formatDecimal(i, 2),
            parseFunction: parseInteger,
            min: 1,
          }}
          pattern="[0-9]*"
          value={form.maxGuests}
          disabled={isProcessing}
          onChange={(e: number | '') => {
            updateField('maxGuests', e ? e : null);
          }}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          aria-label="textarea"
          label="Service Area (GeoJSON Polygon)"
          rows={(isServiceAreaDirty && localServiceAreaString) || form.serviceArea ? 15 : 1}
          fullWidth
          multiline
          value={isServiceAreaDirty ? localServiceAreaString : form.serviceArea ? JSON.stringify(form.serviceArea) : ''}
          onChange={(e) => {
            onChangeLocalServiceAreaString(e.target.value);
          }}
          onBlur={() => {
            onSetServiceArea(localServiceAreaString);
          }}
          error={isServiceAreaParsingError}
          helperText={isServiceAreaParsingError ? 'JSON Parsing Error' : ''}
        />
      </Grid>
    </>
  );
};

// =============================================================================
// FulfillmentComponent - wrapper with action props only
// =============================================================================

export interface FulfillmentComponentProps {
  onCloseCallback: React.MouseEventHandler<HTMLButtonElement>;
  onConfirmClick: React.MouseEventHandler<HTMLButtonElement>;
  isProcessing: boolean;
  disableConfirmOn: boolean;
  confirmText: string;
}

const FulfillmentComponent = (props: FulfillmentComponentProps) => {
  return (
    <ElementActionComponent
      onCloseCallback={props.onCloseCallback}
      onConfirmClick={props.onConfirmClick}
      isProcessing={props.isProcessing}
      disableConfirmOn={props.disableConfirmOn}
      confirmText={props.confirmText}
      body={<FulfillmentFormBody />}
    />
  );
};

export default FulfillmentComponent;
