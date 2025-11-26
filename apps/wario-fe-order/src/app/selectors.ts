import { createSelector, type EntityState } from "@reduxjs/toolkit";

import { type CatalogCategoryEntry, type CatalogModifierEntry, ComputeBalance, ComputeCartSubTotal, ComputeCategoryTreeIdList, ComputeDiscountsApplied, ComputeGratuityServiceCharge, ComputePaymentsApplied, ComputeProductCategoryMatchCount, ComputeSubtotalAfterDiscountAndGratuity, ComputeSubtotalPreDiscount, ComputeTaxAmount, ComputeTipBasis, ComputeTipValue, ComputeTotal, type CreateOrderRequestV2, CURRENCY, DiscountMethod, type FulfillmentConfig, type IMoney, type MetadataModifierMap, type Metrics, PaymentMethod, type ProductModifierEntry, StoreCreditType, TenderBaseStatus, WDateUtils, WFulfillmentStatus, type WProduct } from "@wcp/wario-shared";
import { getCategoryEntryById, getFulfillmentById, getModifierTypeEntryById, getProductEntryById, getProductInstanceById, IProductInstancesAdapter, ProductInstanceFunctionsAdapter, SelectAllowAdvanced, SelectAutoGratutityThreshold, SelectDefaultFulfillmentId, SelectGratuityServiceCharge, SelectProductMetadata, SelectTaxRate, weakMapCreateSelector } from "@wcp/wario-ux-shared/redux";

import { getCart, getCartEntry, selectCartAsDto, type WCartState } from "@/app/slices/WCartSlice";
import { selectSelectedWProduct } from "@/app/slices/WCustomizerSlice";
import { SelectServiceDateTime } from "@/app/slices/WFulfillmentSlice";
import type { RootState } from "@/app/store";

export const IProductInstancesSelectors = IProductInstancesAdapter.getSelectors((state: RootState) => state.ws.productInstances);
export const ProductInstanceFunctionsSelectors = ProductInstanceFunctionsAdapter.getSelectors((state: RootState) => state.ws.productInstanceFunctions);

export const SelectDisplayFlagOmitSectionIfNoAvailableOptionsFromModifierByModifierTypeId = createSelector(
  (s: RootState, mtId: string) => getModifierTypeEntryById(s.ws.modifierEntries, mtId),
  (mt) => mt.modifierType.displayFlags.omit_section_if_no_available_options
);
export const SelectDisplayFlagHiddenFromModifierByModifierTypeId = createSelector(
  (s: RootState, mtId: string) => getModifierTypeEntryById(s.ws.modifierEntries, mtId),
  (mt) => mt.modifierType.displayFlags.hidden
);

export const GetSelectableModifiers = (mMap: MetadataModifierMap, modifierTypeSelector: (id: string) => CatalogModifierEntry) =>
  Object.entries(mMap).reduce<MetadataModifierMap>((acc, [k, v]) => {
    const modifierEntry = modifierTypeSelector(k);
    const omit_section_if_no_available_options = modifierEntry.modifierType.displayFlags.omit_section_if_no_available_options;
    const hidden = modifierEntry.modifierType.displayFlags.hidden;
    return (!hidden && (!omit_section_if_no_available_options || v.has_selectable)) ? { ...acc, k: v } : acc;
  }, {});


export const SelectSelectableModifiers = createSelector(
  (s: RootState, _mMap: MetadataModifierMap) => (id: string) => getModifierTypeEntryById(s.ws.modifierEntries, id),
  (_s: RootState, mMap: MetadataModifierMap) => mMap,
  (modifierGetter, mMap) => GetSelectableModifiers(mMap, modifierGetter)
);

export const selectAllowAdvancedPrompt = createSelector(
  (s: RootState) => selectSelectedWProduct(s.customizer),
  SelectAllowAdvanced,
  (prod: WProduct | null, allowAdvanced: boolean) => allowAdvanced && prod !== null && prod.m.advanced_option_eligible
)

