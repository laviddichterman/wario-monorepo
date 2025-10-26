import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from 'react';
import { useForm } from "react-hook-form";

import { Grid, Typography } from '@mui/material';

import { FormProvider, RHFMailTextField, RHFPhoneInput, RHFTextField, Separator, StageTitle } from '@wcp/wario-ux-shared';

import { Navigation } from '@/components/Navigation';

import { backStage, nextStage } from '@/app/slices/StepperSlice';
import { type CustomerInfoRHF, customerInfoSchema, setCustomerInfo } from '@/app/slices/WCustomerInfoSlice';
import { useAppDispatch, useAppSelector } from '@/app/useHooks';

// TODO: use funny names as the placeholder info for the names here and randomize it. So sometimes it would be the empire carpet guy, other times eagle man

function useCIForm() {
  const useFormApi = useForm<CustomerInfoRHF>({
    defaultValues: {
      givenName: useAppSelector(s => s.ci.givenName),
      familyName: useAppSelector(s => s.ci.familyName),
      mobileNum: useAppSelector(s => s.ci.mobileNum),
      mobileNumRaw: useAppSelector(s => s.ci.mobileNumRaw),
      email: useAppSelector(s => s.ci.email),
      referral: useAppSelector(s => s.ci.referral) || "",
    },
    resolver: zodResolver(customerInfoSchema),
    mode: "onBlur",

  });

  return useFormApi;
}

export function WCustomerInformationStage() {
  const cIForm = useCIForm();
  const dispatch = useAppDispatch();
  const { getValues, watch, formState: { isValid, errors, isDirty }, handleSubmit } = cIForm;
  const handleNext = () => {
    dispatch(setCustomerInfo(getValues()));
    dispatch(nextStage());
  }
  useEffect(() => {
    if (isValid) {
      dispatch(setCustomerInfo(watch()));
    }
  }, [isValid, isDirty, watch, dispatch])
  return (
    <>
      <StageTitle>Tell us a little about you.</StageTitle>
      <Separator sx={{ pb: 3 }} />
      <Typography>All information is used solely to facilitate the getting of your pizza to you. We don't sell or share customer information, ever.<br />By filling out this information, you agree to receive text messages relating to your order.</Typography>
      <FormProvider methods={cIForm}>
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
      <Navigation canBack canNext={isValid} handleBack={() => dispatch(backStage())} handleNext={handleSubmit(handleNext)} />
    </>
  );
};