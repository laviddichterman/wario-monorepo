import { add, formatISO, isValid, parseISO, startOfDay } from 'date-fns';
import { enqueueSnackbar } from 'notistack';
import React, { useCallback, useEffect, useMemo } from 'react';

import { Autocomplete, Checkbox, FormControlLabel, Grid, Radio, RadioGroup, TextField } from '@mui/material';
import { LocalizationProvider, StaticDatePicker } from '@mui/x-date-pickers';

import { FulfillmentType, WDateUtils } from '@wcp/wario-shared';
import { ErrorResponseOutput, getFulfillments, SelectDateFnsAdapter, Separator, StageTitle } from '@wcp/wario-ux-shared';

import { SelectHasOperatingHoursForService } from '@/app/selectors';
import { SelectFulfillmentMaxGuests, SelectFulfillmentService, SelectFulfillmentServiceTerms } from '@/app/selectors';
import { GetNextAvailableServiceDateTime, SelectOptionsForServicesAndDate } from '@/app/slices/ListeningMiddleware';
import { nextStage } from '@/app/slices/StepperSlice';
import { setDate, setDineInInfo, setHasAgreedToTerms, setService, setTime } from '@/app/slices/WFulfillmentSlice';
import { setTimeToServiceDate, setTimeToServiceTime } from '@/app/slices/WMetricsSlice';
import { useAppDispatch, useAppSelector } from '@/app/useHooks';

import DeliveryInfoForm from '../DeliveryValidationForm';
import { Navigation } from '../Navigation';