export const selectCartEntryBeingCustomized = createSelector(
  (s: RootState) => s.customizer.cartId,
  (s: RootState) => (cid: string) => getCartEntry(s.cart.cart, cid),
  (cartId: string | null, cartEntryGetter) => cartId !== null ? cartEntryGetter(cartId) : undefined
);

export const selectIProductOfSelectedProduct = createSelector(
  (s: RootState) => selectSelectedWProduct(s.customizer),
  (s: RootState) => s.ws.products,
  (selectedProduct, products) => selectedProduct ? getProductEntryById(products, selectedProduct.p.productId).product : null
)

export const SelectMainCategoryTreeIdList = createSelector(
  (s: RootState) => SelectMainCategoryId(s),
  (s: RootState) => s.ws.categories,
  (cId, categories) => cId ? ComputeCategoryTreeIdList(cId, (id: string) => getCategoryEntryById(categories, id)) : []
)

export const SelectMainProductCategoryCount = createSelector(
  SelectMainCategoryTreeIdList,
  (s: RootState) => getCart(s.cart.cart),
  ComputeProductCategoryMatchCount
)

export const SelectAutoGratutityEnabled = createSelector(
  SelectMainProductCategoryCount,
  SelectAutoGratutityThreshold,
  (s: RootState) => s.payment.specialInstructions,
  (s: RootState) => s.fulfillment.dineInInfo,
  (s: RootState) => s.fulfillment.deliveryInfo,
  (count, threshold, specialInstructions, dineInInfo, deliveryInfo) => deliveryInfo !== null || dineInInfo !== null || count >= threshold || (specialInstructions && specialInstructions.length > 20)
);

export const SelectHasOperatingHoursForService = createSelector(
  (s: RootState, fulfillmentId: string) => getFulfillmentById(s.ws.fulfillments, fulfillmentId),
  (fulfillment) => WDateUtils.HasOperatingHours(fulfillment.operatingHours)
);

// current unused selector, but may be useful later
export const SelectSelectedServiceFulfillment = createSelector(
  (s: RootState) => s.fulfillment.selectedService,
  (s: RootState) => s.ws.fulfillments,
  SelectDefaultFulfillmentId,
  (selectedService, fulfillments, defaultFulfillment) => {
    const serviceToGet = selectedService ?? defaultFulfillment;
    return serviceToGet ? getFulfillmentById(fulfillments, serviceToGet) : null;
  }
);


export const SelectHasSpaceForPartyOf = createSelector(
  (_: RootState) => true,
  (hasSpace) => hasSpace
);


/**
 * Selects/Computes the product metadata for a catalog product instance using the currently populated fulfillment info
 */
export const SelectProductMetadataFromProductInstanceIdWithCurrentFulfillmentData = createSelector(
  (s: RootState, productInstanceId: string) => getProductInstanceById(s.ws.productInstances, productInstanceId),
  (s: RootState, _productInstanceId: string) => s.ws,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  (s: RootState, _productInstanceId: string) => SelectServiceDateTime(s.fulfillment)!,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  (s: RootState, _productInstanceId: string) => s.fulfillment.selectedService!,
  (productInstance, socketIoState, service_time, fulfillmentId) => SelectProductMetadata(socketIoState, productInstance.productId, productInstance.modifiers, service_time, fulfillmentId),
);

export const SelectProductInstanceHasSelectableModifiersByProductInstanceId = weakMapCreateSelector(
  (s: RootState, _productInstanceId: string) => s,
  (s: RootState, productInstanceId: string) => SelectProductMetadataFromProductInstanceIdWithCurrentFulfillmentData(s, productInstanceId),
  (s, metadata) => Object.values(SelectSelectableModifiers(s, metadata.modifier_map)).length > 0
)

