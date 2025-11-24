import { useAuth0 } from '@auth0/auth0-react';
import { add, format, formatISO, parseISO, startOfDay } from "date-fns";
import { useSnackbar } from "notistack";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Done, HighlightOff } from '@mui/icons-material';
import {
  Autocomplete,
  Button,
  Card,
  CardHeader,
  Chip,
  Container,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField
} from '@mui/material';
import { LocalizationProvider, StaticDatePicker } from '@mui/x-date-pickers';

import { type FulfillmentConfig, GetNextAvailableServiceDate, type IWInterval, type PostBlockedOffToFulfillmentsRequest, WDateUtils } from "@wcp/wario-shared";
import { getFulfillmentById, getFulfillments, SelectDateFnsAdapter, type ValSetValNamed, weakMapCreateSelector } from "@wcp/wario-ux-shared";

import { useAppSelector } from "@/hooks/useRedux";

import { HOST_API } from '@/config';
import { type RootState } from "@/redux/store";

const TrimOptionsBeforeDisabled = function <T extends { disabled: boolean; }>(opts: T[]) {
  const idx = opts.findIndex((elt: T) => elt.disabled);
  return idx === -1 ? opts : opts.slice(0, idx);
}

interface ServiceSelectionCheckboxProps {
  selected: boolean;
  onChange: React.MouseEventHandler<HTMLDivElement>;
  service_name: React.ReactNode;
}

const IntervalToString = (interval: IWInterval) => interval.start === interval.end ?
  WDateUtils.MinutesToPrintTime(interval.start) :
  (interval.start === 0 && interval.end === 1440 ?
    'all day' :
    `${WDateUtils.MinutesToPrintTime(interval.start)} to ${WDateUtils.MinutesToPrintTime(interval.end)}`);

const ServiceSelectionCheckbox = (props: ServiceSelectionCheckboxProps) => {
  const { selected, onChange, service_name } = props;
  return (
    <Chip
      label={service_name}
      clickable
      onDelete={(e) => { onChange(e); }}
      onClick={(e) => { onChange(e); }}
      color={selected ? "primary" : "default"}
      deleteIcon={selected ? <Done /> : <HighlightOff />}
    />
  )
}

const selectFulfillmentIdAndNamesWithOperatingHours = weakMapCreateSelector(
  (s: RootState) => s.ws.fulfillments,
  (fulfillments) => getFulfillments(fulfillments).filter(x => WDateUtils.HasOperatingHours(x.operatingHours)).map(x => ({ id: x.id, name: x.displayName }))
)

const selectSelectedFulfillments = weakMapCreateSelector(
  (s: RootState, _selectedServices: string[]) => s.ws.fulfillments,
  (s: RootState, selectedServices: string[]) => selectedServices,
  (fulfillments, selectedFulfillments) => selectedFulfillments.map(x => getFulfillmentById(fulfillments, x))
)

const OptionsForDate = (fulfillments: Pick<FulfillmentConfig, "blockedOff" | "timeStep" | "leadTime" | "leadTimeOffset" | "operatingHours" | "specialHours">[], isoDate: string | null, currentTimeISO: string) => {
  if (fulfillments.length > 0 && isoDate) {
    const INFO = WDateUtils.GetInfoMapForAvailabilityComputation(fulfillments, isoDate, 0);
    return WDateUtils.GetOptionsForDate(INFO, isoDate, currentTimeISO);
  }
  return [];
}

const selectOptionsForDate = weakMapCreateSelector(
  (s: RootState, _isoDate: string | null, selectedServices: string[]) => selectSelectedFulfillments(s, selectedServices),
  (_s: RootState, isoDate: string | null, _selectedServices: string[]) => isoDate,
  (s: RootState, _isoDate: string | null, _selectedServices: string[]) => formatISO(s.ws.currentTime),
  (selectedServices, isoDate, currentTimeIsoString) => OptionsForDate(selectedServices, isoDate, currentTimeIsoString)
)

