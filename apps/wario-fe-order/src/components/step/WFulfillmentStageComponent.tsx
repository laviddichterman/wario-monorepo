import { enqueueSnackbar } from 'notistack';
import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';

import { FulfillmentType, WDateUtils } from '@wcp/wario-shared/logic';
import { useFulfillments, useFulfillmentService } from '@wcp/wario-ux-shared/query';
import { ErrorResponseOutput, Separator, StageTitle } from '@wcp/wario-ux-shared/styled';

import { useSelectedFulfillmentHasServiceTerms } from '@/hooks/useDerivedState';

import DeliveryInfoForm from '@/components/DeliveryValidationForm';
import FulfillmentPartySizeSelector from '@/components/step/fulfillment/FulfillmentPartySizeSelector';

import { useFulfillmentStore } from '@/stores/useFulfillmentStore';
import { useStepperStore } from '@/stores/useStepperStore';

import { Navigation } from '../Navigation';

import FulfillmentDateTimeSelector from './fulfillment/FulfillmentDateTimeSelector';
import FulfillmentServiceSelector from './fulfillment/FulfillmentServiceSelector';
import FulfillmentTerms from './fulfillment/FulfillmentTerms';

function useSortedVisibleFulfillments() {
  const fulfillments = useFulfillments();
  const ServiceOptions = useMemo(() => {
    return fulfillments
      .filter(
        (fulfillment) => fulfillment.exposeFulfillment && WDateUtils.HasOperatingHours(fulfillment.operatingHours),
      )
      .sort((x, y) => x.ordinal - y.ordinal)
      .map((fulfillment) => {
        return { label: fulfillment.displayName, value: fulfillment.id, disabled: false };
      });
  }, [fulfillments]);
  return ServiceOptions;
}

export default function WFulfillmentStageComponent() {
  const nextStage = useStepperStore((s) => s.nextStage);
  const fulfillments = useSortedVisibleFulfillments();
  // Use individual selectors to avoid creating new objects on every render
  const serviceDate = useFulfillmentStore((s) => s.selectedDate);
  const selectedService = useFulfillmentStore((s) => s.selectedService);
  const serviceTime = useFulfillmentStore((s) => s.selectedTime);
  const hasAgreedToTerms = useFulfillmentStore((s) => s.hasAgreedToTerms);
  const hasSelectedDateExpired = useFulfillmentStore((s) => s.hasSelectedDateExpired);
  const dineInInfo = useFulfillmentStore((s) => s.dineInInfo);
  const deliveryInfo = useFulfillmentStore((s) => s.deliveryInfo);
  const setService = useFulfillmentStore((s) => s.setService);
  const hasServiceTerms = useSelectedFulfillmentHasServiceTerms();
  const serviceServiceEnum = useFulfillmentService(selectedService);

  // Determine if there's content for the right column
  const showPartySize = serviceServiceEnum === FulfillmentType.DineIn && serviceDate !== null;
  const showDeliveryForm = serviceServiceEnum === FulfillmentType.Delivery && serviceDate !== null;
  const hasRightColumnContent = hasServiceTerms || showPartySize || showDeliveryForm;

  const hasAgreedToTermsIfAny = useMemo(
    () => !hasServiceTerms || hasAgreedToTerms,
    [hasServiceTerms, hasAgreedToTerms],
  );
  const hasCompletedDineInInfoIfNeeded = useMemo(
    () => serviceServiceEnum !== FulfillmentType.DineIn || dineInInfo !== null,
    [serviceServiceEnum, dineInInfo],
  );
  const hasCompletedDeliveryInfoIfNeeded = useMemo(
    () => serviceServiceEnum !== FulfillmentType.Delivery || deliveryInfo !== null,
    [serviceServiceEnum, deliveryInfo],
  );
  const hasSelectedServiceDateAndTime = useMemo(
    () => selectedService !== null && serviceDate !== null && serviceTime !== null && serviceServiceEnum !== null,
    [serviceDate, serviceTime, selectedService, serviceServiceEnum],
  );

  const missingInformationText = useMemo(() => {
    if (!hasSelectedServiceDateAndTime) {
      return 'Please select a service, date, and time.';
    }
    if (!hasAgreedToTermsIfAny) {
      return 'Please agree to the terms and conditions above.';
    }
    if (!hasCompletedDineInInfoIfNeeded) {
      return 'Please select a party size.';
    }
    if (!hasCompletedDeliveryInfoIfNeeded) {
      return 'Please fill out the delivery information.';
    }
  }, [
    hasSelectedServiceDateAndTime,
    hasAgreedToTermsIfAny,
    hasCompletedDineInInfoIfNeeded,
    hasCompletedDeliveryInfoIfNeeded,
  ]);
  const valid = useMemo(() => {
    return (
      hasSelectedServiceDateAndTime &&
      hasAgreedToTermsIfAny &&
      hasCompletedDineInInfoIfNeeded &&
      hasCompletedDeliveryInfoIfNeeded
    );
  }, [
    hasSelectedServiceDateAndTime,
    hasAgreedToTermsIfAny,
    hasCompletedDineInInfoIfNeeded,
    hasCompletedDeliveryInfoIfNeeded,
  ]);

  return (
    <>
      <StageTitle>How and when would you like your order?</StageTitle>
      <Separator sx={{ pb: 3 }} />
      <Stack spacing={2} sx={{ width: '100%' }}>
        {/* Service Type Selection - always full width */}
        <FulfillmentServiceSelector
          options={fulfillments}
          selectedService={selectedService}
          onServiceChange={setService}
        />

        {/* Main Content Row: Date/Time + Right Column (Terms/Party Size/Delivery) */}
        <Grid container spacing={2}>
          {/* Left Column: Date & Time */}
          <Grid
            size={{
              xs: 12,
              md: hasRightColumnContent ? 6 : 12,
            }}
          >
            <FulfillmentDateTimeSelector />
          </Grid>

          {/* Right Column: Terms + Fulfillment-specific details (stacked) */}
          {hasRightColumnContent && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
                {/* Terms & Conditions */}
                <FulfillmentTerms />

                {/* Party Size (Dine-In only) */}
                {showPartySize && <FulfillmentPartySizeSelector />}

                {/* Delivery Form (Delivery only) */}
                {showDeliveryForm && (
                  <Box sx={{ width: '100%' }}>
                    <DeliveryInfoForm />
                  </Box>
                )}
              </Stack>
            </Grid>
          )}
        </Grid>
      </Stack>

      {/* Expiration Warning */}
      {hasSelectedDateExpired && (
        <ErrorResponseOutput>The previously selected service date has expired.</ErrorResponseOutput>
      )}
      <Navigation
        hidden={serviceTime === null}
        hasBack={false}
        onNextWhenDisabled={{
          onMouseOver: () => enqueueSnackbar(missingInformationText, { variant: 'warning' }),
        }}
        canBack={false}
        canNext={valid}
        handleBack={() => {
          return;
        }}
        handleNext={() => {
          nextStage();
        }}
      />
    </>
  );
}
