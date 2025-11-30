import { add, formatISO, parseISO, startOfDay } from 'date-fns';
import { enqueueSnackbar } from 'notistack';
import { useCallback, useEffect, useMemo } from 'react';

import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';

import { FulfillmentType, WDateUtils } from '@wcp/wario-shared';
import { useFulfillmentById, useFulfillmentMaxGuests, useFulfillments, useFulfillmentService, useServerTime } from '@wcp/wario-ux-shared/query';
import { ErrorResponseOutput, Separator, StageTitle } from '@wcp/wario-ux-shared/styled';

import { useCartBasedLeadTime, useNextAvailableServiceDateTimeForSelectedOrDefaultFulfillment, useOptionsForFulfillmentAndDate, usePropertyFromSelectedFulfillment } from '@/hooks/useDerivedState';

import { selectSelectedService, useFulfillmentStore } from '@/stores/useFulfillmentStore';
import { useMetricsStore } from '@/stores/useMetricsStore';
import { useStepperStore } from '@/stores/useStepperStore';

import DeliveryInfoForm from '../DeliveryValidationForm';
import { Navigation } from '../Navigation';

function useSortedVisibleFulfillments() {
  const fulfillments = useFulfillments();
  const ServiceOptions = useMemo(() => {
    return fulfillments.filter((fulfillment) =>
      fulfillment.exposeFulfillment && WDateUtils.HasOperatingHours(fulfillment.operatingHours))
      .sort((x, y) => x.ordinal - y.ordinal)
      .map((fulfillment) => {
        return { label: fulfillment.displayName, value: fulfillment.id, disabled: false };
      });
  }, [fulfillments]);
  return ServiceOptions;
}

function useServiceTerms() {
  const serviceTerms = usePropertyFromSelectedFulfillment('terms');
  return serviceTerms || [];
}

function useHasOptionsForSameDay() {
  const selectedFulfillmentId = useFulfillmentStore(selectSelectedService);
  const { currentTime } = useServerTime();
  const options = useOptionsForFulfillmentAndDate(formatISO(currentTime, { representation: 'date' }), selectedFulfillmentId || "");
  return options.length > 0;
}