export const SelectModifierTypeNameFromModifierTypeId = createSelector(
  getModifierTypeEntryById,
  (modifierTypeEntry) => modifierTypeEntry.modifierType.displayName || modifierTypeEntry.modifierType.name
);

export const SelectModifierTypeOrdinalFromModifierTypeId = createSelector(
  getModifierTypeEntryById,
  (modifierTypeEntry) => modifierTypeEntry.modifierType.ordinal
);

export const SelectMenuNameFromCategoryById = createSelector(
  getCategoryEntryById,
  (categoryEntry) => categoryEntry.category.description || categoryEntry.category.name
);
export const SelectMenuSubtitleFromCategoryById = createSelector(
  getCategoryEntryById,
  (categoryEntry) => categoryEntry.category.subheading || null
);
export const SelectMenuFooterFromCategoryById = createSelector(
  getCategoryEntryById,
  (categoryEntry) => categoryEntry.category.footnotes || null
);
export const SelectMenuNestingFromCategoryById = createSelector(
  getCategoryEntryById,
  (categoryEntry) => categoryEntry.category.display_flags.nesting
);

export const SelectCategoryExistsAndIsAllowedForFulfillment = createSelector(
  (state: EntityState<CatalogCategoryEntry, string>, categoryId: string, _fulfillmentId: string) => getCategoryEntryById(state, categoryId),
  (_state: EntityState<CatalogCategoryEntry, string>, _categoryId: string, fulfillmentId: string) => fulfillmentId,
  (categoryEntry, fulfillmentId) => categoryEntry.category.serviceDisable.indexOf(fulfillmentId) === -1
);

/**
* Selects/Computes the product metadata for a potentially custom product (product class ID and selected modifiers) using the currently populated fulfillment info
*/
export const SelectProductMetadataFromCustomProductWithCurrentFulfillmentData = weakMapCreateSelector(
  (_s: RootState, productId: string, _modifiers: ProductModifierEntry[]) => productId,
  (_s: RootState, _productId: string, modifiers: ProductModifierEntry[]) => modifiers,
  (s: RootState, _productInstanceId: string, _modifiers: ProductModifierEntry[]) => s.ws,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  (s: RootState, _productInstanceId: string) => SelectServiceDateTime(s.fulfillment)!,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  (s: RootState, _productInstanceId: string) => s.fulfillment.selectedService!,
  (productId, modifiers, socketIoState, service_time, fulfillmentId) => SelectProductMetadata(socketIoState, productId, modifiers, service_time, fulfillmentId),
);

export const SelectShouldFilterModifierTypeDisplay = weakMapCreateSelector(
  (s: RootState, modifierTypeId: string, _hasSelectable: boolean) => getModifierTypeEntryById(s.ws.modifierEntries, modifierTypeId),
  (_s: RootState, _modifierTypeId: string, hasSelectable: boolean) => hasSelectable,
  // cases to not show:
  // modifier.display_flags.omit_section_if_no_available_options && (has selected item, all other options cannot be selected, currently selected items cannot be deselected)
  // modifier.display_flags.hidden is true
  (modifierTypeEntry, hasSelectable) => !modifierTypeEntry.modifierType.displayFlags.hidden && (!modifierTypeEntry.modifierType.displayFlags.omit_section_if_no_available_options || hasSelectable)
)


const SelectSomethingFromFulfillment = <T extends keyof FulfillmentConfig>(field: T) => weakMapCreateSelector(
  (s: RootState) => s.ws.fulfillments,
  (s: RootState) => s.fulfillment.selectedService,
  (fulfillments, fulfillmentId) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!fulfillmentId || !getFulfillmentById(fulfillments, fulfillmentId)) {
      return null;
    }
    return getFulfillmentById(fulfillments, fulfillmentId)[field];
  }
);

