import type * as Square from '@square/web-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, PaymentForm /*, GooglePay, ApplePay */ } from 'react-square-web-payments-sdk';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Input from '@mui/material/Input';
import Typography from '@mui/material/Typography';

import { ComputeTipValue, CURRENCY, MoneyToDisplayString, type OrderPaymentAllocated, PaymentMethod, RoundToTwoDecimalPlaces, type TipSelection } from '@wcp/wario-shared';
import { LoadingScreen } from '@wcp/wario-ux-shared/components';
import { useSquareAppId, useSquareLocationId, useTipPreamble } from '@wcp/wario-ux-shared/query';
import { ErrorResponseOutput, Separator, SquareButtonCSS, StageTitle, WarioButton, WarioToggleButton } from '@wcp/wario-ux-shared/styled';

import { useOrderRequestBuilder } from '@/hooks/useBuildOrderRequest';
import { useIsAutogratuityEnabledByFulfillmentId, usePropertyFromSelectedFulfillment } from '@/hooks/useDerivedState';
import { useBalanceAfterPayments, useTipBasis, useTipValue } from '@/hooks/useOrderTotals';
import { useSubmitOrderMutation } from '@/hooks/useSubmitOrderMutation';

import { IS_PRODUCTION } from '@/config';
import { selectSelectedService, useFulfillmentStore } from '@/stores/useFulfillmentStore';
import { useMetricsStore } from '@/stores/useMetricsStore';
import { selectSelectedTip, selectSquareTokenErrors, usePaymentStore } from '@/stores/usePaymentStore';
import { useStepperStore } from '@/stores/useStepperStore';

import { Navigation } from '../Navigation';
import { StoreCreditSection } from '../StoreCreditSection';
import { WCheckoutCart } from '../WCheckoutCart';

const TIP_SUGGESTION_15: TipSelection = { value: .15, isSuggestion: true, isPercentage: true } as const;
const TIP_SUGGESTION_20: TipSelection = { value: .2, isSuggestion: true, isPercentage: true } as const;
const TIP_SUGGESTION_25: TipSelection = { value: .25, isSuggestion: true, isPercentage: true } as const;
const TIP_SUGGESTION_30: TipSelection = { value: .3, isSuggestion: true, isPercentage: true } as const;

const TIP_SUGGESTIONS = [TIP_SUGGESTION_15, TIP_SUGGESTION_20, TIP_SUGGESTION_25, TIP_SUGGESTION_30] as const;

function useIsAutogratuityEnabled() {
  const fulfillmentId = useFulfillmentStore(selectSelectedService) as string;
  return useIsAutogratuityEnabledByFulfillmentId(fulfillmentId);
}

