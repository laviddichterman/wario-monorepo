import { useMemo } from 'react';

import {
  ComputeBalance,
  ComputeDiscountsApplied,
  ComputePaymentsApplied,
  ComputeSubtotalAfterDiscountAndGratuity,
  ComputeSubtotalPreDiscount,
  ComputeTaxAmount,
  ComputeTipBasis,
  ComputeTipValue,
  ComputeTotal,
  CURRENCY,
  DiscountMethod,
  type IMoney,
  type OrderLineDiscount,
  type OrderPayment,
  PaymentMethod,
  StoreCreditType,
  TenderBaseStatus,
} from '@wcp/wario-shared';
import { useTaxRate } from '@wcp/wario-ux-shared/query';

import { selectCart, useCartStore } from '@/stores/useCartStore';
import { selectSelectedTip, selectStoreCreditValidations, usePaymentStore } from '@/stores/usePaymentStore';

/**
 * Hook to compute service fee (currently always 0)
 * TODO: Implement actual service fee calculation when needed
 */
export function useServiceFee(): IMoney {
  return useMemo(() => ({ amount: 0, currency: CURRENCY.USD }), []);
}

/**
 * Hook to compute cart subtotal with memoization
 * Avoids creating new IMoney objects on every render
 */
export function useCartSubtotal(): IMoney {
  const cart = useCartStore(selectCart);
  return useMemo(
    () => ({
      amount: cart.reduce((acc, entry) => acc + entry.product.m.price.amount * entry.quantity, 0),
      currency: CURRENCY.USD,
    }),
    [cart],
  );
}

/**
 * Hook to compute subtotal before discounts
 */
export function useSubtotalPreDiscount(): IMoney {
  const cartSubtotal = useCartSubtotal();
  const serviceFee = useServiceFee();

  return useMemo(() => {
    return ComputeSubtotalPreDiscount(cartSubtotal, serviceFee);
  }, [cartSubtotal, serviceFee]);
}

/**
 * Hook to compute discounts applied from store credit validations
 */
export function useDiscountsApplied(): OrderLineDiscount[] {
  const subtotalPreDiscount = useSubtotalPreDiscount();
  const storeCreditValidations = usePaymentStore(selectStoreCreditValidations);

  return useMemo(() => {
    const discountCredits = storeCreditValidations.filter((x) => x.validation.credit_type === StoreCreditType.DISCOUNT);
    return ComputeDiscountsApplied(
      subtotalPreDiscount,
      discountCredits.map((x) => ({
        createdAt: x.createdAt,
        t: DiscountMethod.CreditCodeAmount,
        status: TenderBaseStatus.AUTHORIZED,
        discount: {
          balance: x.validation.amount,
          code: x.code,
          lock: x.validation.lock,
        },
      })),
    );
  }, [subtotalPreDiscount, storeCreditValidations]);
}

/**
 * Hook to compute total discounts amount applied
 */
export function useDiscountsAmountApplied(): IMoney {
  const discountsApplied = useDiscountsApplied();

  return useMemo(() => {
    return {
      amount: discountsApplied.reduce((acc, x) => acc + x.discount.amount.amount, 0),
      currency: CURRENCY.USD,
    };
  }, [discountsApplied]);
}

/**
 * Hook to compute gratuity service charge (currently 0)
 * TODO: Implement actual gratuity service charge when needed
 */
export function useGratuityServiceCharge(): IMoney {
  return useMemo(() => ({ amount: 0, currency: CURRENCY.USD }), []);
}

/**
 * Hook to compute subtotal after discounts and gratuity
 */
export function useSubtotalAfterDiscount(): IMoney {
  const subtotalPreDiscount = useSubtotalPreDiscount();
  const discountsAmount = useDiscountsAmountApplied();
  const gratuityServiceCharge = useGratuityServiceCharge();

  return useMemo(() => {
    return ComputeSubtotalAfterDiscountAndGratuity(subtotalPreDiscount, discountsAmount, gratuityServiceCharge);
  }, [subtotalPreDiscount, discountsAmount, gratuityServiceCharge]);
}

/**
 * Hook to compute tax amount
 */
export function useTaxAmount(): IMoney {
  const subtotalAfterDiscount = useSubtotalAfterDiscount();
  const taxRate = useTaxRate() ?? 0;

  return useMemo(() => {
    return ComputeTaxAmount(subtotalAfterDiscount, taxRate);
  }, [subtotalAfterDiscount, taxRate]);
}

