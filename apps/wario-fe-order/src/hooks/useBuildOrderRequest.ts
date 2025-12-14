import { useMemo } from 'react';

import { ComputePaymentsApplied, PaymentMethod, TenderBaseStatus, WFulfillmentStatus } from '@wcp/wario-shared/logic';
import type { CreateOrderRequestV2, Metrics, OrderPayment } from '@wcp/wario-shared/types';
import { useServerTime } from '@wcp/wario-ux-shared/query';

import { selectCartAsDto, useCartStore } from '@/stores/useCartStore';
import { useCustomerInfoStore } from '@/stores/useCustomerInfoStore';
import { useFulfillmentStore } from '@/stores/useFulfillmentStore';
import { useMetricsStore } from '@/stores/useMetricsStore';
import { usePaymentStore } from '@/stores/usePaymentStore';

import {
  useBalanceAfterPayments,
  useDiscountsApplied,
  useOrderTotal,
  usePaymentsApplied,
  useTipValue,
} from './useOrderTotals';

/**
 * Hook to compute metrics for order submission
 * Adjusts all timestamps relative to server page load time
 */
export function useMetricsForSubmission(): Metrics {
  const metricsState = useMetricsStore();
  const { pageLoadTime, pageLoadTimeLocal } = useServerTime();

  return useMemo(() => {
    return {
      pageLoadTime,
      useragent: metricsState.useragent,
      submitTime: metricsState.submitTime - pageLoadTimeLocal,
      timeToFirstProduct: metricsState.timeToFirstProduct - pageLoadTimeLocal,
      timeToServiceDate: metricsState.timeToServiceDate - pageLoadTimeLocal,
      timeToServiceTime: metricsState.timeToServiceTime - pageLoadTimeLocal,
      timeToStage: metricsState.timeToStage.map((x) => x - pageLoadTimeLocal),
      numTimeBumps: metricsState.numTimeBumps,
      numTipAdjusts: metricsState.numTipAdjusts,
      numTipFixed: metricsState.numTipFixed,
    };
  }, [
    pageLoadTime,
    pageLoadTimeLocal,
    metricsState.useragent,
    metricsState.submitTime,
    metricsState.timeToFirstProduct,
    metricsState.timeToServiceDate,
    metricsState.timeToServiceTime,
    metricsState.timeToStage,
    metricsState.numTimeBumps,
    metricsState.numTipAdjusts,
    metricsState.numTipFixed,
  ]);
}

/**
 * Hook to compute payments proposed for submission
 * Adds credit card payment if there's a remaining balance and a nonce is provided
 */
export function usePaymentsProposedForSubmission(nonce: string | null): OrderPayment[] {
  const paymentsApplied = usePaymentsApplied();
  const total = useOrderTotal();
  const tipAmount = useTipValue();
  const balance = useBalanceAfterPayments();

  return useMemo(() => {
    if (balance.amount > 0 && nonce) {
      return ComputePaymentsApplied(total, tipAmount, [
        ...paymentsApplied,
        {
          createdAt: Date.now(),
          t: PaymentMethod.CreditCard,
          status: TenderBaseStatus.PROPOSED,
          payment: { sourceId: nonce },
        },
      ]);
    }
    return paymentsApplied;
  }, [nonce, paymentsApplied, total, tipAmount, balance.amount]);
}

/**
 * Hook to build the complete order submission request
 * @param nonce - Square payment nonce (null if no credit card payment)
 */
export function useBuildOrderRequest(nonce: string | null): CreateOrderRequestV2 | null {
  // Fulfillment state
  const fulfillmentState = useFulfillmentStore();

  // Customer info
  const customerInfo = useCustomerInfoStore();

  // Cart
  const cart = useCartStore((s) => s.cart);
  const cartAsDto = useMemo(() => selectCartAsDto(cart), [cart]);

  // Payment state
  const { selectedTip, specialInstructions } = usePaymentStore();

  // Computed values
  const metrics = useMetricsForSubmission();
  const discountsApplied = useDiscountsApplied();
  const paymentsProposed = usePaymentsProposedForSubmission(nonce);

  return useMemo(() => {
    // Don't build request if tip is not selected
    if (selectedTip === null) {
      return null;
    }

    return {
      customerInfo: {
        givenName: customerInfo.givenName,
        familyName: customerInfo.familyName,
        mobileNum: customerInfo.mobileNum,
        email: customerInfo.email,
        referral: customerInfo.referral,
      },
      fulfillment: {
        status: WFulfillmentStatus.PROPOSED,
        selectedService: fulfillmentState.selectedService,
        selectedDate: fulfillmentState.selectedDate,
        selectedTime: fulfillmentState.selectedTime,
        dineInInfo: fulfillmentState.dineInInfo,
        deliveryInfo: fulfillmentState.deliveryInfo,
      },
      specialInstructions: specialInstructions ?? '',
      cart: cartAsDto,
      metrics,
      proposedDiscounts: discountsApplied,
      proposedPayments: paymentsProposed,
      tip: selectedTip,
    } as CreateOrderRequestV2;
  }, [
    selectedTip,
    customerInfo.givenName,
    customerInfo.familyName,
    customerInfo.mobileNum,
    customerInfo.email,
    customerInfo.referral,
    fulfillmentState.selectedService,
    fulfillmentState.selectedDate,
    fulfillmentState.selectedTime,
    fulfillmentState.dineInInfo,
    fulfillmentState.deliveryInfo,
    specialInstructions,
    cartAsDto,
    metrics,
    discountsApplied,
    paymentsProposed,
  ]);
}