type FulfillmentBlockOffListProps = { fId: string } & ValSetValNamed<boolean, 'isProcessing'>;
const FulfillmentBlockOffList = (props: FulfillmentBlockOffListProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const { getAccessTokenSilently } = useAuth0();
  const filteredFulfillments = useAppSelector(selectFulfillmentIdAndNamesWithOperatingHours);
  const fulfillmentName = useAppSelector((s: RootState) => getFulfillmentById(s.ws.fulfillments, props.fId).displayName);
  const fulfillmentBlockOffArray = useAppSelector((s: RootState) => getFulfillmentById(s.ws.fulfillments, props.fId).blockedOff);
  const deleteBlockedOff = async (fulfillmentId: string, isoDate: string, interval: IWInterval) => {
    try {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:order_config" } });
      const body: PostBlockedOffToFulfillmentsRequest = {
        date: isoDate,
        fulfillmentIds: [fulfillmentId],
        interval: interval
      };
      const response = await fetch(
        `${HOST_API}/api/v1/config/timing/blockoff`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      if (response.status === 201) {
        enqueueSnackbar(`
            Removed ${IntervalToString(interval)} block on
            ${format(parseISO(isoDate), WDateUtils.ServiceDateDisplayFormat)}
            for ${fulfillmentName}`)
      }
    } catch (error) {
      enqueueSnackbar(`Unable to update blocked off intervals. Got error: ${JSON.stringify(error)}.`, { variant: "error" });
      console.error(error);
    }
  };

  const removeBlockedOffForDate = async (fulfillmentId: string, isoDate: string) => {
    return removeBlockedOffInterval(fulfillmentId, isoDate, { start: 0, end: 1440 })
  }

  const removeBlockedOffInterval = async (fulfillmentId: string, isoDate: string, interval: IWInterval) => {
    if (!props.isProcessing) {
      props.setIsProcessing(true);
      await deleteBlockedOff(fulfillmentId, isoDate, interval);
      props.setIsProcessing(false);
    }
  }
  return fulfillmentBlockOffArray.length > 0 ? <Grid
    key={props.fId}
    sx={{ mx: 'auto' }}
    size={{
      xs: 12,
      md: Math.min(Math.max(Math.floor(12 / filteredFulfillments.length), 6), 6),
      lg: Math.min(Math.max(Math.floor(12 / filteredFulfillments.length), 4), 4)
    }}>
    <Card>
      <CardHeader title={`${fulfillmentName} Blocked-Off Intervals`} />
      <List component="nav">
        { /* Note: the blocked off array should be pre-sorted */}
        {fulfillmentBlockOffArray.map((entry) => (
          <Container key={`${props.fId}.${entry.key}`}>
            <ListItem
              secondaryAction={
                <IconButton hidden={entry.value.length === 0} edge="end" size="small" disabled={props.isProcessing} aria-label="delete" onClick={() => void removeBlockedOffForDate(props.fId, entry.key)}>
                  <HighlightOff />
                </IconButton>}>
              {format(parseISO(entry.key), WDateUtils.ServiceDateDisplayFormat)}
            </ListItem>
            <List sx={{ ml: 2 }}>
              {entry.value.map((interval, i) => {
                return (
                  <ListItem key={i} secondaryAction={<IconButton edge="end" size="small" disabled={props.isProcessing} aria-label="delete" onClick={() => void removeBlockedOffInterval(props.fId, entry.key, interval)}>
                    <HighlightOff />
                  </IconButton>}>
                    <ListItemText primary={IntervalToString(interval)} />
                  </ListItem>
                );
              })}
            </List>
          </Container>
        ))}
      </List>
    </Card>
  </Grid> : <></>;
}

export const selectNextAvailableServiceDate = weakMapCreateSelector(
  (s: RootState, _selectedServices: string[]) => s.ws.currentTime,
  (s: RootState, _selectedServices: string[]) => s.ws.fulfillments,
  (_s: RootState, selectedServices: string[]) => selectedServices,
  (currentTime, fulfillments, selectedServices) => GetNextAvailableServiceDate(selectedServices.map(x => getFulfillmentById(fulfillments, x)), formatISO(currentTime), 0)
);


const DateSelector = ({ selectedDate, selectedServices, setSelectedDate }: { selectedServices: string[] } & ValSetValNamed<string | null, 'selectedDate'>) => {
  const DateAdapter = useAppSelector(SelectDateFnsAdapter);
  const isoCurrentDate = useAppSelector(s => formatISO(s.ws.currentTime));
  const selectedFulfillmentInfo = useAppSelector(s => selectSelectedFulfillments(s, selectedServices));
  const minDate = useMemo(() => startOfDay(isoCurrentDate), [isoCurrentDate]);
  const getOptionsForDate = useCallback((isoDate: string) =>
    OptionsForDate(selectedFulfillmentInfo, isoDate, isoCurrentDate),
    [selectedFulfillmentInfo, isoCurrentDate]);
  const handleSetSelectedDate = useCallback((date: Date | null) => {
    if (date) {
      const isoDate = WDateUtils.formatISODate(date);
      setSelectedDate(isoDate);
    } else {
      setSelectedDate(null);
    }
  }, [setSelectedDate]);
  return (<LocalizationProvider dateAdapter={DateAdapter}>
    <StaticDatePicker
      slotProps={{ toolbar: { hidden: true } }}
      displayStaticWrapperAs="desktop"
      openTo="day"
      minDate={minDate}
      maxDate={add(minDate, { days: 60 })}
      shouldDisableDate={(e: string | number | Date) => getOptionsForDate(WDateUtils.formatISODate(e)).length === 0}
      value={selectedDate ? parseISO(selectedDate) : null}
      onChange={(date: Date | null) => { handleSetSelectedDate(date); }}
    />
  </LocalizationProvider>)
}

export const BlockOffComp = () => {
  const { enqueueSnackbar } = useSnackbar();

  const fulfillmentIdsAndNames = useAppSelector(selectFulfillmentIdAndNamesWithOperatingHours);

  const [selectedServices, setSelectedServices] = useState<string[]>(fulfillmentIdsAndNames.map(x => x.id));
  const nextAvailableDate = useAppSelector(s => selectNextAvailableServiceDate(s, selectedServices));

  const [selectedDate, setSelectedDate] = useState<string | null>(nextAvailableDate?.selectedDate ?? null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  const canPostBlockedOff = useMemo(() => selectedDate !== null && startTime !== null && endTime !== null, [selectedDate, startTime, endTime]);

  const timeOptions = useAppSelector(s => selectOptionsForDate(s, selectedDate, selectedServices));
  const endTimeOptions = useMemo(() => startTime !== null ? TrimOptionsBeforeDisabled(timeOptions.filter(x => x.value >= startTime)) : timeOptions, [startTime, timeOptions]);

  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const handleSetSelectedDate = useCallback((date: string | null) => { setSelectedDate(date || nextAvailableDate?.selectedDate || null); }, [setSelectedDate, nextAvailableDate])

  useEffect(() => {
    if (selectedServices.length === 0 && fulfillmentIdsAndNames.length > 0) {
      setSelectedServices(fulfillmentIdsAndNames.map(x => x.id));
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
    if (timeOptions.length && (startTime === null || timeOptions.findIndex(x => x.value === startTime) === -1)) {
      setStartTime(timeOptions[0].value);
    }
  }, [timeOptions, startTime])

  useEffect(() => {
    if (endTimeOptions.length && startTime !== null &&
      (endTime === null ||
        endTimeOptions.findIndex(x => x.value === endTime) === -1 ||
        endTime < startTime)) {
      setEndTime(endTimeOptions[0].value);
    }
  }, [endTimeOptions, endTime, startTime])


  const postBlockedOff = async () => {
    if (!isProcessing && selectedDate !== null && startTime !== null && endTime !== null) {
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:order_config" } });
        const interval = {
          start: startTime,
          end: endTime
        };
        const body: PostBlockedOffToFulfillmentsRequest = {
          date: selectedDate,
          fulfillmentIds: selectedServices,
          interval
        };
        const response = await fetch(
          `${HOST_API}/api/v1/config/timing/blockoff`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );
        if (response.status === 201) {
          enqueueSnackbar(`Blocked off ${IntervalToString(interval)} on
              ${format(parseISO(selectedDate), WDateUtils.ServiceDateDisplayFormat)} 
              for services: ${selectedServices.map(fId => fulfillmentIdsAndNames.find((x) => x.id === fId)!.name).join(', ')}`)
          setStartTime(null);
          setEndTime(null);
        }
      } catch (error) {
        enqueueSnackbar(`Unable to update blocked off intervals. Got error: ${JSON.stringify(error)}.`, { variant: "error" });
        console.error(error);
      }
    }
  };

  const onChangeServiceSelection = (fulfillmentId: string) => {
    const loc = selectedServices.indexOf(fulfillmentId);
    if (loc === -1) {
      setSelectedServices([...selectedServices, fulfillmentId]);
    } else {
      const newSelectedServices = [...selectedServices]
      newSelectedServices.splice(loc, 1);
      setSelectedServices(newSelectedServices);
    }
  }

  return fulfillmentIdsAndNames.length === 0 ? <div>Fulfillments need operating hours for this page to be useful</div> :
    <>
      <Grid size={12}>
        <Card>
          <CardHeader title="Add Blocked-Off Time:" sx={{ mb: 3 }} />
          <Grid container>
            <Grid container sx={{ mx: 6 }} size={12}>
              {
                fulfillmentIdsAndNames.map((x) => (
                  <Grid key={x.id} size={Math.floor(12 / fulfillmentIdsAndNames.length)}>
                    <ServiceSelectionCheckbox
                      service_name={x.name}
                      selected={selectedServices.indexOf(x.id) !== -1}
                      onChange={() => { onChangeServiceSelection(x.id); }}
                    />
                  </Grid>
                ))
              }
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 7
              }}>
              <DateSelector selectedDate={selectedDate} selectedServices={selectedServices} setSelectedDate={handleSetSelectedDate} />
            </Grid>
            <Grid
              container
              spacing={2}
              sx={{ my: 'auto', px: 1, pb: 1 }}
              size={{
                xs: 12,
                sm: 5
              }}>
              <Grid
                sx={{ py: 2, mx: 'auto', alignContent: "center" }}
                size={{
                  xs: 5,
                  sm: 12
                }}>
                <Autocomplete
                  sx={{ m: 'auto', maxWidth: 200 }}
                  disableClearable
                  className="col"
                  options={timeOptions.filter(x => !x.disabled).map(x => x.value)}
                  isOptionEqualToValue={(o, v) => o === v}
                  getOptionLabel={x => x !== null ? WDateUtils.MinutesToPrintTime(x) : ""}
                  value={startTime ? startTime : undefined}
                  onChange={(_, v) => { setStartTime(v); }}
                  disabled={selectedDate === null}
                  renderInput={(params) => <TextField {...params} label={"Start"}
                  />}
                />
              </Grid>
              <Grid
                sx={{ py: 2, mx: 'auto', alignContent: "center" }}
                size={{
                  xs: 5,
                  sm: 12
                }}>
                <Autocomplete
                  sx={{ m: 'auto', maxWidth: 200 }}
                  disableClearable
                  className="col"
                  options={endTimeOptions.filter(x => !x.disabled).map(x => x.value)}
                  isOptionEqualToValue={(o, v) => o === v}
                  getOptionLabel={x => x !== null ? WDateUtils.MinutesToPrintTime(x) : ""}
                  value={endTime ? endTime : undefined}
                  onChange={(_, v) => { setEndTime(v); }}
                  disabled={selectedDate === null || startTime === null}
                  renderInput={(params) => <TextField  {...params} label={"End"}
                  />}
                />
              </Grid>
              <Grid
                sx={{ mx: 'auto', py: 2, alignContent: "center" }}
                size={{
                  xs: 2,
                  sm: 12
                }}>
                <Button sx={{ m: 'auto', width: '100%', height: '100%' }} onClick={() => void postBlockedOff()} disabled={!canPostBlockedOff || isProcessing}>
                  Add
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Card>
      </Grid>
      <Grid container sx={{ py: 3 }} spacing={3}>
        {fulfillmentIdsAndNames.map((fulfillment) => <FulfillmentBlockOffList fId={fulfillment.id} key={fulfillment.id} isProcessing={isProcessing} setIsProcessing={setIsProcessing} />)}
      </Grid>
    </>;
};