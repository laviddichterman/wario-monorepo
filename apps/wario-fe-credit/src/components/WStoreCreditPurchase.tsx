import { zodResolver } from "@hookform/resolvers/zod";
import type * as Square from '@square/web-sdk';
import { type AxiosResponse } from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { CreditCard, PaymentForm } from 'react-square-web-payments-sdk';
import { z } from "zod";

import { Box, FormLabel, Grid, Link, Typography } from '@mui/material';
import { styled } from '@mui/system';

import { CURRENCY, formatDecimal, type IMoney, MoneyToDisplayString, parseDecimal, type PurchaseStoreCreditRequest, type PurchaseStoreCreditResponse, RoundToTwoDecimalPlaces } from '@wcp/wario-shared';
import { ErrorResponseOutput, SelectSquareAppId, SelectSquareLocationId, SquareButtonCSS } from '@wcp/wario-ux-shared';
import { FormProvider, MoneyInput, RHFCheckbox, RHFMailTextField, RHFTextField, ZodEmailSchema } from '@wcp/wario-ux-shared';

import axiosInstance from '@/utils/axios';

import { useAppSelector } from '@/app/useHooks';
import { IS_PRODUCTION } from "@/config";

const Title = styled(Typography)({
  fontWeight: 500,
  fontSize: 19,
  textTransform: 'uppercase'
})

interface CreditPurchaseInfo {
  senderName: string;
  senderEmail: string;
  recipientNameFirst: string;
  recipientNameFamily: string;
  sendEmailToRecipient: boolean;
  recipientEmail: string;
  recipientMessage: string;
}
const creditPurchaseInfoSchema = z.object({
  senderName: z.string().trim().min(1, "Please enter your name.").min(2, "Please enter your full name."),
  senderEmail: ZodEmailSchema,
  recipientNameFirst: z.string().trim().min(1, "Please enter the given name.").min(2, "Please enter the full name."),
  recipientNameFamily: z.string().min(2, "Please enter the family name."),
  sendEmailToRecipient: z.boolean(),
  // TODO: make conditional on sendEmailToRecipient
  recipientEmail: ZodEmailSchema,
  recipientMessage: z.string().max(500, "Message is too long."),
});



function useCPForm() {
  const useFormApi = useForm<CreditPurchaseInfo>({

    //  seems to be a bug here where this cannot be set?
    defaultValues: {
      senderName: "",
      senderEmail: "",
      recipientNameFirst: "",
      recipientNameFamily: "",
      recipientEmail: "",
      sendEmailToRecipient: true,
      recipientMessage: ""
    },
    resolver: zodResolver(creditPurchaseInfoSchema),
    mode: "onBlur",

  });

  return useFormApi;
}

type PurchaseStatus = 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED_UNKNOWN' | 'INVALID_DATA';

const makeRequest = (token: string, amount: IMoney, values: CreditPurchaseInfo) => {
  const typedBody: PurchaseStoreCreditRequest & { nonce: string } = {
    nonce: token,
    amount,
    senderName: values.senderName,
    addedBy: "WebUI Purchase",
    recipientNameFirst: values.recipientNameFirst,
    recipientNameLast: values.recipientNameFamily,
    senderEmail: values.senderEmail,
    sendEmailToRecipient: values.sendEmailToRecipient,
    recipientEmail: values.recipientEmail,
    recipientMessage: values.recipientMessage
  };
  const response: Promise<AxiosResponse<PurchaseStoreCreditResponse>> = axiosInstance.post('api/v1/payments/storecredit/purchase', typedBody);
  return response;
}

