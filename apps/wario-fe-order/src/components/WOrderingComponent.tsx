
import type * as Square from '@square/web-sdk';
import { PaymentForm } from 'react-square-web-payments-sdk';

import Box from '@mui/material/Box';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

// TODO: need to add an interceptor for forward/back when the user has gotten to 2nd stage or at least reasonably far
import { CURRENCY, RoundToTwoDecimalPlaces } from '@wcp/wario-shared';
import { useDateFnsAdapter, useSquareAppId, useSquareLocationId } from '@wcp/wario-ux-shared/query';
import { StepperTitle } from '@wcp/wario-ux-shared/styled';

import { useBalanceAfterPayments } from '@/hooks/useOrderTotals';
import { useSubmitOrderMutation } from '@/hooks/useSubmitOrderMutation';

import { usePaymentStore } from '@/stores/usePaymentStore';
import { useStepperStore } from '@/stores/useStepperStore';

import { IS_PRODUCTION } from '../config';

import { WCheckoutStage } from './step/WCheckoutStageComponent';
import { WCustomerInformationStage } from './step/WCustomerInformationStageComponent';
import WFulfillmentStageComponent from './step/WFulfillmentStageComponent';
import WReviewOrderStage from './step/WReviewOrderStage';
import { WShopForProductsContainer } from './step/WShopForProductsStageContainer';

const STAGES = [
  {
    stepperTitle: "Timing",
    content: <WFulfillmentStageComponent />
  },
  {
    stepperTitle: "Add pizza!",
    content: <WShopForProductsContainer productSet='PRIMARY' />
  },
  {
    stepperTitle: "Add other stuff!",
    content: <WShopForProductsContainer productSet='SECONDARY' />
  },
  {
    stepperTitle: "Tell us about yourself",
    content: <WCustomerInformationStage />
  },
  {
    stepperTitle: "Review order",
    content: <WReviewOrderStage />
  },
  {
    stepperTitle: "Check out",
    content: <WCheckoutStage />
  }
];

export default function WOrderingComponent() {
  const stage = useStepperStore((s) => s.stage);
  const DateAdapter = useDateFnsAdapter();
  const squareApplicationId = useSquareAppId() as string;
  const squareLocationId = useSquareLocationId() as string;
  const {
    setSquareTokenizationErrors,
    setPendingSquareToken,
  } = usePaymentStore();
  const { isSuccess: isSubmitOrderSuccess } = useSubmitOrderMutation();
  const balanceAfterPayments = useBalanceAfterPayments();
  const theme = useTheme();
  const useStepper = useMediaQuery(theme.breakpoints.up('md'));
  const cardTokenizeResponseReceived = (props: Square.TokenResult, _verifiedBuyer?: Square.VerifyBuyerResponseDetails | null) => {
    if (props.status === 'OK') {
      // Set the pending token - WCheckoutStageComponent will react to this and submit the order
      setPendingSquareToken(props.token);
      // submitOrder()
    } else if (props.status === "Error") {
      setSquareTokenizationErrors(props.errors);
    }
  }

  const createPaymentRequest: () => Square.PaymentRequestOptions = () => {
    return {
      countryCode: "US",
      currencyCode: CURRENCY.USD,
      total: { label: "Total", amount: RoundToTwoDecimalPlaces(balanceAfterPayments.amount / 100).toFixed(2) }
    }
  }

  return (
    <LocalizationProvider dateAdapter={DateAdapter}>
      <PaymentForm
        overrides={
          !IS_PRODUCTION ? { scriptSrc: 'https://sandbox.web.squarecdn.com/v1/square.js' } : undefined
        }
        applicationId={squareApplicationId}
        locationId={squareLocationId}
        createPaymentRequest={createPaymentRequest}
        cardTokenizeResponseReceived={cardTokenizeResponseReceived}
      >
        {useStepper ?
          <Stepper sx={{ px: 1, pt: 2, mx: 'auto' }} activeStep={stage} >
            {STAGES.map((stg, i) => (
              <Step key={i} id={`WARIO_step_${i.toString()}`} completed={stage.valueOf() > i || isSubmitOrderSuccess}>
                <StepLabel><StepperTitle>{stg.stepperTitle}</StepperTitle></StepLabel>
              </Step>))}
          </Stepper> : <></>
        }
        <Box sx={{ mx: 'auto', pt: 1 }}>
          {!IS_PRODUCTION ? "NON PRODUCTION" : ''}
          {STAGES[stage].content}
        </Box>
      </PaymentForm>
    </LocalizationProvider>

  );
}

