import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { FormProvider, RHFMailTextField, RHFPhoneInput, RHFTextField } from '@wcp/wario-ux-shared/components';
import { Separator, StageTitle } from '@wcp/wario-ux-shared/styled';

import { Navigation } from '@/components/Navigation';

import { type CustomerInfoRHF, customerInfoSchema, useCustomerInfoStore } from '@/stores/useCustomerInfoStore';
import { useStepperStore } from '@/stores/useStepperStore';

// TODO: use funny names as the placeholder info for the names here and randomize it. So sometimes it would be the empire carpet guy, other times eagle man

// Get initial values outside component to avoid re-subscription
const getInitialCustomerInfo = (): CustomerInfoRHF => {
  const state = useCustomerInfoStore.getState();
  return {
    givenName: state.givenName,
    familyName: state.familyName,
    mobileNum: state.mobileNum,
    mobileNumRaw: state.mobileNumRaw,
    email: state.email,
    referral: state.referral || '',
  };
};

export default function WCustomerInformationStage() {
  // Initialize form with store values - defaultValues is only used on first render
  const cIForm = useForm<CustomerInfoRHF>({
    defaultValues: getInitialCustomerInfo(),
    resolver: zodResolver(customerInfoSchema),
    mode: 'onBlur',
  });

  const setCustomerInfo = useCustomerInfoStore((s) => s.setCustomerInfo);
  const nextStage = useStepperStore((s) => s.nextStage);
  const backStage = useStepperStore((s) => s.backStage);
  const {
    getValues,
    formState: { isValid, errors },
    handleSubmit,
  } = cIForm;

  const handleNext = () => {
    setCustomerInfo(getValues());
    nextStage();
  };
  return (
    <>
      <StageTitle>Tell us a little about you.</StageTitle>
      <Separator sx={{ pb: 3 }} />
      <Typography>
        All information is used solely to facilitate the getting of your pizza to you. We don't sell or share customer
        information, ever.
        <br />
        By filling out this information, you agree to receive text messages relating to your order.
      </Typography>
      <FormProvider<CustomerInfoRHF> methods={cIForm}>
        <Grid sx={{ p: 2 }} container>
          <Grid
            sx={{ p: 1 }}
            size={{
              xs: 12,
              sm: 6,
            }}
          >
            <RHFTextField name="givenName" autoComplete="given-name" label={'First name:'} />
          </Grid>
          <Grid
            sx={{ p: 1 }}
            size={{
              xs: 12,
              sm: 6,
            }}
          >
            <RHFTextField name="familyName" autoComplete="family-name" label={'Family name:'} />
          </Grid>
          <Grid sx={{ p: 1 }} size={12}>
            <RHFPhoneInput
              country="US"
              fullWidth
              name="mobileNumRaw"
              error={errors.mobileNumRaw}
              label={'Mobile Phone Number:'}
            />
          </Grid>
          <Grid sx={{ p: 1 }} size={12}>
            <RHFMailTextField name="email" autoComplete="email" label={'E-Mail Address:'} />
          </Grid>
          <Grid sx={{ px: 1, pt: 1 }} size={12}>
            <RHFTextField name="referral" label={'Referral (optional):'} />
          </Grid>
        </Grid>
      </FormProvider>
      {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
      <Navigation canBack canNext={isValid} handleBack={backStage} handleNext={handleSubmit(handleNext)} />
    </>
  );
}