/**
 * Hook to compute the basis for tip calculation (subtotal + tax)
 */
export function useTipBasis(): IMoney {
  const subtotalPreDiscount = useSubtotalPreDiscount();
  const taxAmount = useTaxAmount();

  return useMemo(() => {
    return ComputeTipBasis(subtotalPreDiscount, taxAmount);
  }, [subtotalPreDiscount, taxAmount]);
}

/**
 * Hook to compute the tip value based on selection and basis
 */
export function useTipValue(): IMoney {
  const selectedTip = usePaymentStore(selectSelectedTip);
  const tipBasis = useTipBasis();

  return useMemo(() => {
    return ComputeTipValue(selectedTip, tipBasis);
  }, [selectedTip, tipBasis]);
}

/**
 * Hook to compute order total (subtotal + tax + tip)
 */
export function useOrderTotal(): IMoney {
  const subtotalAfterDiscount = useSubtotalAfterDiscount();
  const taxAmount = useTaxAmount();
  const tipAmount = useTipValue();

  return useMemo(() => {
    return ComputeTotal(subtotalAfterDiscount, taxAmount, tipAmount);
  }, [subtotalAfterDiscount, taxAmount, tipAmount]);
}

/**
 * Hook to compute payments applied from store credit validations
 */
export function usePaymentsApplied(): OrderPayment[] {
  const total = useOrderTotal();
  const tipAmount = useTipValue();
  const storeCreditValidations = usePaymentStore(selectStoreCreditValidations);

  return useMemo(() => {
    const moneyCredits = storeCreditValidations.filter((x) => x.validation.credit_type === StoreCreditType.MONEY);
    return ComputePaymentsApplied(
      total,
      tipAmount,
      moneyCredits.map((x) => ({
        createdAt: x.createdAt,
        t: PaymentMethod.StoreCredit,
        status: TenderBaseStatus.PROPOSED,
        payment: {
          balance: x.validation.amount,
          code: x.code,
          lock: x.validation.lock,
        },
      })),
    );
  }, [total, tipAmount, storeCreditValidations]);
}

/**
 * Hook to compute total amount of payments applied
 */
export function usePaymentAmountsApplied(): IMoney {
  const paymentsApplied = usePaymentsApplied();

  return useMemo(() => {
    return {
      amount: paymentsApplied.reduce((acc, x) => acc + x.amount.amount, 0),
      currency: CURRENCY.USD,
    };
  }, [paymentsApplied]);
}

/**
 * Hook to compute remaining balance after payments
 */
export function useBalanceAfterPayments(): IMoney {
  const total = useOrderTotal();
  const paymentAmounts = usePaymentAmountsApplied();

  return useMemo(() => {
    return ComputeBalance(total, paymentAmounts);
  }, [total, paymentAmounts]);
}

/**
 * Convenience hook that returns all order totals at once
 */
export function useOrderTotals() {
  const cartSubtotal = useCartSubtotal();
  const serviceFee = useServiceFee();
  const subtotalPreDiscount = useSubtotalPreDiscount();
  const discountsApplied = useDiscountsApplied();
  const discountsAmount = useDiscountsAmountApplied();
  const subtotalAfterDiscount = useSubtotalAfterDiscount();
  const taxAmount = useTaxAmount();
  const tipBasis = useTipBasis();
  const tipValue = useTipValue();
  const total = useOrderTotal();
  const paymentsApplied = usePaymentsApplied();
  const paymentAmounts = usePaymentAmountsApplied();
  const balance = useBalanceAfterPayments();

  return useMemo(
    () => ({
      cartSubtotal,
      serviceFee,
      subtotalPreDiscount,
      discountsApplied,
      discountsAmount,
      subtotalAfterDiscount,
      taxAmount,
      tipBasis,
      tipValue,
      total,
      paymentsApplied,
      paymentAmounts,
      balance,
    }),
    [
      cartSubtotal,
      serviceFee,
      subtotalPreDiscount,
      discountsApplied,
      discountsAmount,
      subtotalAfterDiscount,
      taxAmount,
      tipBasis,
      tipValue,
      total,
      paymentsApplied,
      paymentAmounts,
      balance,
    ],
  );
}
