import { lazy } from 'react';

import Box from '@mui/material/Box';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

// TODO: need to add an interceptor for forward/back when the user has gotten to 2nd stage or at least reasonably far
import { useDateFnsAdapter } from '@wcp/wario-ux-shared/query';
import { StepperTitle } from '@wcp/wario-ux-shared/styled';

import { useSubmitOrderMutation } from '@/hooks/useSubmitOrderMutation';

import { useStepperStore } from '@/stores/useStepperStore';
const WCheckoutStage = lazy(() => import('@/components/step/WCheckoutStageComponent'));
const WCustomerInformationStage = lazy(() => import('@/components/step/WCustomerInformationStageComponent'));
const WFulfillmentStageComponent = lazy(() => import('@/components/step/WFulfillmentStageComponent'));
const WReviewOrderStage = lazy(() => import('@/components/step/WReviewOrderStage'));
const WShopForProductsContainer = lazy(() => import('@/components/step/WShopForProductsStageContainer'));

const STAGES = [
  {
    stepperTitle: 'Timing',
    content: <WFulfillmentStageComponent />,
  },
  {
    stepperTitle: 'Add pizza!',
    content: <WShopForProductsContainer productSet="PRIMARY" />,
  },
  {
    stepperTitle: 'Add other stuff!',
    content: <WShopForProductsContainer productSet="SECONDARY" />,
  },
  {
    stepperTitle: 'Tell us about yourself',
    content: <WCustomerInformationStage />,
  },
  {
    stepperTitle: 'Review order',
    content: <WReviewOrderStage />,
  },
  {
    stepperTitle: 'Check out',
    content: <WCheckoutStage />,
  },
];

export default function WOrderingComponent() {
  const stage = useStepperStore((s) => s.stage);
  const DateAdapter = useDateFnsAdapter();
  const { isSuccess: isSubmitOrderSuccess } = useSubmitOrderMutation();
  const theme = useTheme();
  const useStepper = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <LocalizationProvider dateAdapter={DateAdapter}>
      {useStepper ? (
        <Stepper sx={{ px: 1, pt: 2, mx: 'auto' }} activeStep={stage}>
          {STAGES.map((stg, i) => (
            <Step key={i} id={`WARIO_step_${i.toString()}`} completed={stage.valueOf() > i || isSubmitOrderSuccess}>
              <StepLabel>
                <StepperTitle>{stg.stepperTitle}</StepperTitle>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      ) : (
        <></>
      )}
      <Box sx={{ mx: 'auto', pt: 1 }}>{STAGES[stage].content}</Box>
    </LocalizationProvider>
  );
}