export default function WCheckoutStage() {
  const { backStage } = useStepperStore();
  const selectedTip = usePaymentStore(selectSelectedTip);
  const squareTokenErrors = usePaymentStore(selectSquareTokenErrors);
  const setTip = usePaymentStore(state => state.setTip);
  const setSquareTokenizationErrors = usePaymentStore(state => state.setSquareTokenizationErrors);
  const { incrementTipAdjusts, incrementTipFixes, setSubmitTime } = useMetricsStore();

  // Square configuration
  const squareApplicationId = useSquareAppId() as string;
  const squareLocationId = useSquareLocationId() as string;

  // Order submission
  const buildOrderRequest = useOrderRequestBuilder();
  const submitOrderMutation = useSubmitOrderMutation();

  // Handle Square tokenization response - submit order directly
  const cardTokenizeResponseReceived = useCallback((props: Square.TokenResult, _verifiedBuyer?: Square.VerifyBuyerResponseDetails | null) => {
    if (props.status === 'OK') {
      // Submit order immediately with the token
      setSubmitTime(Date.now());
      const orderRequest = buildOrderRequest(props.token);
      if (orderRequest) {
        submitOrderMutation.mutate(orderRequest);
      }
    } else if (props.status === "Error") {
      setSquareTokenizationErrors(props.errors);
    }
  }, [buildOrderRequest, submitOrderMutation, setSubmitTime, setSquareTokenizationErrors]);

  const tipBasis = useTipBasis();
  const balance = useBalanceAfterPayments();

  // Create payment request for Square
  const createPaymentRequest = useCallback((): Square.PaymentRequestOptions => {
    return {
      countryCode: "US",
      currencyCode: CURRENCY.USD,
      total: { label: "Total", amount: RoundToTwoDecimalPlaces(balance.amount / 100).toFixed(2) }
    }
  }, [balance.amount]);
  const allowTipping = usePropertyFromSelectedFulfillment('allowTipping');
  const autogratEnabled = useIsAutogratuityEnabled();
  const TIP_PREAMBLE = useTipPreamble();
  const selectedTipValue = useTipValue();
  const TwentyPercentTipValue = useMemo(() => ComputeTipValue(TIP_SUGGESTION_20, tipBasis), [tipBasis]);
  const tipSuggestionsArray = useMemo(() => TIP_SUGGESTIONS.slice(autogratEnabled ? 1 : 0, autogratEnabled ? TIP_SUGGESTIONS.length : TIP_SUGGESTIONS.length - 1), [autogratEnabled]);
  const isCustomTipSelected = useMemo(() => selectedTip?.isSuggestion === false, [selectedTip]);
  const [customTipAmount, setCustomTipAmount] = useState<string>(MoneyToDisplayString(ComputeTipValue(selectedTip || TIP_SUGGESTION_20, tipBasis), false));
  const customTipAsIMoney = useMemo(() => {
    const parsedCustomTipAmount = parseFloat(customTipAmount);
    return (!isFinite(parsedCustomTipAmount) || isNaN(parsedCustomTipAmount) || parsedCustomTipAmount < 0) ?
      { currency: CURRENCY.USD, amount: 0 } :
      { amount: Math.round(parsedCustomTipAmount * 100), currency: CURRENCY.USD }
  }, [customTipAmount]);

  useEffect(() => {
    // console.log('WCheckoutStageComponent effect', { allowTipping, selectedTip, autogratEnabled, TwentyPercentTipValue, selectedTipValue });
    if (allowTipping) {
      if (selectedTip === null || (autogratEnabled && selectedTip !== TIP_SUGGESTION_20 && TwentyPercentTipValue.amount > selectedTipValue.amount)) {
        // console.log('Setting tip to 20%', { selectedTip, TwentyPercentTipValue, selectedTipValue });
        setTip(TIP_SUGGESTION_20);
      }
    } else if (selectedTip === null) {
      setTip({ value: { amount: 0, currency: CURRENCY.USD }, isPercentage: false, isSuggestion: false });
    }
  }, [allowTipping, selectedTip, autogratEnabled, TwentyPercentTipValue, selectedTipValue, setTip]);

  const generatePaymentHtml = useCallback((payment: OrderPaymentAllocated) => {
    switch (payment.t) {
      case PaymentMethod.Cash:
        return (<>Somehow you paid cash?</>
        );
      case PaymentMethod.CreditCard:
        return (
          <>
            <Typography variant="body2">
              Payment of {MoneyToDisplayString(payment.amount, true)} received {payment.payment.last4 ? ` from card ending in: ${payment.payment.last4}!` : "!"}
            </Typography>
          </>);
      case PaymentMethod.StoreCredit:
        const paymentBalance = { amount: payment.payment.balance.amount - payment.amount.amount, currency: payment.amount.currency };
        return (
          <>
            <Typography variant='h6'>Digital Gift Card number <Typography sx={{ textTransform: "none" }}>{payment.payment.code}</Typography> debited {MoneyToDisplayString(payment.amount, true)}.</Typography>
            <Typography variant="body2">
              {paymentBalance.amount === 0 ? "No balance remains." : `Balance of ${MoneyToDisplayString(paymentBalance, true)} remains.`}
            </Typography>
          </>);
    }
  }, [])
  // Submit order when balance is zero (no credit card payment needed)
  const submitNoBalanceDue = useCallback(() => {
    setSubmitTime(Date.now());
    const orderRequest = buildOrderRequest(null);
    if (orderRequest) {
      submitOrderMutation.mutate(orderRequest, {
        onSuccess: (_response) => {
          // complete, need to set flags as such and prevent resubmission

        },
        onError: (_error) => {
          // failed
        },
      });
    }
  }, [buildOrderRequest, submitOrderMutation, setSubmitTime]);

  const resetCustomTip = () => {
    const resetValue = ComputeTipValue(TIP_SUGGESTION_20, tipBasis);
    setCustomTipAmount((resetValue.amount / 100).toFixed(2));
    setTip({ value: resetValue, isPercentage: false, isSuggestion: false });
  }

  const onSelectSuggestedTip = (tip: TipSelection) => {
    incrementTipAdjusts();
    setTip(tip);
    const newTipCashValue = ComputeTipValue(tip, tipBasis);
    if (customTipAsIMoney.amount < newTipCashValue.amount) {
      setCustomTipAmount(MoneyToDisplayString(newTipCashValue, false));
    }
  }

  // actually sets the custom tip, this should be called onBlur
  const setCustomTipHandler = (value: string) => {
    incrementTipAdjusts();
    const numericValue = parseFloat(value);
    if (!isFinite(numericValue) || isNaN(numericValue) || numericValue < 0 || (autogratEnabled && Math.round(numericValue * 100) < TwentyPercentTipValue.amount)) {
      incrementTipFixes();
      resetCustomTip();
    } else {
      const newTipMoney = { amount: Math.round(numericValue * 100), currency: CURRENCY.USD };
      setCustomTipAmount(MoneyToDisplayString(newTipMoney, false));
      setTip({ value: newTipMoney, isPercentage: false, isSuggestion: false });
    }
  }
  return <PaymentForm
    overrides={!IS_PRODUCTION ? { scriptSrc: 'https://sandbox.web.squarecdn.com/v1/square.js' } : undefined}
    applicationId={squareApplicationId}
    locationId={squareLocationId}
    createPaymentRequest={createPaymentRequest}
    cardTokenizeResponseReceived={cardTokenizeResponseReceived}
  > {!submitOrderMutation.isSuccess ?
    <Box>
      {submitOrderMutation.isPending && <LoadingScreen />}
      <StageTitle>{allowTipping ? "Add gratuity to your order and settle up!" : "Let's settle up!"}</StageTitle>
      <Separator sx={{ pb: 3 }} />
      {allowTipping && <>
        <Typography variant='body1'>{TIP_PREAMBLE}</Typography>
        <Grid container sx={{ py: 2 }}>
          {tipSuggestionsArray.map((tip: TipSelection, i: number) =>
            <Grid key={i} sx={{ px: 0.5 }} size={4}>
              <WarioToggleButton selected={selectedTip === tip} sx={{ display: 'table-cell' }} value={tip} fullWidth onClick={() => { onSelectSuggestedTip(tip); }} >
                <Grid container sx={{ py: 2 }}>
                  <Grid size={12}><Typography sx={{ color: 'white' }} variant='h4'>{((tip.value as number) * 100)}%</Typography></Grid>
                  <Grid size={12}><Typography sx={{ color: 'white' }} variant='subtitle2'>{MoneyToDisplayString(ComputeTipValue(tip, tipBasis), false)}</Typography></Grid>
                </Grid>
              </WarioToggleButton>
            </Grid>
          )}
          <Grid sx={{ px: 0.5, pt: 1 }} size={12}>
            <WarioToggleButton selected={isCustomTipSelected} fullWidth value={customTipAmount} onClick={() => { setCustomTipHandler(customTipAmount); }} >
              <Grid container>
                <Grid size={12}>
                  <Typography variant='h4' sx={{ color: 'white' }}>Custom Tip Amount</Typography>
                </Grid>
                <Grid sx={{ height: isCustomTipSelected ? '4em' : '2.5em' }} size={12}>
                  {isCustomTipSelected ?
                    <Input
                      sx={{ pt: 0 }}
                      size='small'
                      disableUnderline
                      value={customTipAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setCustomTipAmount(e.target.value); }}
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => { setCustomTipHandler(e.target.value); }}
                      type="number"
                      inputProps={{ inputMode: 'decimal', min: 0, sx: { pt: 0, textAlign: 'center', color: 'white' }, step: 1 }}
                    /> : " "}
                </Grid>
              </Grid>
            </WarioToggleButton>
          </Grid>
        </Grid>
      </>}
      <WCheckoutCart />
      <Box>
        <StageTitle>Payment Information:</StageTitle>
        <Grid container>
          <Grid container sx={{ px: 2, pb: 4 }} size={12}><StoreCreditSection /></Grid>
          <Grid size={12}>
            {balance.amount > 0 ?
              <>
                {/* <ApplePay>Pay with Apple Pay</ApplePay>
                <GooglePay>Pay with Google Pay</GooglePay> */}
                <CreditCard
                  // @ts-expect-error remove once verified this isn't needed https://github.com/weareseeed/react-square-web-payments-sdk/pull/74/commits/d16cce8ba6ab50de35d632352f2cb01c9217ad05
                  focus={""}
                  buttonProps={{
                    isLoading: submitOrderMutation.isPending, css: SquareButtonCSS
                  }}>
                  Submit Order
                </CreditCard>
              </> :
              <WarioButton disabled={submitOrderMutation.isPending} fullWidth onClick={submitNoBalanceDue} >Submit Order</WarioButton>}
            {squareTokenErrors.length > 0 &&
              squareTokenErrors.map((e, i) => <Grid key={i} size={12}><ErrorResponseOutput key={`${i.toString()}TokenErrors`}>{e.message}</ErrorResponseOutput></Grid>)}
            {submitOrderMutation.isError &&
              submitOrderMutation.error.errors.map((e, i) => <Grid key={i} size={12}><ErrorResponseOutput key={`${i.toString()}Payment`}>{e}</ErrorResponseOutput></Grid>)}
            <div>Note: Once orders are submitted, they are non-refundable. We will attempt to make any changes requested, but please do your due diligence to check the order for correctness!</div>
          </Grid>
        </Grid>
        <Navigation canBack={submitOrderMutation.isPending} hasNext={false} canNext={false} handleBack={backStage} handleNext={() => ""} />
      </Box>
    </Box> :
    <Box>
      <StageTitle>Order submitted successfully!</StageTitle>
      <Separator sx={{ pb: 3 }} />
      <Typography variant='body1'>Please check your email for order confirmation.</Typography>
      <Grid container>
        {submitOrderMutation.data.result.payments.map((payment, i) => {
          return (
            <Grid key={`${payment.t}${i.toString()}`} sx={{ pt: 1 }} size={12}>
              {generatePaymentHtml(payment)}
            </Grid>
          );
        })}
        <Grid sx={{ py: 3 }} size={12}>
          <WCheckoutCart />
        </Grid>
      </Grid>
    </Box >}
  </PaymentForm>;
}