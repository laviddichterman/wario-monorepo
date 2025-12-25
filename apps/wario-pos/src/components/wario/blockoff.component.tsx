import { add, format, formatISO, parseISO, startOfDay } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Delete as DeleteIcon, Done, HighlightOff } from '@mui/icons-material';
import { Autocomplete, Box, Button, Chip, Divider, IconButton, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';

import { GetNextAvailableServiceDate, WDateUtils } from '@wcp/wario-shared/logic';
import {
  type FulfillmentConfig,
  type IWInterval,
  type PostBlockedOffToFulfillmentsRequest,
} from '@wcp/wario-shared/types';
import { type ValSetValNamed } from '@wcp/wario-ux-shared/common';
import { useCurrentTime, useFulfillments, useValueFromFulfillmentById } from '@wcp/wario-ux-shared/query';

import { useBlockOffMutation, useRemoveBlockOffMutation } from '@/hooks/useConfigMutations';

import { toast } from '@/components/snackbar';

const TrimOptionsBeforeDisabled = function <T extends { disabled: boolean }>(opts: T[]) {
  const idx = opts.findIndex((elt: T) => elt.disabled);
  return idx === -1 ? opts : opts.slice(0, idx);
};

interface ServiceSelectionCheckboxProps {
  selected: boolean;
  onChange: React.MouseEventHandler;
  service_name: React.ReactNode;
}

const IntervalToString = (interval: IWInterval) =>
  interval.start === interval.end
    ? WDateUtils.MinutesToPrintTime(interval.start)
    : interval.start === 0 && interval.end === 1440
      ? 'All Day'
      : `${WDateUtils.MinutesToPrintTime(interval.start)} - ${WDateUtils.MinutesToPrintTime(interval.end)}`;

const ServiceSelectionCheckbox = (props: ServiceSelectionCheckboxProps) => {
  const { selected, onChange, service_name } = props;
  return (
    <Chip
      label={service_name}
      size="small"
      clickable
      onDelete={(e: React.MouseEvent) => {
        onChange(e);
      }}
      onClick={(e) => {
        onChange(e);
      }}
      color={selected ? 'primary' : 'default'}
      deleteIcon={selected ? <Done fontSize="small" /> : <HighlightOff fontSize="small" />}
    />
  );
};

function useFulfillmentsWithOperatingHours() {
  const fulfillments = useFulfillments();
  return fulfillments.filter((x) => WDateUtils.HasOperatingHours(x.operatingHours));
}

function useSelectedFulfillments(selectedServices: string[]) {
  const fulfillments = useFulfillments();
  return useMemo(() => fulfillments.filter((v) => selectedServices.includes(v.id)), [fulfillments, selectedServices]);
}

const OptionsForDate = (
  fulfillments: Pick<
    FulfillmentConfig,
    'blockedOff' | 'timeStep' | 'leadTime' | 'leadTimeOffset' | 'operatingHours' | 'specialHours'
  >[],
  isoDate: string | null,
  currentTimeISO: string,
) => {
  if (fulfillments.length > 0 && isoDate) {
    const INFO = WDateUtils.GetInfoMapForAvailabilityComputation(fulfillments, isoDate, 0);
    return WDateUtils.GetOptionsForDate(INFO, isoDate, currentTimeISO);
  }
  return [];
};

function useOptionsForDate(isoDate: string | null, selectedServices: string[]) {
  const selectedFulfillments = useSelectedFulfillments(selectedServices);
  const currentTime = useCurrentTime();
  return useMemo(
    () => OptionsForDate(selectedFulfillments, isoDate, formatISO(currentTime)),
    [selectedFulfillments, isoDate, currentTime],
  );
}

type FulfillmentBlockOffListProps = { fId: string } & ValSetValNamed<boolean, 'isProcessing'>;

const FulfillmentBlockOffList = (props: FulfillmentBlockOffListProps) => {
  const fulfillmentName = useValueFromFulfillmentById(props.fId, 'displayName') ?? '';
  const fulfillmentBlockOffArray = useValueFromFulfillmentById(props.fId, 'blockedOff') ?? [];
  const removeMutation = useRemoveBlockOffMutation();

  const deleteBlockedOff = (fulfillmentId: string, isoDate: string, interval: IWInterval) => {
    removeMutation.mutate(
      { fulfillmentId, date: isoDate, interval },
      {
        onSuccess: () => {
          toast.success(
            `Removed ${IntervalToString(interval)} block on ${format(parseISO(isoDate), WDateUtils.ServiceDateDisplayFormat)} for ${fulfillmentName}`,
          );
          props.setIsProcessing(false);
        },
        onError: (error) => {
          toast.error(`Unable to update blocked off intervals. Got error: ${JSON.stringify(error)}.`);
          console.error(error);
          props.setIsProcessing(false);
        },
      },
    );
  };

  const removeBlockedOffInterval = (fulfillmentId: string, isoDate: string, interval: IWInterval) => {
    if (!props.isProcessing) {
      props.setIsProcessing(true);
      deleteBlockedOff(fulfillmentId, isoDate, interval);
    }
  };

  const removeAllForDate = (fulfillmentId: string, isoDate: string) => {
    removeBlockedOffInterval(fulfillmentId, isoDate, { start: 0, end: 1440 });
  };

  if (fulfillmentBlockOffArray.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="primary" fontWeight="medium" sx={{ display: 'block', mb: 0.75 }}>
        {fulfillmentName}
      </Typography>
      {fulfillmentBlockOffArray.map((entry) => (
        <Box key={entry.key} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          {/* Header row: date + delete */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {format(parseISO(entry.key), 'MMM d, yyyy')}
            </Typography>
            <IconButton
              size="small"
              disabled={props.isProcessing}
              onClick={() => {
                removeAllForDate(props.fId, entry.key);
              }}
              title="Clear all blocks for this day"
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
          {/* Chips row - full width */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {entry.value.map((interval, i) => (
              <Chip
                key={`${entry.key}-${String(i)}`}
                label={IntervalToString(interval)}
                size="small"
                variant="outlined"
                onDelete={() => {
                  removeBlockedOffInterval(props.fId, entry.key, interval);
                }}
                disabled={props.isProcessing}
              />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

function useNextAvailableServiceDate(selectedServices: string[]) {
  const selectedFulfillments = useSelectedFulfillments(selectedServices);
  const currentTime = useCurrentTime();
  return useMemo(
    () => GetNextAvailableServiceDate(selectedFulfillments, formatISO(currentTime), 0),
    [selectedFulfillments, currentTime],
  );
}

const DateSelector = ({
  selectedDate,
  selectedServices,
  setSelectedDate,
}: { selectedServices: string[] } & ValSetValNamed<string | null, 'selectedDate'>) => {
  const isoCurrentDate = useCurrentTime();
  const selectedFulfillments = useSelectedFulfillments(selectedServices);
  const minDate = useMemo(() => startOfDay(isoCurrentDate), [isoCurrentDate]);
  const getOptionsForDate = useCallback(
    (isoDate: string) => OptionsForDate(selectedFulfillments, isoDate, formatISO(isoCurrentDate)),
    [selectedFulfillments, isoCurrentDate],
  );
  const handleSetSelectedDate = useCallback(
    (date: Date | null) => {
      if (date) {
        const isoDate = WDateUtils.formatISODate(date);
        setSelectedDate(isoDate);
      } else {
        setSelectedDate(null);
      }
    },
    [setSelectedDate],
  );
  return (
    <DatePicker
      label="Date"
      slotProps={{
        textField: { size: 'small', sx: { width: 160 } },
      }}
      minDate={minDate}
      maxDate={add(minDate, { days: 60 })}
      shouldDisableDate={(e: Date) => getOptionsForDate(WDateUtils.formatISODate(e)).length === 0}
      value={selectedDate ? parseISO(selectedDate) : null}
      onChange={(date: Date | null) => {
        handleSetSelectedDate(date);
      }}
    />
  );
};

export const BlockOffComp = () => {
  const fulfillmentIdsAndNames = useFulfillmentsWithOperatingHours();
  const [selectedServices, setSelectedServices] = useState<string[]>(fulfillmentIdsAndNames.map((x) => x.id));
  const nextAvailableDate = useNextAvailableServiceDate(selectedServices);
  const [selectedDate, setSelectedDate] = useState<string | null>(nextAvailableDate?.selectedDate ?? null);
  const [startTime, setStartTime] = useState<number | null>(nextAvailableDate?.selectedTime ?? null);
  const [endTime, setEndTime] = useState<number | null>(nextAvailableDate?.selectedTime ?? null);

  const canPostBlockedOff = useMemo(
    () => selectedDate !== null && startTime !== null && endTime !== null,
    [selectedDate, startTime, endTime],
  );

  const timeOptions = useOptionsForDate(selectedDate, selectedServices);
  const endTimeOptions = useMemo(
    () =>
      startTime !== null ? TrimOptionsBeforeDisabled(timeOptions.filter((x) => x.value >= startTime)) : timeOptions,
    [startTime, timeOptions],
  );

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSetSelectedDate = useCallback(
    (date: string | null) => {
      setSelectedDate(date || nextAvailableDate?.selectedDate || null);
    },
    [setSelectedDate, nextAvailableDate],
  );

  useEffect(() => {
    if (selectedServices.length === 0 && fulfillmentIdsAndNames.length > 0) {
      setSelectedServices(fulfillmentIdsAndNames.map((x) => x.id));
    }
  }, [selectedServices, fulfillmentIdsAndNames]);

  // make sure we stay on a day with options
  useEffect(() => {
    if (timeOptions.length === 0) {
      // go to find next available
      if (nextAvailableDate) {
        setSelectedDate(nextAvailableDate.selectedDate);
        setStartTime(nextAvailableDate.selectedTime);
        setEndTime(nextAvailableDate.selectedTime);
      }
    }
  }, [timeOptions, nextAvailableDate]);

  useEffect(() => {
    if (timeOptions.length && (startTime === null || timeOptions.findIndex((x) => x.value === startTime) === -1)) {
      setStartTime(timeOptions[0].value);
    }
  }, [timeOptions, startTime]);

  useEffect(() => {
    if (
      endTimeOptions.length &&
      startTime !== null &&
      (endTime === null || endTimeOptions.findIndex((x) => x.value === endTime) === -1 || endTime < startTime)
    ) {
      setEndTime(endTimeOptions[0].value);
    }
  }, [endTimeOptions, endTime, startTime]);

  const blockOffMutation = useBlockOffMutation();

  const postBlockedOff = () => {
    if (!isProcessing && selectedDate !== null && startTime !== null && endTime !== null) {
      const interval = {
        start: startTime,
        end: endTime,
      };
      const body: PostBlockedOffToFulfillmentsRequest = {
        date: selectedDate,
        fulfillmentIds: selectedServices,
        interval,
      };

      blockOffMutation.mutate(body, {
        onSuccess: () => {
          toast.success(
            `Blocked off ${IntervalToString(interval)} on ${format(parseISO(selectedDate), WDateUtils.ServiceDateDisplayFormat)} for ${selectedServices.map((fId) => fulfillmentIdsAndNames.find((x) => x.id === fId)?.displayName).join(', ')}`,
          );
          // Reset to first available time for next entry
          if (timeOptions.length > 0) {
            setStartTime(timeOptions[0].value);
            setEndTime(timeOptions[0].value);
          } else {
            setStartTime(null);
            setEndTime(null);
          }
        },
        onError: (error) => {
          toast.error(`Unable to update blocked off intervals. Got error: ${JSON.stringify(error)}.`);
          console.error(error);
        },
      });
    }
  };

  const onChangeServiceSelection = (fulfillmentId: string) => {
    const loc = selectedServices.indexOf(fulfillmentId);
    if (loc === -1) {
      setSelectedServices([...selectedServices, fulfillmentId]);
    } else {
      const newSelectedServices = [...selectedServices];
      newSelectedServices.splice(loc, 1);
      setSelectedServices(newSelectedServices);
    }
  };

  if (fulfillmentIdsAndNames.length === 0) {
    return <Typography color="text.secondary">Fulfillments need operating hours for this feature.</Typography>;
  }

  return (
    <Box>
      <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
        Block Off Time
      </Typography>

      {/* Service toggles - compact row */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
        {fulfillmentIdsAndNames.map((x) => (
          <ServiceSelectionCheckbox
            key={x.id}
            service_name={x.displayName}
            selected={selectedServices.indexOf(x.id) !== -1}
            onChange={() => {
              onChangeServiceSelection(x.id);
            }}
          />
        ))}
      </Box>

      {/* Row 1: Date */}
      <Box sx={{ mb: 1 }}>
        <DateSelector
          selectedDate={selectedDate}
          selectedServices={selectedServices}
          setSelectedDate={handleSetSelectedDate}
        />
      </Box>

      {/* Row 2: Start → End → Add */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Autocomplete
          sx={{ flex: 1, minWidth: 110 }}
          size="small"
          disableClearable
          options={timeOptions.filter((x) => !x.disabled).map((x) => x.value)}
          isOptionEqualToValue={(o, v) => o === v}
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          getOptionLabel={(x) => (x !== null ? WDateUtils.MinutesToPrintTime(x) : '')}
          value={startTime ?? undefined}
          onChange={(_, v) => {
            setStartTime(v);
          }}
          disabled={selectedDate === null}
          renderInput={(params) => <TextField {...params} label="Start" />}
        />
        <Autocomplete
          sx={{ flex: 1, minWidth: 110 }}
          size="small"
          disableClearable
          options={endTimeOptions.filter((x) => !x.disabled).map((x) => x.value)}
          isOptionEqualToValue={(o, v) => o === v}
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          getOptionLabel={(x) => (x !== null ? WDateUtils.MinutesToPrintTime(x) : '')}
          value={endTime ?? undefined}
          onChange={(_, v) => {
            setEndTime(v);
          }}
          disabled={selectedDate === null || startTime === null}
          renderInput={(params) => <TextField {...params} label="End" />}
        />
        <Button variant="contained" size="small" onClick={postBlockedOff} disabled={!canPostBlockedOff || isProcessing}>
          Add
        </Button>
      </Box>

      {/* Existing Blocked Intervals - cleaner display */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
        Existing Blocks
      </Typography>
      {fulfillmentIdsAndNames.map((fulfillment) => (
        <FulfillmentBlockOffList
          fId={fulfillment.id}
          key={fulfillment.id}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
        />
      ))}
    </Box>
  );
};
