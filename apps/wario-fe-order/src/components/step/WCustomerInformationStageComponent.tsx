import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from 'react';
import { useForm } from "react-hook-form";

import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { FormProvider, RHFMailTextField, RHFPhoneInput, RHFTextField } from '@wcp/wario-ux-shared/components';
import { Separator, StageTitle } from '@wcp/wario-ux-shared/styled';

import { Navigation } from '@/components/Navigation';

import { type CustomerInfoRHF, customerInfoSchema, selectCustomerInfo, useCustomerInfoStore, useStepperStore } from '@/stores';

// TODO: use funny names as the placeholder info for the names here and randomize it. So sometimes it would be the empire carpet guy, other times eagle man

function useCIForm() {
  const customerInfo = useCustomerInfoStore(selectCustomerInfo);
  const useFormApi = useForm<CustomerInfoRHF>({
    defaultValues: {
      givenName: customerInfo.givenName,
      familyName: customerInfo.familyName,
      mobileNum: customerInfo.mobileNum,
      mobileNumRaw: customerInfo.mobileNumRaw,
      email: customerInfo.email,
      referral: customerInfo.referral || "",
    },
    resolver: zodResolver(customerInfoSchema),
    mode: "onBlur",

  });

  return useFormApi;
}

export function WCustomerInformationStage() {
  const cIForm = useCIForm();
  const setCustomerInfo = useCustomerInfoStore((s) => s.setCustomerInfo);
  const { nextStage, backStage } = useStepperStore();
  const { getValues, watch, formState: { isValid, errors, isDirty }, handleSubmit } = cIForm;
  const handleNext = () => {
    setCustomerInfo(getValues());
    nextStage();
  }
  useEffect(() => {
    if (isValid) {
      setCustomerInfo(watch());
    }
  }, [isValid, isDirty, watch, setCustomerInfo])
  return (
    <>
      <StageTitle>Tell us a little about you.</StageTitle>
      <Separator sx={{ pb: 3 }} />
      <Typography>All information is used solely to facilitate the getting of your pizza to you. We don't sell or share customer information, ever.<br />By filling out this information, you agree to receive text messages relating to your order.</Typography>
      <FormProvider<CustomerInfoRHF> methods={cIForm}>
        <Grid sx={{ p: 2 }} container>
          <Grid
            sx={{ p: 1 }}
            size={{
              xs: 12,
              sm: 6
            }}>
            <RHFTextField
              name="givenName"
              autoComplete="given-name"
              label={"First name:"}
            />
          </Grid>
          <Grid
            sx={{ p: 1 }}
            size={{
              xs: 12,
              sm: 6
            }}>
            <RHFTextField
              name="familyName"
              autoComplete="family-name"
              label={"Family name:"}
            />
          </Grid>
          <Grid sx={{ p: 1 }} size={12}>
            <RHFPhoneInput
              country='US'
              fullWidth
              name="mobileNumRaw"
              error={errors.mobileNumRaw}
              label={"Mobile Phone Number:"}
              control={cIForm.control}
            />
          </Grid>
          <Grid sx={{ p: 1 }} size={12}>
            <RHFMailTextField
              name="email"
              autoComplete="email"
              label={"E-Mail Address:"}
            />
          </Grid>
          <Grid sx={{ px: 1, pt: 1 }} size={12}>
            <RHFTextField
              name="referral"
              label={"Referral (optional):"}
            />
          </Grid>
        </Grid>
      </FormProvider>
      {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
      <Navigation canBack canNext={isValid} handleBack={backStage} handleNext={handleSubmit(handleNext)} />
    </>
  );
}