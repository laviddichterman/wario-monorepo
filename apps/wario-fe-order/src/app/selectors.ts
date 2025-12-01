// import { createSelector } from "@reduxjs/toolkit";

// import { type CatalogModifierEntry, ComputeBalance, ComputeCartSubTotal, ComputeCategoryTreeIdList, ComputeDiscountsApplied, ComputeGratuityServiceCharge, ComputePaymentsApplied, ComputeProductCategoryMatchCount, ComputeSubtotalAfterDiscountAndGratuity, ComputeSubtotalPreDiscount, ComputeTaxAmount, ComputeTipBasis, ComputeTipValue, ComputeTotal, type CreateOrderRequestV2, CURRENCY, DiscountMethod, type FulfillmentConfig, type IMoney, type MetadataModifierMap, type Metrics, PaymentMethod, type ProductModifierEntry, StoreCreditType, TenderBaseStatus, WDateUtils, WFulfillmentStatus, type WProduct } from "@wcp/wario-shared";
// import { getCategoryEntryById, getModifierTypeEntryById, getProductEntryById, SelectAllowAdvanced, SelectAutoGratutityThreshold, SelectGratuityServiceCharge, SelectTaxRate } from "@wcp/wario-ux-shared/redux";

// import { getCart, getCartEntry, selectCartAsDto, type WCartState } from "@/app/slices/WCartSlice";
// import { selectSelectedWProduct } from "@/app/slices/WCustomizerSlice";
// import type { RootState } from "@/app/store";


// const GetSelectableModifiers = (mMap: MetadataModifierMap, modifierTypeSelector: (id: string) => CatalogModifierEntry) =>
//   Object.entries(mMap).reduce<MetadataModifierMap>((acc, [k, v]) => {
//     const modifierEntry = modifierTypeSelector(k);
//     const omit_section_if_no_available_options = modifierEntry.modifierType.displayFlags.omit_section_if_no_available_options;
//     const hidden = modifierEntry.modifierType.displayFlags.hidden;
//     return (!hidden && (!omit_section_if_no_available_options || v.has_selectable)) ? { ...acc, k: v } : acc;
//   }, {});


// export const SelectSelectableModifiers = createSelector(
//   (s: RootState, _mMap: MetadataModifierMap) => (id: string) => getModifierTypeEntryById(s.ws.modifierEntries, id),
//   (_s: RootState, mMap: MetadataModifierMap) => mMap,
//   (modifierGetter, mMap) => GetSelectableModifiers(mMap, modifierGetter)
// );



// export const selectCartEntryBeingCustomized = createSelector(
//   (s: RootState) => s.customizer.cartId,
//   (s: RootState) => (cid: string) => getCartEntry(s.cart.cart, cid),
//   (cartId: string | null, cartEntryGetter) => cartId !== null ? cartEntryGetter(cartId) : undefined
// );

// export const selectIProductOfSelectedProduct = createSelector(
//   (s: RootState) => selectSelectedWProduct(s.customizer),
//   (s: RootState) => s.ws.products,
//   (selectedProduct, products) => selectedProduct ? getProductEntryById(products, selectedProduct.p.productId).product : null
// )

// export const SelectMainCategoryTreeIdList = createSelector(
//   (s: RootState) => SelectMainCategoryId(s),
//   (s: RootState) => s.ws.categories,
//   (cId, categories) => cId ? ComputeCategoryTreeIdList(cId, (id: string) => getCategoryEntryById(categories, id)) : []
// )

// export const SelectMainProductCategoryCount = createSelector(
//   SelectMainCategoryTreeIdList,
//   (s: RootState) => getCart(s.cart.cart),
//   ComputeProductCategoryMatchCount
// )

// export const SelectAutoGratutityEnabled = createSelector(
//   SelectMainProductCategoryCount,
//   SelectAutoGratutityThreshold,
//   (s: RootState) => s.payment.specialInstructions,
//   (s: RootState) => s.fulfillment.dineInInfo,
//   (s: RootState) => s.fulfillment.deliveryInfo,
//   (count, threshold, specialInstructions, dineInInfo, deliveryInfo) => deliveryInfo !== null || dineInInfo !== null || count >= threshold || (specialInstructions && specialInstructions.length > 20)
// );



// export const SelectMetricsForSubmission = createSelector(
//   (s: RootState) => s.metrics,
//   (s: RootState) => s.ws.pageLoadTime,
//   (s: RootState) => s.ws.pageLoadTimeLocal,
//   (metrics, pageLoadTime, pageLoadTimeLocal) => ({
//     ...metrics,
//     pageLoadTime,
//     submitTime: metrics.submitTime - pageLoadTimeLocal,
//     timeToFirstProduct: metrics.timeToFirstProduct - pageLoadTimeLocal,
//     timeToServiceDate: metrics.timeToServiceDate - pageLoadTimeLocal,
//     timeToServiceTime: metrics.timeToServiceTime - pageLoadTimeLocal,
//     timeToStage: metrics.timeToStage.map(x => x - pageLoadTimeLocal)
//   } as Metrics)
// )


// export const SelectCartSubTotal = createSelector(
//   (s: WCartState) => getCart(s.cart),
//   ComputeCartSubTotal
// );

// export const SelectOrderForServiceFeeComputation = createSelector(
//   (_: RootState) => 0,
//   (nothing) => nothing
// );

// export const SelectServiceFee = createSelector(
//   SelectOrderForServiceFeeComputation,
//   SelectServiceFeeSetting,
//   // (s: RootState) => s.ws.catalog!,
//   (_partialOrder, _serviceFeeFunctionId) => ({ amount: 0, currency: CURRENCY.USD })//partialOrder === null || serviceFeeFunctionId === null ? 0 : OrderFunctional.ProcessOrderInstanceFunction(partialOrder, catalog.orderInstanceFunctions[serviceFeeFunctionId], catalog)
// );

// export const SelectSubtotalPreDiscount = createSelector(
//   (s: RootState) => SelectCartSubTotal(s.cart),
//   (total) => ComputeSubtotalPreDiscount(total, { amount: 0, currency: CURRENCY.USD })
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