/**
 * Hook that returns a function to build the order request on demand
 * Useful when you need to capture the current state at submission time
 */
export function useOrderRequestBuilder() {
  // Fulfillment state
  const fulfillmentState = useFulfillmentStore();

  // Customer info
  const customerInfo = useCustomerInfoStore();

  // Cart
  const cart = useCartStore((s) => s.cart);

  // Payment state
  const { selectedTip, specialInstructions } = usePaymentStore();

  // Server time for metrics
  const { pageLoadTime, pageLoadTimeLocal } = useServerTime();
  const metricsState = useMetricsStore();

  // Pre-computed values that don't depend on nonce
  const discountsApplied = useDiscountsApplied();
  const total = useOrderTotal();
  const tipAmount = useTipValue();
  const paymentsApplied = usePaymentsApplied();
  const balance = useBalanceAfterPayments();

  return useMemo(() => {
    return (nonce: string | null): CreateOrderRequestV2 | null => {
      if (selectedTip === null) {
        return null;
      }

      // Compute metrics at submission time
      const metrics: Metrics = {
        pageLoadTime,
        useragent: metricsState.useragent,
        submitTime: metricsState.submitTime - pageLoadTimeLocal,
        timeToFirstProduct: metricsState.timeToFirstProduct - pageLoadTimeLocal,
        timeToServiceDate: metricsState.timeToServiceDate - pageLoadTimeLocal,
        timeToServiceTime: metricsState.timeToServiceTime - pageLoadTimeLocal,
        timeToStage: metricsState.timeToStage.map((x) => x - pageLoadTimeLocal),
        numTimeBumps: metricsState.numTimeBumps,
        numTipAdjusts: metricsState.numTipAdjusts,
        numTipFixed: metricsState.numTipFixed,
      };

      // Compute payments with nonce
      const paymentsProposed =
        balance.amount > 0 && nonce
          ? ComputePaymentsApplied(total, tipAmount, [
            ...paymentsApplied,
            {
              createdAt: Date.now(),
              t: PaymentMethod.CreditCard,
              status: TenderBaseStatus.PROPOSED,
              payment: { sourceId: nonce },
            },
          ])
          : paymentsApplied;

      return {
        customerInfo: {
          givenName: customerInfo.givenName,
          familyName: customerInfo.familyName,
          mobileNum: customerInfo.mobileNum,
          email: customerInfo.email,
          referral: customerInfo.referral,
        },
        fulfillment: {
          status: WFulfillmentStatus.PROPOSED,
          selectedService: fulfillmentState.selectedService,
          selectedDate: fulfillmentState.selectedDate,
          selectedTime: fulfillmentState.selectedTime,
          dineInInfo: fulfillmentState.dineInInfo,
          deliveryInfo: fulfillmentState.deliveryInfo,
        },
        specialInstructions: specialInstructions ?? '',
        cart: selectCartAsDto(cart),
        metrics,
        proposedDiscounts: discountsApplied,
        proposedPayments: paymentsProposed,
        tip: selectedTip,
      } as CreateOrderRequestV2;
    };
  }, [
    selectedTip,
    specialInstructions,
    customerInfo.givenName,
    customerInfo.familyName,
    customerInfo.mobileNum,
    customerInfo.email,
    customerInfo.referral,
    fulfillmentState.selectedService,
    fulfillmentState.selectedDate,
    fulfillmentState.selectedTime,
    fulfillmentState.dineInInfo,
    fulfillmentState.deliveryInfo,
    cart,
    discountsApplied,
    total,
    tipAmount,
    paymentsApplied,
    balance.amount,
    pageLoadTime,
    pageLoadTimeLocal,
    metricsState.useragent,
    metricsState.submitTime,
    metricsState.timeToFirstProduct,
    metricsState.timeToServiceDate,
    metricsState.timeToServiceTime,
    metricsState.timeToStage,
    metricsState.numTimeBumps,
    metricsState.numTipAdjusts,
    metricsState.numTipFixed,
  ]);
}