function FulfillmentTimeAndDetailsSection() {
  const nextAvailableDateTime = useNextAvailableServiceDateTimeForSelectedOrDefaultFulfillment();
  const { currentTime } = useServerTime();
  const {
    selectedDate: serviceDate,
    selectedService,
    selectedTime: serviceTime,
    hasAgreedToTerms,
    hasSelectedTimeExpired,
    dineInInfo,
    setHasAgreedToTerms,
    setDate,
    setTime,
    setDineInInfo
  } = useFulfillmentStore();
  const { setTimeToServiceDate, setTimeToServiceTime } = useMetricsStore();

  const serviceTerms = useServiceTerms();
  const hasServiceTerms = useMemo(() => serviceTerms.length > 0, [serviceTerms]);
  const serviceServiceEnum = useFulfillmentService(selectedService);
  const serviceServiceMaxGuests = useFulfillmentMaxGuests(selectedService);

  // Get the fulfillment config and cart-based lead time for date availability checks
  const fulfillment = useFulfillmentById(selectedService ?? '');
  const cartBasedLeadTime = useCartBasedLeadTime();

  // Get options for the currently selected date
  const optionsForSelectedDate = useOptionsForFulfillmentAndDate(
    serviceDate || formatISO(currentTime, { representation: 'date' }),
    selectedService || ""
  );

  const hasOptionsForSameDay = useHasOptionsForSameDay();

  // Callback to check if a date has available options - uses stable references for inline computation
  const hasOptionsForDate = useCallback((date: Date): boolean => {
    if (!selectedService || !fulfillment) return false;
    const dateStr = formatISO(date, { representation: 'date' });
    const infoMap = WDateUtils.GetInfoMapForAvailabilityComputation(
      [fulfillment],
      dateStr,
      cartBasedLeadTime
    );
    const options = WDateUtils.GetOptionsForDate(infoMap, dateStr, formatISO(currentTime));
    return options.length > 0;
  }, [selectedService, fulfillment, cartBasedLeadTime, currentTime]);

  const TimeOptions = useMemo(() => {
    return optionsForSelectedDate.reduce<{ [index: number]: { value: number; disabled: boolean } }>(
      (acc, v) => ({ ...acc, [v.value]: v }),
      {}
    );
  }, [optionsForSelectedDate]);

  const onSetServiceDate = useCallback((v: Date | number | null) => {
    if (v !== null) {
      const serviceDateString = formatISO(v, { representation: 'date' });
      // Check if the selected service time is valid in the new service date
      // Note: optionsForSelectedDate will update on next render with new date
      if (serviceTime !== null) {
        const newDateOptions = optionsForSelectedDate;
        const foundServiceTimeOption = newDateOptions.findIndex(x => x.value === serviceTime);
        if (foundServiceTimeOption === -1) {
          setTime(null);
        }
      }
      setDate(serviceDateString);
      setTimeToServiceDate(Date.now());
    }
  }, [serviceTime, optionsForSelectedDate, setDate, setTime, setTimeToServiceDate]);

  const onSetServiceTime = useCallback((v: number | null) => {
    setTime(v);
    if (v !== null) {
      setTimeToServiceTime(Date.now());
    }
  }, [setTime, setTimeToServiceTime]);

  // If the service date is null and there are options for the same day, set the service date to the current time
  useEffect(() => {
    if (serviceDate === null && hasOptionsForSameDay) {
      onSetServiceDate(currentTime);
    }
  }, [serviceDate, hasOptionsForSameDay, currentTime, onSetServiceDate]);

  return (<>
    <Grid
      sx={!hasServiceTerms ? { display: 'none' } : {}}
      size={{
        xs: 12,
        xl: 8
      }}>
      <FormControlLabel control={
        <><Checkbox checked={hasAgreedToTerms} onChange={(_, checked) => { setHasAgreedToTerms(checked); }} />
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
        xl: hasServiceTerms ? 6 : 4,
        lg: 6
      }}>
      <StaticDatePicker
        displayStaticWrapperAs="desktop"
        openTo="day"
        disableHighlightToday={!hasOptionsForSameDay}
        disablePast
        minDate={startOfDay(parseISO(nextAvailableDateTime.selectedDate))}
        maxDate={add(currentTime, { days: 6 })}
        shouldDisableDate={(date: Date) => !hasOptionsForDate(date)}
        value={serviceDate ? parseISO(serviceDate) : null}
        onChange={(v: Date | null) => { onSetServiceDate(v); }}
      />
    </Grid>
    <Grid
      container
      sx={{ justifyContent: 'center', alignContent: 'center', display: 'flex', ...(selectedService === null ? { display: 'none' } : {}) }}
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
      {(serviceServiceEnum === FulfillmentType.DineIn && serviceDate !== null) &&
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
            onChange={(_, v) => { setDineInInfo({ partySize: v }) }}
            renderInput={(params) => <TextField {...params} label="Party Size" />}
          />
        </Grid>)}
    </Grid>
    {(serviceServiceEnum === FulfillmentType.Delivery && serviceDate !== null) &&
      <Grid size={12}>
        <DeliveryInfoForm />
      </Grid>}
  </>);
}

export default function WFulfillmentStageComponent() {
  const nextStage = useStepperStore((s) => s.nextStage);
  const fulfillments = useSortedVisibleFulfillments();
  const {
    selectedDate: serviceDate,
    selectedService,
    selectedTime: serviceTime,
    hasAgreedToTerms,
    hasSelectedDateExpired,
    dineInInfo,
    deliveryInfo,
    setService
  } = useFulfillmentStore();
  const serviceTerms = useServiceTerms();
  const hasServiceTerms = useMemo(() => serviceTerms.length > 0, [serviceTerms]);
  const serviceServiceEnum = useFulfillmentService(selectedService);

  const hasAgreedToTermsIfAny = useMemo(() => (!hasServiceTerms || hasAgreedToTerms), [hasServiceTerms, hasAgreedToTerms]);
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

  return (
    <>
      <StageTitle>How and when would you like your order?</StageTitle>
      <Separator sx={{ pb: 3 }} />
      <Grid container alignItems="center">
        <Grid
          sx={{ pl: 3, pb: 5 }}
          size={{
            xs: 12,
            xl: 4
          }}>
          <span>Requested Service:</span>
          <RadioGroup
            row
            onChange={(_e, value: string) => { setService(value); }}
            value={selectedService}>
            {fulfillments.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio />}
                label={option.label}
              />
            ))}
          </RadioGroup>
        </Grid>
        <FulfillmentTimeAndDetailsSection />
      </Grid>
      {/* maybe move this to the calendar? */}
      {hasSelectedDateExpired && <ErrorResponseOutput>The previously selected service date has expired.</ErrorResponseOutput>}
      <Navigation hidden={serviceTime === null} hasBack={false}
        onNextWhenDisabled={{
          onMouseOver: () => enqueueSnackbar(missingInformationText, { variant: 'warning' })
        }} canBack={false} canNext={valid} handleBack={() => { return; }} handleNext={() => { nextStage(); }} />
    </>
  );
}