export const SelectFulfillmentDisplayName = SelectSomethingFromFulfillment('displayName');
export const SelectMainCategoryId = SelectSomethingFromFulfillment('orderBaseCategoryId');
export const SelectSupplementalCategoryId = SelectSomethingFromFulfillment('orderSupplementaryCategoryId');
export const SelectMenuCategoryId = SelectSomethingFromFulfillment('menuBaseCategoryId');
export const SelectMaxPartySize = SelectSomethingFromFulfillment('maxGuests');
export const SelectServiceFeeSetting = SelectSomethingFromFulfillment('serviceCharge');
export const SelectAllowTipping = SelectSomethingFromFulfillment('allowTipping');
export const SelectFulfillmentMinDuration = SelectSomethingFromFulfillment('minDuration');
export const SelectFulfillmentServiceTerms = SelectSomethingFromFulfillment('terms');
export const SelectFulfillmentService = SelectSomethingFromFulfillment('service');
export const SelectFulfillmentMaxGuests = SelectSomethingFromFulfillment('maxGuests');

export const SelectServiceTimeDisplayString = createSelector(
  SelectFulfillmentMinDuration,
  (s: RootState) => s.fulfillment.selectedService,
  (s: RootState) => s.fulfillment.selectedTime,
  (minDuration, service, selectedTime) =>
    minDuration !== null && service !== null && selectedTime !== null ?
      (minDuration === 0 ? WDateUtils.MinutesToPrintTime(selectedTime) : `${WDateUtils.MinutesToPrintTime(selectedTime)} to ${WDateUtils.MinutesToPrintTime(selectedTime + minDuration)}`) : "");


export const SelectMetricsForSubmission = createSelector(
  (s: RootState) => s.metrics,
  (s: RootState) => s.ws.pageLoadTime,
  (s: RootState) => s.ws.pageLoadTimeLocal,
  (metrics, pageLoadTime, pageLoadTimeLocal) => ({
    ...metrics,
    pageLoadTime,
    submitTime: metrics.submitTime - pageLoadTimeLocal,
    timeToFirstProduct: metrics.timeToFirstProduct - pageLoadTimeLocal,
    timeToServiceDate: metrics.timeToServiceDate - pageLoadTimeLocal,
    timeToServiceTime: metrics.timeToServiceTime - pageLoadTimeLocal,
    timeToStage: metrics.timeToStage.map(x => x - pageLoadTimeLocal)
  } as Metrics)
)


export const SelectCartSubTotal = createSelector(
  (s: WCartState) => getCart(s.cart),
  ComputeCartSubTotal
);

export const SelectOrderForServiceFeeComputation = createSelector(
  (_: RootState) => 0,
  (nothing) => nothing
);

export const SelectServiceFee = createSelector(
  SelectOrderForServiceFeeComputation,
  SelectServiceFeeSetting,
  // (s: RootState) => s.ws.catalog!,
  (_partialOrder, _serviceFeeFunctionId) => ({ amount: 0, currency: CURRENCY.USD })//partialOrder === null || serviceFeeFunctionId === null ? 0 : OrderFunctional.ProcessOrderInstanceFunction(partialOrder, catalog.orderInstanceFunctions[serviceFeeFunctionId], catalog)
);

export const SelectSubtotalPreDiscount = createSelector(
  (s: RootState) => SelectCartSubTotal(s.cart),
  (s: RootState) => SelectServiceFee(s),
  ComputeSubtotalPreDiscount
);

export const SelectDiscountsApplied = createSelector(
  (s: RootState) => SelectSubtotalPreDiscount(s),
  (s: RootState) => s.payment.storeCreditValidations.filter(x => x.validation.credit_type === StoreCreditType.DISCOUNT),
  (subtotalPreDiscount: IMoney, discounts) => ComputeDiscountsApplied(subtotalPreDiscount, discounts.map(x => ({ createdAt: x.createdAt, t: DiscountMethod.CreditCodeAmount, status: TenderBaseStatus.AUTHORIZED, discount: { balance: x.validation.amount, code: x.code, lock: x.validation.lock } }))));

