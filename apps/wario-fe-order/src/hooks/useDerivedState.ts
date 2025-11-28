import { useMemo } from "react";

import { type CatalogModifierEntry, ComputeCategoryTreeIdList, ComputeProductCategoryMatchCount, CURRENCY, type FulfillmentConfig, GroupAndOrderCart, type ICatalogSelectors, type IProductInstance, type MetadataModifierMap, type ProductModifierEntry, WDateUtils } from "@wcp/wario-shared";
import { useAutoGratutityThreshold, useCatalogSelectors, useFulfillmentById, useFulfillmentMainCategoryId, useProductInstanceById, useProductMetadata, useValueFromFulfillmentById } from "@wcp/wario-ux-shared/query";

import { selectCart, selectSelectedService, selectServiceDateTime, useCartStore, useFulfillmentStore } from "@/stores";


export function useSelectedFulfillment() {
  const selectedFulfillmentId = useFulfillmentStore(selectSelectedService) as string;
  const fulfillment = useFulfillmentById(selectedFulfillmentId);
  return fulfillment ?? null;
}

export function usePropertyFromSelectedFulfillment<K extends keyof FulfillmentConfig>(key: K) {
  const fulfillment = useSelectedFulfillment();
  return fulfillment ? fulfillment[key] : null;
}

export function useGroupedAndOrderedCart() {
  const cart = useCartStore(selectCart);
  const { category } = useCatalogSelectors() as ICatalogSelectors;
  return GroupAndOrderCart(cart, category);
}

export function useSelectableModifiers(mMap: MetadataModifierMap) {
  const { modifierEntry: modifierTypeSelector } = useCatalogSelectors() as ICatalogSelectors;
  const mods = useMemo(() => Object.entries(mMap).reduce<MetadataModifierMap>((acc, [k, v]) => {
    const modifierEntry = modifierTypeSelector(k) as CatalogModifierEntry;
    const omit_section_if_no_available_options = modifierEntry.modifierType.displayFlags.omit_section_if_no_available_options;
    const hidden = modifierEntry.modifierType.displayFlags.hidden;
    return (!hidden && (!omit_section_if_no_available_options || v.has_selectable)) ? { ...acc, k: v } : acc;
  }, {}), [mMap, modifierTypeSelector]);
  return mods;
}

export function useMainCategoryTreeIdList(categoryId: string) {
  const { category: categorySelector } = useCatalogSelectors() as ICatalogSelectors;
  const categoryTreeIdList = useMemo(() => ComputeCategoryTreeIdList(categoryId, (id: string) => categorySelector(id)), [categoryId, categorySelector]);
  return categoryTreeIdList;
}

/** Computes the number of products in the cart that are in the main category tree */
export function useMainProductCategoryCount(fulfillmentId: string) {
  const mainCategoryId = useFulfillmentMainCategoryId(fulfillmentId);
  const mainCategoryTreeIdList = useMainCategoryTreeIdList(mainCategoryId as string);
  const cart = useCartStore(selectCart);
  const productCategoryCount = useMemo(() => {
    return ComputeProductCategoryMatchCount(mainCategoryTreeIdList, cart);
  }, [mainCategoryTreeIdList, cart]);
  return productCategoryCount;
}

export function useIsAutogratuityEnabled(fulfillmentId: string) {
  const autoGratutityThreshold = useAutoGratutityThreshold() as number;
  const mainProductCategoryCount = useMainProductCategoryCount(fulfillmentId);
  const { deliveryInfo, dineInInfo } = useFulfillmentStore();
  const specialInstructions = "0";// useFulfillmentStore(s => s.specialInstructions);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return deliveryInfo !== null || dineInInfo !== null || mainProductCategoryCount >= autoGratutityThreshold || (specialInstructions && specialInstructions.length > 20);
}

/**
* Selects/Computes the product metadata for a potentially custom product (product class ID and selected modifiers) using the currently populated fulfillment info
*/
export function useProductMetadataWithCurrentFulfillmentData(productId: string, modifiers: ProductModifierEntry[]) {
  const selectedService = useFulfillmentStore(selectSelectedService) as string;
  const serviceDate = useFulfillmentStore(selectServiceDateTime) as Date
  const metadata = useProductMetadata(productId, modifiers, serviceDate, selectedService);
  return metadata;
}


/**
 * Selects/Computes the product metadata for a catalog product instance using the currently populated fulfillment info
 */
export function useProductMetadataFromProductInstanceIdWithCurrentFulfillmentData(productInstanceId: string) {
  const product = useProductInstanceById(productInstanceId) as IProductInstance;
  return useProductMetadataWithCurrentFulfillmentData(product.productId, product.modifiers);
}

export function useProductHasSelectableModifiersByProductInstanceId(productInstanceId: string) {
  const metadata = useProductMetadataFromProductInstanceIdWithCurrentFulfillmentData(productInstanceId);
  const selectableModifiers = useSelectableModifiers(metadata?.modifier_map || {});
  return Object.values(selectableModifiers).length > 0;
}

export function useShouldFilterModifierTypeDisplay(modifierTypeId: string, hasSelectable: boolean) {
  const { modifierEntry: modifierTypeSelector } = useCatalogSelectors() as ICatalogSelectors;
  return useMemo(() => {
    const modifierTypeEntry = modifierTypeSelector(modifierTypeId);
    return !modifierTypeEntry || !modifierTypeEntry.modifierType.displayFlags.hidden &&
      (!modifierTypeEntry.modifierType.displayFlags.omit_section_if_no_available_options || hasSelectable);
  }, [modifierTypeId, hasSelectable, modifierTypeSelector]);
}