export default function WStoreCreditPurchase() {

  const squareApplicationId = useAppSelector(SelectSquareAppId);

  const squareLocationId = useAppSelector(SelectSquareLocationId);
  const cPForm = useCPForm();
  const { getValues, watch, formState: { isValid, errors } } = cPForm;
  const sendEmailToRecipientState = watch('sendEmailToRecipient');
  const senderName = watch('senderName');
  const recipientNameFirst = watch('recipientNameFirst');
  const [creditAmount, setCreditAmount] = useState<IMoney>({ currency: CURRENCY.USD, amount: 5000 });
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>('IDLE');
  const [displayPaymentForm, setDisplayPaymentForm] = useState(false);
  const [purchaseResponse, setPurchaseResponse] = useState<PurchaseStoreCreditResponse | null>(null);
  const [paymentErrors, setPaymentErrors] = useState<string[]>([]);
  useEffect(() => {
    if (isValid) {
      setDisplayPaymentForm(true);
    }
  }, [isValid])
  const cardTokenizeResponseReceived = (props: Square.TokenResult /*, verifiedBuyer?: Square.VerifyBuyerResponseDetails */) => {
    const formValues = { ...getValues() };
    if (purchaseStatus !== 'PROCESSING') {
      setPurchaseStatus('PROCESSING');
      if (props.token) {
        makeRequest(props.token, creditAmount, formValues).then((response: AxiosResponse<PurchaseStoreCreditResponse>) => {
          setPurchaseResponse(response.data);
          setPurchaseStatus('SUCCESS');
        }).catch((err: unknown) => {
          try {
            if (err && typeof err === 'object' && 'error' in err && Array.isArray(err.error)) {
              setPurchaseStatus('INVALID_DATA');
              setPaymentErrors(err.error.map(((x: { detail: string }) => x.detail)));
              return;
            }
          } catch { }
          setPurchaseStatus('FAILED_UNKNOWN');
        });
      } else if (props.errors) {
        setPaymentErrors(props.errors.map(x => x.message))
        setPurchaseStatus('FAILED_UNKNOWN');
      }
    }
  }

  const createPaymentRequest: () => Square.PaymentRequestOptions = () => {
    return {
      countryCode: "US",
      currencyCode: creditAmount.currency,
      total: { label: "Total", amount: RoundToTwoDecimalPlaces(creditAmount.amount / 100).toFixed(2) }
    }
  }
  return (
    <Box sx={{ mx: 'auto', pt: 1 }}>
      <PaymentForm
        overrides={
          !IS_PRODUCTION ? { scriptSrc: 'https://sandbox.web.squarecdn.com/v1/square.js' } : undefined
        }
        applicationId={squareApplicationId}
        locationId={squareLocationId}
        cardTokenizeResponseReceived={cardTokenizeResponseReceived}
        createPaymentRequest={createPaymentRequest}
      >
        {purchaseStatus !== 'SUCCESS' &&
          <FormProvider<CreditPurchaseInfo> methods={cPForm} >

            <Grid container justifyContent="center">
              {/* <Grid item sx={{ p: 2 }} xs={12}>
                <Typography variant="body1" align='center'>
                  Use this page to purchase a gift for yourself or a loved one. It never expires and is good at both Windy City Pie and Breezy Town Pizza!
                </Typography>
              </Grid> */}
              <Grid sx={{ p: 1 }} size={12}>
                <Typography variant='h4'>
                  Spread pizza,<br />electronically!
                </Typography>
              </Grid>

              <Grid sx={{ pl: 2, pt: 4, pb: 4 }} size={4}>
                <FormLabel sx={{ verticalAlign: 'center', alignContent: 'left' }} htmlFor='creditAmount'>
                  <Title>Amount</Title>
                </FormLabel>
              </Grid>
              <Grid sx={{ pl: 1, pt: 2, pb: 2, pr: 2 }} size={8}>
                <MoneyInput
                  id="creditAmount"
                  fullWidth
                  label=""
                  autoFocus
                  numberProps={{
                    allowEmpty: false,
                    defaultValue: creditAmount.amount / 100,
                    formatFunction: (v) => formatDecimal(v, 2),
                    parseFunction: parseDecimal,
                    min: 2,
                    max: 2000
                  }}
                  inputMode="decimal"
                  step={1}
                  value={creditAmount.amount / 100}
                  onChange={(e: number) => { setCreditAmount({ ...creditAmount, amount: e * 100 }); }}
                />

              </Grid>
              <Grid sx={{ p: 1 }} container size={12}>
                <Grid size={12}>
                  <Title>Sender Information:</Title>
                </Grid>
                <Grid sx={{ p: 1 }} size={12}>
                  <RHFTextField
                    name="senderName"
                    autoComplete="full-name name"
                    label="Sender's Name"
                    fullWidth
                    disabled={purchaseStatus === 'PROCESSING'}
                  />
                </Grid>
                <Grid sx={{ p: 1 }} size={12}>
                  <RHFMailTextField
                    name="senderEmail"
                    autoComplete={"d"}
                    label={!errors.senderName && senderName !== "" ? `${senderName}'s e-mail address` : "Sender's e-mail address"}
                    fullWidth
                    disabled={purchaseStatus === 'PROCESSING'}
                  />
                </Grid>
              </Grid>
              <Grid sx={{ p: 1 }} container size={12}>
                <Grid size={12}>
                  <Title>Recipient information:</Title>
                </Grid>
                <Grid sx={{ p: 1, pr: 1 }} size={6}>
                  <RHFTextField
                    name="recipientNameFirst"
                    autoComplete="given-name name"
                    label="Recipient's first name"
                    fullWidth
                    disabled={purchaseStatus === 'PROCESSING'}
                  />
                </Grid>
                <Grid sx={{ p: 1, pl: 1 }} size={6}>
                  <RHFTextField
                    name="recipientNameFamily"
                    autoComplete="family-name"
                    label={!errors.recipientNameFirst && recipientNameFirst !== "" ? `${recipientNameFirst}'s family name` : "Recipient's family name"}
                    fullWidth
                    disabled={purchaseStatus === 'PROCESSING'}
                  />
                </Grid>
                <Grid size={12}>
                  <RHFCheckbox
                    disabled={purchaseStatus === 'PROCESSING'}
                    name="sendEmailToRecipient"
                    label={`Please inform ${!errors.recipientNameFirst && recipientNameFirst !== "" ? recipientNameFirst : 'the recipient'} via e-mail for me!`}
                  />
                </Grid>
                {sendEmailToRecipientState &&
                  <>
                    <Grid sx={{ p: 1 }} size={12}>
                      <RHFMailTextField
                        name="recipientEmail"
                        autoComplete=""
                        label={!errors.recipientNameFirst && recipientNameFirst !== "" ? `${recipientNameFirst}'s e-mail address` : "Recipient's e-mail address"}
                        fullWidth
                        disabled={purchaseStatus === 'PROCESSING'}
                      />
                    </Grid>
                    <Grid sx={{ p: 1 }} size={12}>
                      <RHFTextField
                        name="recipientMessage"
                        multiline
                        label="Additional message (optional)"
                      />
                    </Grid>
                  </>
                }
              </Grid>
              <Grid sx={{ p: 2 }} size={12}>
                {displayPaymentForm &&
                  <>
                    <CreditCard
                      // @ts-expect-error remove once verified this isn't needed https://github.com/weareseeed/react-square-web-payments-sdk/pull/74/commits/d16cce8ba6ab50de35d632352f2cb01c9217ad05
                      focus={""}
                      buttonProps={{ isLoading: purchaseStatus === 'PROCESSING' || !isValid, css: SquareButtonCSS }} />
                    {/* <ApplePay /> */}
                  </>}
                {paymentErrors.length > 0 &&
                  paymentErrors.map((e, i) => <ErrorResponseOutput key={i}>{e}</ErrorResponseOutput>)}
              </Grid>
            </Grid>
          </FormProvider>
        }
        {purchaseStatus === 'SUCCESS' && purchaseResponse !== null && purchaseResponse.success &&
          <Grid container>
            <Grid size={12}>
              <Typography variant="h3">Payment of {MoneyToDisplayString(purchaseResponse.result.amount, true)} received
                from card ending in: {purchaseResponse.result.last4}!</Typography>
              <Typography variant="body2">Here's your <Link href={purchaseResponse.result.receiptUrl} target="_blank">receipt</Link>.</Typography>
            </Grid>
            <Grid size={12}>
              <Typography variant='h6'>Store credit details:</Typography>
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 4
              }}>
              <Typography variant="h4">Credit Amount:</Typography>
              <span>{MoneyToDisplayString(purchaseResponse.result.amount, true)}</span>
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 4
              }}>
              <Typography variant="h4">Recipient:</Typography>
              <span>{getValues('recipientNameFirst')} {getValues('recipientNameFamily')}</span>
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 4
              }}>
              <Typography variant="h4">Credit Code:</Typography>
              <span>{purchaseResponse.result.code}</span>
            </Grid>
          </Grid>}
      </PaymentForm>
    </Box>
  );
}