export default function WFulfillmentStageComponent() {
  const dispatch = useAppDispatch();
  const fulfillments = useAppSelector(s => getFulfillments(s.ws.fulfillments));
  const DateAdapter = useAppSelector(s => SelectDateFnsAdapter(s));
  // const HasSpaceForPartyOf = useCallback((partySize: number, orderDate: string, orderTime: number) => true, []);
  const HasOperatingHoursForService = useAppSelector(s => (fulfillmentId: string) => SelectHasOperatingHoursForService(s, fulfillmentId));
  const OptionsForServicesAndDate = useAppSelector(s => (selectedDate: string, selectedServices: string[]) => SelectOptionsForServicesAndDate(s, selectedDate, selectedServices));
  const currentTime = useAppSelector(s => s.ws.currentTime);
  const selectedService = useAppSelector(s => s.fulfillment.selectedService);
  const serviceDate = useAppSelector(s => s.fulfillment.selectedDate);
  const serviceTime = useAppSelector(s => s.fulfillment.selectedTime);
  const serviceTerms = useAppSelector(s => SelectFulfillmentServiceTerms(s) || []);
  const serviceServiceEnum = useAppSelector(SelectFulfillmentService);
  const serviceServiceMaxGuests = useAppSelector(SelectFulfillmentMaxGuests);
  const hasAgreedToTerms = useAppSelector(s => s.fulfillment.hasAgreedToTerms);
  const dineInInfo = useAppSelector(s => s.fulfillment.dineInInfo);
  const deliveryInfo = useAppSelector(s => s.fulfillment.deliveryInfo);
  const hasSelectedTimeExpired = useAppSelector(s => s.fulfillment.hasSelectedTimeExpired);
  const hasSelectedDateExpired = useAppSelector(s => s.fulfillment.hasSelectedDateExpired);
  const nextAvailableDateTime = useAppSelector(s => GetNextAvailableServiceDateTime(s).selectedDate);
  const hasAgreedToTermsIfAny = useMemo(() => (serviceTerms.length === 0 || hasAgreedToTerms), [serviceTerms, hasAgreedToTerms]);
  const hasCompletedDineInInfoIfNeeded = useMemo(() => (serviceServiceEnum !== FulfillmentType.DineIn || dineInInfo !== null), [serviceServiceEnum, dineInInfo]);
  const hasCompletedDeliveryInfoIfNeeded = useMemo(() => (serviceServiceEnum !== FulfillmentType.Delivery || deliveryInfo !== null), [serviceServiceEnum, deliveryInfo]);
  const hasSelectedServiceDateAndTime = useMemo(() => selectedService !== null && serviceDate !== null && serviceTime !== null && serviceServiceEnum !== null, [serviceDate, serviceTime, selectedService, serviceServiceEnum]);

  const missingInformationText = useMemo(() => {
    if (!hasSelectedServiceDateAndTime) {
      return "Please select a service, date, and time.";
    }
    if (!hasAgreedToTermsIfAny) {
      return "Please agree to the terms and conditions above.";
    }
    if (!hasCompletedDineInInfoIfNeeded) {
      return "Please select a party size.";
    }
    if (!hasCompletedDeliveryInfoIfNeeded) {
      return "Please fill out the delivery information.";
    }
  }, [hasSelectedServiceDateAndTime, hasAgreedToTermsIfAny, hasCompletedDineInInfoIfNeeded, hasCompletedDeliveryInfoIfNeeded]);
  const valid = useMemo(() => {
    return hasSelectedServiceDateAndTime &&
      hasAgreedToTermsIfAny &&
      hasCompletedDineInInfoIfNeeded &&
      hasCompletedDeliveryInfoIfNeeded;
  }, [hasSelectedServiceDateAndTime, hasAgreedToTermsIfAny, hasCompletedDineInInfoIfNeeded, hasCompletedDeliveryInfoIfNeeded]);
  const OptionsForDate = useCallback((d: string | null) => {
    if (selectedService !== null && d !== null) {
      const parsedDate = parseISO(d);
      if (isValid(parsedDate)) {
        return OptionsForServicesAndDate(d, [selectedService]);
      }
    }
    return [];
  }, [OptionsForServicesAndDate, selectedService]);

  const hasOptionsForSameDay = useMemo(() => {
    return OptionsForDate(formatISO(currentTime, { representation: 'date' })).length > 0;
  }, [OptionsForDate, currentTime]);

  const canSelectService = useCallback((_fId: string) => true, []);
  const TimeOptions = useMemo(() => serviceDate !== null ? OptionsForDate(serviceDate).reduce((acc: { [index: number]: { value: number, disabled: boolean } }, v) => ({ ...acc, [v.value]: v }), {}) : {}, [OptionsForDate, serviceDate]);

  const ServiceOptions = useMemo(() => {
    return fulfillments.filter((fulfillment) =>
      fulfillment.exposeFulfillment && HasOperatingHoursForService(fulfillment.id))
      .sort((x, y) => x.ordinal - y.ordinal)
      .map((fulfillment) => {
        return { label: fulfillment.displayName, value: fulfillment.id, disabled: !canSelectService(fulfillment.id) };
      });
  }, [fulfillments, canSelectService, HasOperatingHoursForService]);

  const onChangeServiceSelection = (_event: React.ChangeEvent<HTMLInputElement>, value: string) => {
    dispatch(setService(value));
  }
  const onSetHasAgreedToTerms = (checked: boolean) => {
    dispatch(setHasAgreedToTerms(checked));
  }
  const onSetServiceDate = (v: Date | number | null) => {
    if (v !== null) {
      const serviceDateString = formatISO(v, { representation: 'date' });
      // check if the selected servicetime is valid in the new service date
      if (serviceTime !== null) {
        const newDateOptions = OptionsForDate(serviceDateString);
        const foundServiceTimeOption = newDateOptions.findIndex(x => x.value === serviceTime);
        if (foundServiceTimeOption === -1) {
          onSetServiceTime(null)
        }
      }
      dispatch(setDate(serviceDateString));
      dispatch(setTimeToServiceDate(Date.now()));
    }
  }
  const onSetServiceTime = (v: number | null) => {
    dispatch(setTime(v));
    if (v !== null) {
      dispatch(setTimeToServiceTime(Date.now()));
    }
  }

  const onSetDineInInfo = (v: number) => {
    dispatch(setDineInInfo({ partySize: v }));
  }

  // if the service date is null and there are options for the same day, set the service date to the current time
  useEffect(() => {
    if (serviceDate === null && hasOptionsForSameDay) {
      onSetServiceDate(currentTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceDate, hasOptionsForSameDay, onSetServiceDate]);
  return (
    <>
      <StageTitle>How and when would you like your order?</StageTitle>
      <Separator sx={{ pb: 3 }} />
      {/* <div>Current Time as computed... {formatISO(currentTime)}</div>
      <div>Browser thinks it is... {formatISO(Date.now())}</div>
      <div>Selected Service? {JSON.stringify(selectedService)}</div>
      <div>Service Date {serviceDate ? serviceDate : "none"} in ISO Date {serviceDate ? formatISO(parseISO(serviceDate)) : "none"}</div> */}
      <Grid container alignItems="center">
        <Grid
          sx={{ pl: 3, pb: 5 }}
          size={{
            xs: 12,
            xl: 4
          }}>
          <span>Requested Service:</span>
          <RadioGroup
            row onChange={onChangeServiceSelection} value={selectedService}>
            {ServiceOptions.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio />}
                label={option.label}
              />
            ))}
          </RadioGroup>
        </Grid>
        <Grid
          sx={serviceTerms.length === 0 ? { display: 'none' } : {}}
          size={{
            xs: 12,
            xl: 8
          }}>
          <FormControlLabel control={
            <><Checkbox checked={hasAgreedToTerms} onChange={(_, checked) => { onSetHasAgreedToTerms(checked); }} />
            </>} label={<>
              REQUIRED: Please read the following! By selecting the checkbox, you and all members of your party understand and agree to:
              <ul>
                {serviceTerms.map((term, i) => <li key={i}>{term}</li>)}
              </ul>
            </>
            } />
        </Grid>
        <Grid
          sx={{ justifyContent: 'center', alignContent: 'center', display: 'flex', pb: 3, ...(selectedService === null ? { display: 'none' } : {}) }}
          size={{
            xs: 12,
            xl: serviceTerms.length > 0 ? 6 : 4,
            lg: 6
          }}>
          <LocalizationProvider dateAdapter={DateAdapter}>
            <StaticDatePicker
              displayStaticWrapperAs="desktop"
              openTo="day"
              disableHighlightToday={!hasOptionsForSameDay}
              disablePast
              minDate={startOfDay(parseISO(nextAvailableDateTime))}
              maxDate={add(currentTime, { days: 6 })}
              shouldDisableDate={(e: Date) => OptionsForDate(formatISO(e, { representation: 'date' })).length === 0}
              value={serviceDate ? parseISO(serviceDate) : null}
              onChange={(v: Date | null) => { onSetServiceDate(v); }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid
          container
          sx={{ justifyContent: 'center', alignContent: 'center', display: 'flex', ...(selectedService === null ? { display: 'none' } : {}) }}
          size={{
            xs: 12,
            xl: serviceTerms.length > 0 ? 6 : 4,
            lg: 6
          }}>
          <Grid sx={{ pb: 5 }} size={12}>
            <Autocomplete
              sx={{ justifyContent: 'center', alignContent: 'center', display: 'flex', width: 300, margin: 'auto' }}
              openOnFocus
              disableClearable
              noOptionsText={"Select an available service date first"}
              id="service-time"
              options={Object.values(TimeOptions).map(x => x.value)}
              getOptionDisabled={o => TimeOptions[o].disabled}
              isOptionEqualToValue={(o, v) => o === v}
              getOptionLabel={o => o ? WDateUtils.MinutesToPrintTime(o) : ""}
              // @ts-expect-error remove once verified this isn't needed
              value={serviceTime || null}
              //sx={{ width: 300 }}
              onChange={(_, v) => { onSetServiceTime(v); }}
              renderInput={(params) => <TextField {...params} label="Time" error={hasSelectedTimeExpired} helperText={hasSelectedTimeExpired ? "The previously selected service time has expired." : "Please note this time can change depending on what you order. Times are confirmed after orders are sent."} />}
            />
          </Grid>
          {(serviceServiceEnum !== null && serviceServiceEnum === FulfillmentType.DineIn && serviceDate !== null) &&
            (<Grid sx={{ pb: 5 }} size={12}>
              <Autocomplete
                sx={{ justifyContent: 'center', alignContent: 'center', display: 'flex', width: 300, margin: 'auto' }}
                disablePortal
                openOnFocus
                disableClearable
                disabled={serviceTime === null}
                className="guest-count"
                options={[...Array<number>((serviceServiceMaxGuests ?? 50) - 1)].map((_, i) => i + 1)}
                getOptionDisabled={_o => serviceTime === null /*|| !HasSpaceForPartyOf(o, serviceDate, serviceTime)*/}
                getOptionLabel={o => String(o)}
                // @ts-expect-error remove once verified this isn't needed
                value={dineInInfo?.partySize ?? null}
                onChange={(_, v) => { onSetDineInInfo(v); }}
                renderInput={(params) => <TextField {...params} label="Party Size" />}
              />
            </Grid>)}
        </Grid>
        {(serviceServiceEnum !== null && serviceServiceEnum === FulfillmentType.Delivery && serviceDate !== null) &&
          <Grid size={12}>
            <DeliveryInfoForm />
          </Grid>}
      </Grid>
      {hasSelectedDateExpired && <ErrorResponseOutput>The previously selected service date has expired.</ErrorResponseOutput>}
      <Navigation hidden={serviceTime === null} hasBack={false}
        onNextWhenDisabled={{
          onMouseOver: () => enqueueSnackbar(missingInformationText, { variant: 'warning' })
        }} canBack={false} canNext={valid} handleBack={() => { return; }} handleNext={() => dispatch(nextStage())} />
    </>
  );
}