export function useSelectedServiceTimeDisplayString() {
  const { selectedTime, selectedService } = useFulfillmentStore();
  const minDuration = useValueFromFulfillmentById(selectedService as string, 'minDuration');
  return minDuration !== null && selectedService !== null && selectedTime !== null ?
    (minDuration === 0 ? WDateUtils.MinutesToPrintTime(selectedTime) : `${WDateUtils.MinutesToPrintTime(selectedTime)} to ${WDateUtils.MinutesToPrintTime(selectedTime + minDuration)}`) : "";
}

export function useComputeServiceFee() {
  //partialOrder === null || serviceFeeFunctionId === null ? 0 : OrderFunctional.ProcessOrderInstanceFunction(partialOrder, catalog.orderInstanceFunctions[serviceFeeFunctionId], catalog)
  return ({ amount: 0, currency: CURRENCY.USD });
}

// export const SelectSubtotalPreDiscount = createSelector(
//   (s: RootState) => SelectCartSubTotal(s.cart),
//   (s: RootState) => SelectServiceFee(s),
//   ComputeSubtotalPreDiscount
// );

// export const SelectDiscountsApplied = createSelector(
//   (s: RootState) => SelectSubtotalPreDiscount(s),
//   (s: RootState) => s.payment.storeCreditValidations.filter(x => x.validation.credit_type === StoreCreditType.DISCOUNT),
//   (subtotalPreDiscount: IMoney, discounts) => ComputeDiscountsApplied(subtotalPreDiscount, discounts.map(x => ({ createdAt: x.createdAt, t: DiscountMethod.CreditCodeAmount, status: TenderBaseStatus.AUTHORIZED, discount: { balance: x.validation.amount, code: x.code, lock: x.validation.lock } }))));

// export const SelectDiscountsAmountApplied = createSelector(
//   SelectDiscountsApplied,
//   (discountsApplied) => ({ amount: discountsApplied.reduce((acc, x) => acc + x.discount.amount.amount, 0), currency: CURRENCY.USD }));


// export const SelectGratutityServiceChargeAmount = createSelector(
//   SelectGratuityServiceCharge,
//   SelectSubtotalPreDiscount,
//   ComputeGratuityServiceCharge);

// export const SelectSubtotalAfterDiscount = createSelector(
//   SelectSubtotalPreDiscount,
//   SelectDiscountsAmountApplied,
//   SelectGratutityServiceChargeAmount,
//   ComputeSubtotalAfterDiscountAndGratuity
// );

// export const SelectTaxAmount = createSelector(
//   SelectSubtotalAfterDiscount,
//   SelectTaxRate,
//   ComputeTaxAmount
// );

// export const SelectTipBasis = createSelector(
//   SelectSubtotalPreDiscount,
//   SelectTaxAmount,
//   ComputeTipBasis
// );

// export const SelectTipValue = createSelector(
//   (s: RootState) => s.payment.selectedTip,
//   SelectTipBasis,
//   ComputeTipValue
// );

// export const SelectTotal = createSelector(
//   SelectSubtotalAfterDiscount,
//   SelectTaxAmount,
//   SelectTipValue,
//   ComputeTotal
// );

// export const SelectPaymentsApplied = createSelector(
//   SelectTotal,
//   SelectTipValue,
//   (s: RootState) => s.payment.storeCreditValidations.filter(x => x.validation.credit_type === StoreCreditType.MONEY),
//   (totalWithTip, tipAmount, moneyCredits) => ComputePaymentsApplied(totalWithTip, tipAmount, moneyCredits.map(x => ({ createdAt: x.createdAt, t: PaymentMethod.StoreCredit, status: TenderBaseStatus.PROPOSED, payment: { balance: x.validation.amount, code: x.code, lock: x.validation.lock } }))));

// export const SelectPaymentAmountsApplied = createSelector(
//   SelectPaymentsApplied,
//   (paymentsApplied) => ({ amount: paymentsApplied.reduce((acc, x) => acc + x.amount.amount, 0), currency: CURRENCY.USD }));

// export const SelectBalanceAfterPayments = createSelector(
//   SelectTotal,
//   SelectPaymentAmountsApplied,
//   ComputeBalance
// );


// const SelectPaymentsProposedForSubmission = createSelector(
//   (_: RootState, nonce: string | null) => nonce,
//   SelectPaymentsApplied,
//   SelectTotal,
//   SelectTipValue,
//   SelectBalanceAfterPayments,
//   (nonce, payments, totalWithTip, tipAmount, balance) => balance.amount > 0 && nonce ? ComputePaymentsApplied(totalWithTip, tipAmount, [...payments, { createdAt: Date.now(), t: PaymentMethod.CreditCard, status: TenderBaseStatus.PROPOSED, payment: { sourceId: nonce } }]) : payments
// );

// export const SelectWarioSubmissionArguments = createSelector(
//   (s: RootState) => s.fulfillment,
//   (s: RootState) => s.ci,
//   (s: RootState) => selectCartAsDto(s.cart),
//   (s: RootState) => s.payment.specialInstructions,
//   SelectMetricsForSubmission,
//   // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//   (s: RootState) => s.payment.selectedTip!,
//   SelectDiscountsApplied,
//   (s: RootState, nonce: string | null) => SelectPaymentsProposedForSubmission(s, nonce),
//   (fulfillmentInfo, customerInfo, cart, specialInstructions, metrics, tipSelection, discountsApplied, paymentsApplied) => {
//     return {
//       customerInfo,
//       fulfillment: { status: WFulfillmentStatus.PROPOSED, ...fulfillmentInfo },
//       specialInstructions: specialInstructions ?? "",
//       cart,
//       metrics,
//       proposedDiscounts: discountsApplied,
//       proposedPayments: paymentsApplied,
//       tip: tipSelection,
//     } as CreateOrderRequestV2;
//   });