export const SelectDiscountsAmountApplied = createSelector(
  SelectDiscountsApplied,
  (discountsApplied) => ({ amount: discountsApplied.reduce((acc, x) => acc + x.discount.amount.amount, 0), currency: CURRENCY.USD }));


export const SelectGratutityServiceChargeAmount = createSelector(
  SelectGratuityServiceCharge,
  SelectSubtotalPreDiscount,
  ComputeGratuityServiceCharge);

export const SelectSubtotalAfterDiscount = createSelector(
  SelectSubtotalPreDiscount,
  SelectDiscountsAmountApplied,
  SelectGratutityServiceChargeAmount,
  ComputeSubtotalAfterDiscountAndGratuity
);

export const SelectTaxAmount = createSelector(
  SelectSubtotalAfterDiscount,
  SelectTaxRate,
  ComputeTaxAmount
);

export const SelectTipBasis = createSelector(
  SelectSubtotalPreDiscount,
  SelectTaxAmount,
  ComputeTipBasis
);

export const SelectTipValue = createSelector(
  (s: RootState) => s.payment.selectedTip,
  SelectTipBasis,
  ComputeTipValue
);

export const SelectTotal = createSelector(
  SelectSubtotalAfterDiscount,
  SelectTaxAmount,
  SelectTipValue,
  ComputeTotal
);

export const SelectPaymentsApplied = createSelector(
  SelectTotal,
  SelectTipValue,
  (s: RootState) => s.payment.storeCreditValidations.filter(x => x.validation.credit_type === StoreCreditType.MONEY),
  (totalWithTip, tipAmount, moneyCredits) => ComputePaymentsApplied(totalWithTip, tipAmount, moneyCredits.map(x => ({ createdAt: x.createdAt, t: PaymentMethod.StoreCredit, status: TenderBaseStatus.PROPOSED, payment: { balance: x.validation.amount, code: x.code, lock: x.validation.lock } }))));

export const SelectPaymentAmountsApplied = createSelector(
  SelectPaymentsApplied,
  (paymentsApplied) => ({ amount: paymentsApplied.reduce((acc, x) => acc + x.amount.amount, 0), currency: CURRENCY.USD }));

export const SelectBalanceAfterPayments = createSelector(
  SelectTotal,
  SelectPaymentAmountsApplied,
  ComputeBalance
);


const SelectPaymentsProposedForSubmission = createSelector(
  (_: RootState, nonce: string | null) => nonce,
  SelectPaymentsApplied,
  SelectTotal,
  SelectTipValue,
  SelectBalanceAfterPayments,
  (nonce, payments, totalWithTip, tipAmount, balance) => balance.amount > 0 && nonce ? ComputePaymentsApplied(totalWithTip, tipAmount, [...payments, { createdAt: Date.now(), t: PaymentMethod.CreditCard, status: TenderBaseStatus.PROPOSED, payment: { sourceId: nonce } }]) : payments
);

export const SelectWarioSubmissionArguments = createSelector(
  (s: RootState) => s.fulfillment,
  (s: RootState) => s.ci,
  (s: RootState) => selectCartAsDto(s.cart),
  (s: RootState) => s.payment.specialInstructions,
  SelectMetricsForSubmission,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  (s: RootState) => s.payment.selectedTip!,
  SelectDiscountsApplied,
  (s: RootState, nonce: string | null) => SelectPaymentsProposedForSubmission(s, nonce),
  (fulfillmentInfo, customerInfo, cart, specialInstructions, metrics, tipSelection, discountsApplied, paymentsApplied) => {
    return {
      customerInfo,
      fulfillment: { status: WFulfillmentStatus.PROPOSED, ...fulfillmentInfo },
      specialInstructions: specialInstructions ?? "",
      cart,
      metrics,
      proposedDiscounts: discountsApplied,
      proposedPayments: paymentsApplied,
      tip: tipSelection,
    } as CreateOrderRequestV2;
  });
