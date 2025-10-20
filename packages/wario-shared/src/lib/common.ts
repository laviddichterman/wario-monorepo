/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { RRule } from "rrule";
import { getTime, isSameDay, addMinutes, startOfDay } from "date-fns";

import WDateUtils from "./objects/WDateUtils";
import { OrderFunctional } from "./objects/OrderFunctional";
import { CreateProductWithMetadataFromV2Dto } from "./objects/WCPProduct";
import { CURRENCY, PaymentMethod, DISABLE_REASON, DiscountMethod, OptionPlacement, OptionQualifier, PRODUCT_LOCATION, CALL_LINE_DISPLAY } from "./types";

import type { IMoney, Selector, WProduct, IWInterval, TipSelection, OrderPayment, CoreCartEntry, DineInInfoDto, FulfillmentDto, WCPProductV2Dto, IOptionInstance, FulfillmentTime, IProductInstance, ICatalogSelectors, OrderLineDiscount, UnresolvedPayment, FulfillmentConfig, IRecurringInterval, UnresolvedDiscount, WNormalizedInterval, CatalogProductEntry, CatalogCategoryEntry, ProductModifierEntry, WOrderInstancePartial, RecomputeTotalsResult, CategorizedRebuiltCart } from "./types";

export const CREDIT_REGEX = /[A-Za-z0-9]{3}-[A-Za-z0-9]{2}-[A-Za-z0-9]{3}-[A-Z0-9]{8}$/;

export const PRODUCT_NAME_MODIFIER_TEMPLATE_REGEX = /(\{[A-Za-z0-9]+\})/g;

export function ReduceArrayToMapByKey<T>(xs: T[], key: keyof T) {
  return Object.fromEntries(xs.map(x => [x[key], x])) as Record<string, T>;
};

export const RebuildAndSortCart = (cart: CoreCartEntry<WCPProductV2Dto>[], catalogSelectors: ICatalogSelectors, service_time: Date | number, fulfillmentId: string): CategorizedRebuiltCart => {
  return cart.reduce(
    (acc: CategorizedRebuiltCart, entry) => {
      const product = CreateProductWithMetadataFromV2Dto(entry.product, catalogSelectors, service_time, fulfillmentId);
      const rebuiltEntry: CoreCartEntry<WProduct> = { product, categoryId: entry.categoryId, quantity: entry.quantity };
      return { ...acc, [entry.categoryId]: Object.hasOwn(acc, entry.categoryId) ? [...acc[entry.categoryId], rebuiltEntry] : [rebuiltEntry] }
    }, {});
}

// TODO: this could get generified to take WCPProductV2Dto or WCPProduct or WProduct
type MapPrinterGroupToCartEntry = Record<string, CoreCartEntry<WProduct>[]>;
export const CartByPrinterGroup = (cart: CoreCartEntry<WProduct>[], productSelector: ICatalogSelectors['productEntry']): MapPrinterGroupToCartEntry =>
  cart
    .flat()
    .map(x => ({ entry: x, printerGroupId: productSelector(x.product.p.productId)?.product.printerGroup ?? null }))
    .filter(x => x.printerGroupId !== null)
    .reduce((acc: MapPrinterGroupToCartEntry, x) =>
    ({
      ...acc,
      [x.printerGroupId!]: Object.hasOwn(acc, x.printerGroupId!) ?
        [...acc[x.printerGroupId!], x.entry] :
        [x.entry]
    }), {});


// at some point this can use an actual scheduling algorithm, but for the moment it needs to just be a best guess
export const DetermineCartBasedLeadTime = (cart: CoreCartEntry<WCPProductV2Dto>[], productSelector: Selector<CatalogProductEntry>): number => {
  const leadTimeMap = cart.reduce<Record<number, { base: number; quant: number; }>>((acc, cartLine) => {
    const product = productSelector(cartLine.product.pid);
    return product?.product.timing ? {
      ...acc,
      // so we take the max of the base times at a station, then we sum the quantity times
      [product.product.timing.prepStationId]: Object.hasOwn(acc, product.product.timing.prepStationId) ? {
        base: Math.max(acc[product.product.timing.prepStationId].base, product.product.timing.prepTime - product.product.timing.additionalUnitPrepTime),
        quant: acc[product.product.timing.prepStationId].quant + (product.product.timing.additionalUnitPrepTime * cartLine.quantity)
      } : {
        base: product.product.timing.prepTime - product.product.timing.additionalUnitPrepTime,
        quant: (product.product.timing.additionalUnitPrepTime * cartLine.quantity)
      }
    } : acc;
  }, {});
  return Object.values(leadTimeMap).reduce((acc, entry) => Math.max(acc, entry.base + entry.quant), 0);
}

export const GetPlacementFromMIDOID = (modifiers: ProductModifierEntry[], mtid: string, oid: string): IOptionInstance => {
  const NOT_FOUND: IOptionInstance = { optionId: oid, placement: OptionPlacement.NONE, qualifier: OptionQualifier.REGULAR };
  const modifierEntry = modifiers.find(x => x.modifierTypeId === mtid);
  return modifierEntry !== undefined ? (modifierEntry.options.find((x) => x.optionId === oid) || NOT_FOUND) : NOT_FOUND;
};

export const DateTimeIntervalBuilder = (fulfillmentTime: FulfillmentTime, fulfillmentMaxDuration: number) => {
  // hack for date computation on DST transition days since we're currently not open during the time jump
  const date_lower = WDateUtils.ComputeServiceDateTime(fulfillmentTime);
  const date_upper = addMinutes(date_lower, fulfillmentMaxDuration);
  return { start: date_lower, end: date_upper } as WNormalizedInterval;
};

/**
 * Function to check if something is disabled
 * @param {IWInterval} disable_data - catalog sourced info as to if/when the product is enabled or disabled
 * @param {Date | number} order_time - the time to use to check for disabling
 * @returns {{ enable: DISABLE_REASON.ENABLED } | { enable: DISABLE_REASON.DISABLED_BLANKET } | { enable: DISABLE_REASON.DISABLED_TIME, interval: IWInterval } | { enable: DISABLE_REASON.DISABLED_AVAILABILITY, availability: IRecurringInterval[] }}
 */
export function DisableDataCheck(disable_data: IWInterval | null, availabilities: IRecurringInterval[], order_time: Date | number | string): ({ enable: DISABLE_REASON.ENABLED } |
{ enable: DISABLE_REASON.DISABLED_BLANKET } |
{ enable: DISABLE_REASON.DISABLED_TIME, interval: IWInterval }) |
{ enable: DISABLE_REASON.DISABLED_AVAILABILITY, availability: IRecurringInterval[] } {
  const orderTimeAsNumber = getTime(order_time);
  if (disable_data) {
    if (disable_data.start > disable_data.end) {
      return { enable: DISABLE_REASON.DISABLED_BLANKET };
    }
    if (disable_data.start <= orderTimeAsNumber && disable_data.end >= orderTimeAsNumber) {
      return { enable: DISABLE_REASON.DISABLED_TIME, interval: disable_data };
    }
  }
  if (availabilities.length > 0) {
    for (const availability of availabilities) {
      if (availability.rrule === "") {
        // we check for if we're INSIDE the availability interval here since we'll return that we're not otherwise later
        if ((availability.interval.start === -1 || orderTimeAsNumber >= availability.interval.start) &&
          (availability.interval.end === -1 || orderTimeAsNumber <= availability.interval.end)) {
          return { enable: DISABLE_REASON.ENABLED };
        }
      } else {
        try {
          const beginningOfOrderDay = startOfDay(order_time);
          const recRuleOpts = RRule.parseString(availability.rrule);
          const recRule = new RRule({ dtstart: beginningOfOrderDay, ...recRuleOpts });
          const nextRecurrence = recRule.after(beginningOfOrderDay, true);
          if (nextRecurrence !== null && isSameDay(nextRecurrence, beginningOfOrderDay)) {
            // the order day is part of the recurrence rule
            // now determine if it's in the interval
            const fulfillmentTime = WDateUtils.ComputeFulfillmentTime(order_time);
            if (fulfillmentTime.selectedTime >= availability.interval.start && fulfillmentTime.selectedTime <= availability.interval.end) {
              return { enable: DISABLE_REASON.ENABLED };
            }
          }
        }
        catch (error) {
          console.error(`Unable to parse recurrence rule from ${availability.rrule}. Returning unavailable for this rule. Error: ${JSON.stringify(error)}`);
        }
      }
    }
    return { enable: DISABLE_REASON.DISABLED_AVAILABILITY, availability: availabilities }
  }
  return { enable: DISABLE_REASON.ENABLED };
}


export const ComputeServiceTimeDisplayString = (minDuration: number, selectedTime: number) =>
  minDuration !== 0 ? `${WDateUtils.MinutesToPrintTime(selectedTime)} to ${WDateUtils.MinutesToPrintTime(selectedTime + minDuration)}` : WDateUtils.MinutesToPrintTime(selectedTime);

export const GenerateShortCode = function (productInstanceSelector: Selector<IProductInstance>, p: WProduct) {
  if (p.m.is_split && p.m.pi[PRODUCT_LOCATION.LEFT] !== p.m.pi[PRODUCT_LOCATION.RIGHT]) {
    return `${productInstanceSelector(p.m.pi[PRODUCT_LOCATION.LEFT])?.shortcode ?? "UNDEFINED"}|${productInstanceSelector(p.m.pi[PRODUCT_LOCATION.RIGHT])?.shortcode ?? "UNDEFINED"}`;
  }
  return productInstanceSelector(p.m.pi[PRODUCT_LOCATION.LEFT])?.shortcode ?? "UNDEFINED";
}

export const GenerateDineInGuestCountString = (dineInInfo: DineInInfoDto | null) => dineInInfo && dineInInfo.partySize > 0 ? ` (${dineInInfo.partySize.toString()})` : "";

const EventTitleSectionBuilder = (catalogSelectors: Pick<ICatalogSelectors, 'productInstance' | 'category'>, cart: CoreCartEntry<WProduct>[]) => {
  if (cart.length === 0) {
    return ''
  }
  const category = catalogSelectors.category(cart[0].categoryId)?.category;
  if (!category) {
    return ''
  }
  const callLineName = category.display_flags.call_line_name || "";
  const callLineNameWithSpaceIfNeeded = callLineName.length > 0 ? `${callLineName} ` : "";
  const callLineDisplay = category.display_flags.call_line_display;
  switch (callLineDisplay) {
    case CALL_LINE_DISPLAY.SHORTCODE: {
      const { total, shortcodes } = cart.reduce((acc: { total: number; shortcodes: string[] }, entry) => ({
        total: acc.total + entry.quantity,
        shortcodes: [...acc.shortcodes, ...Array<string>(entry.quantity).fill(GenerateShortCode(catalogSelectors.productInstance, entry.product))]
      }), { total: 0, shortcodes: [] });
      return `${callLineNameWithSpaceIfNeeded} ${total.toString(10)}x ${shortcodes.join(" ")}`;
    }
    case CALL_LINE_DISPLAY.SHORTNAME: {
      const shortnames: string[] = cart.map(item => `${item.quantity.toString()}x${item.product.m.shortname}`);
      return `${callLineNameWithSpaceIfNeeded}${shortnames.join(" ")}`;
    }
    case CALL_LINE_DISPLAY.QUANTITY: {
      // would be nice to have a 
      const total = cart.reduce((total, entry) => total + entry.quantity, 0);
      return `${total.toString(10)}${callLineName || 'x'}`;
    }
  }
}

export const EventTitleStringBuilder = (catalogSelectors: Pick<ICatalogSelectors, 'category' | 'productInstance'>, fulfillmentConfig: Pick<FulfillmentConfig, 'orderBaseCategoryId' | 'shortcode'>, customer: string, fulfillmentDto: FulfillmentDto, cart: CategorizedRebuiltCart, special_instructions: string) => {
  const has_special_instructions = special_instructions && special_instructions.length > 0;
  const mainCategoryTree = ComputeCategoryTreeIdList(fulfillmentConfig.orderBaseCategoryId, catalogSelectors.category);
  const mainCategorySection = mainCategoryTree.map(x => EventTitleSectionBuilder(catalogSelectors, cart[x] ?? [])).filter(x => x.length > 0).join(" ");
  const fulfillmentShortcode = fulfillmentDto.thirdPartyInfo?.source ? fulfillmentDto.thirdPartyInfo.source.slice(0, 2).toUpperCase() : fulfillmentConfig.shortcode
  const supplementalSections = Object.entries(cart).filter(([cid, _]) => mainCategoryTree.findIndex(x => x === cid) === -1)
    .sort(([cIdA, _], [cIdB, __]) => catalogSelectors.category(cIdA)!.category.ordinal - catalogSelectors.category(cIdB)!.category.ordinal)
    .map(([_, catCart]) => EventTitleSectionBuilder(catalogSelectors, catCart))
    .join(' ');
  return `${fulfillmentShortcode} ${mainCategorySection ? `${mainCategorySection} ` : ''}${customer}${GenerateDineInGuestCountString(fulfillmentDto.dineInInfo ?? null)} ${supplementalSections}${has_special_instructions ? " *" : ""}`;
};

export function MoneyToDisplayString(money: IMoney, showCurrencyUnit: boolean) {
  return `${showCurrencyUnit ? '$' : ""}${(money.amount / 100).toFixed(2)}`;
}

/**
 * Sums the total of products in a cart that match a list of Category IDs
 * @param catIds
 * @param cart 
 * @returns the number products in the category ID list
 */
export function ComputeProductCategoryMatchCount(catIds: string[], cart: CoreCartEntry<unknown>[]) {
  return cart.reduce((acc, e) => acc + (catIds.indexOf(e.categoryId) !== -1 ? e.quantity : 0), 0)
}

/**
 * Returns the full list of category IDs including the passed root category node ID
 * @param rootId 
 * @param categorySelector 
 * @returns child category list sorted by ordinal (only sorted at the end)
 */
export const ComputeCategoryTreeIdList = (rootId: string, categorySelector: Selector<CatalogCategoryEntry>) => {
  const ComputeCategoryTreeIdListInternal: (cId: string) => { id: string; ordinal: number; }[] = (cId) => {
    const category = categorySelector(cId)!;
    return [{ id: cId, ordinal: category.category.ordinal }, ...(category.children.flatMap(x => ComputeCategoryTreeIdListInternal(x)))];
  }
  return ComputeCategoryTreeIdListInternal(rootId).sort((a, b) => a.ordinal - b.ordinal).map(x => x.id);
}

export function RoundToTwoDecimalPlaces(number: number) {
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

export function ComputeCartSubTotal(cart: CoreCartEntry<WProduct>[]): IMoney {
  return { amount: cart.reduce((acc, entry) => acc + (entry.product.m.price.amount * entry.quantity), 0), currency: CURRENCY.USD };
}


type DiscountAccumulator = { remaining: number; credits: OrderLineDiscount[]; };
export const ComputeDiscountsApplied = (subtotalPreCredits: IMoney, creditValidations: UnresolvedDiscount[]): OrderLineDiscount[] => {
  const validations = creditValidations.reduce((acc: DiscountAccumulator, credit) => {
    const amountToApply = credit.t === DiscountMethod.CreditCodeAmount || credit.t === DiscountMethod.ManualAmount ?
      Math.min(acc.remaining, credit.discount.balance.amount) :
      Math.round(RoundToTwoDecimalPlaces(acc.remaining * credit.discount.percentage));
    if (amountToApply === 0) {
      return acc;
    }
    switch (credit.t) {
      case DiscountMethod.CreditCodeAmount: {
        return {
          remaining: acc.remaining - amountToApply,
          credits: [...acc.credits,
          {
            createdAt: credit.createdAt,
            status: credit.status,
            t: credit.t,
            discount: {
              ...credit.discount,
              amount: { currency: CURRENCY.USD, amount: amountToApply }
            }
          }]
        };
      }
      case DiscountMethod.ManualAmount: {
        return {
          remaining: acc.remaining - amountToApply,
          credits: [...acc.credits,
          {
            createdAt: credit.createdAt,
            status: credit.status,
            t: credit.t,
            discount: {
              ...credit.discount,
              amount: { currency: CURRENCY.USD, amount: amountToApply }
            }
          }]
        };
      }
      case DiscountMethod.ManualPercentage: {
        return {
          remaining: acc.remaining - amountToApply,
          credits: [...acc.credits,
          {
            createdAt: credit.createdAt,
            status: credit.status,
            t: credit.t,
            discount: {
              ...credit.discount,
              amount: { currency: CURRENCY.USD, amount: amountToApply }
            }
          }]
        };
      }
    }
  }, { remaining: subtotalPreCredits.amount, credits: [] } satisfies DiscountAccumulator);
  return validations.credits;
}


type PaymentAccumulator = { remaining: number; remainingTip: number; payments: OrderPayment[]; };
/**
 * 
 * @param total the total due, INCLUDING THE TIP
 * @param tips the amount of the tip
 * @param paymentsToValidate the payments to validate and return resolved versions of
 * @returns 
 */
export const ComputePaymentsApplied = (total: IMoney, tips: IMoney, paymentsToValidate: UnresolvedPayment[]): OrderPayment[] => {
  const validations: PaymentAccumulator = paymentsToValidate.reduce((acc: PaymentAccumulator, payment: UnresolvedPayment) => {
    // we don't short circuit when remaining === 0 && remainingTip === 0 because we want to hold on to potential payments in case we need to authorize more
    switch (payment.t) {
      case PaymentMethod.StoreCredit: {
        const amountToApply = Math.min(acc.remaining, payment.payment.balance.amount);
        // apply tip as a percentage of the balance due paid
        const tipToApply = acc.remaining > 0 ? Math.round(RoundToTwoDecimalPlaces(acc.remainingTip * amountToApply / acc.remaining)) : 0
        return <PaymentAccumulator>{
          remaining: acc.remaining - amountToApply,
          remainingTip: acc.remainingTip - tipToApply,
          payments: [...acc.payments,
          {
            ...payment,
            amount: { currency: total.currency, amount: amountToApply },
            tipAmount: { currency: tips.currency, amount: tipToApply },
          }]
        };
      }
      case PaymentMethod.CreditCard: {
        // TODO: need to know if we can modify the tip or amount, but assume we can?
        // otherwise we need to track max authorization amounts, which we probably do.
        // this doesn't really give any option for splitting payments between two cards which we will eventually need
        // or we'll need to split the order itself, which is logic we haven't considered yet
        return <PaymentAccumulator>{
          remaining: 0,
          remainingTip: 0,
          payments: [...acc.payments,
          {
            ...payment,
            amount: { currency: total.currency, amount: acc.remaining },
            tipAmount: { currency: tips.currency, amount: acc.remainingTip },
          }]
        };
      }
      case PaymentMethod.Cash: {
        const amountToApply = Math.min(acc.remaining, payment.payment.amountTendered.amount);
        const tipToApply = acc.remaining > 0 ? Math.round(RoundToTwoDecimalPlaces(acc.remainingTip * amountToApply / acc.remaining)) : 0
        return <PaymentAccumulator>{
          remaining: acc.remaining - amountToApply,
          remainingTip: acc.remainingTip - tipToApply,
          payments: [...acc.payments,
          {
            ...payment,
            amount: { currency: total.currency, amount: amountToApply },
            tipAmount: { currency: tips.currency, amount: tipToApply },
            payment: {
              ...payment.payment,
              change: { currency: payment.payment.amountTendered.currency, amount: payment.payment.amountTendered.amount - amountToApply }
            }
          }]
        };
      }
    }
  }, { remaining: total.amount, remainingTip: tips.amount, payments: [] satisfies OrderPayment[] });
  return validations.payments;
}

export function ComputeGratuityServiceCharge(serviceChargePercentage: number, basis: IMoney): IMoney {
  return { currency: basis.currency, amount: Math.round(RoundToTwoDecimalPlaces(serviceChargePercentage * basis.amount)) };
}

export function ComputeHasBankersRoundingSkew(subtotalAfterDiscount: IMoney, taxRate: number): boolean {
  return RoundToTwoDecimalPlaces(subtotalAfterDiscount.amount * taxRate) % 1 === 0.5;
}

export function ComputeTaxAmount(subtotalAfterDiscount: IMoney, taxRate: number): IMoney {
  return { amount: Math.round(RoundToTwoDecimalPlaces(subtotalAfterDiscount.amount * taxRate)), currency: subtotalAfterDiscount.currency };
}

export function ComputeTipBasis(subtotalPreDiscount: IMoney, taxAmount: IMoney): IMoney {
  return { ...subtotalPreDiscount, amount: subtotalPreDiscount.amount + taxAmount.amount };
}

export function ComputeTipValue(tip: TipSelection | null, basis: IMoney): IMoney {
  return { currency: basis.currency, amount: tip !== null ? (tip.isPercentage ? Math.round(RoundToTwoDecimalPlaces(tip.value * basis.amount)) : tip.value.amount) : 0 };
}

export function ComputeSubtotalPreDiscount(cartTotal: IMoney, serviceFees: IMoney): IMoney {
  return { currency: cartTotal.currency, amount: cartTotal.amount + serviceFees.amount };
}

export function ComputeSubtotalAfterDiscountAndGratuity(subtotalPreDiscount: IMoney, discountApplied: IMoney, gratuityServiceCharge: IMoney): IMoney {
  return { currency: subtotalPreDiscount.currency, amount: subtotalPreDiscount.amount + gratuityServiceCharge.amount - discountApplied.amount };
}

export function ComputeTotal(subtotalAfterDiscountAndGratuity: IMoney, taxAmount: IMoney, tipAmount: IMoney): IMoney {
  return { currency: subtotalAfterDiscountAndGratuity.currency, amount: subtotalAfterDiscountAndGratuity.amount + taxAmount.amount + tipAmount.amount };
}

export function ComputeAutogratuityEnabled(allowTipping: boolean, mainProductCount: number, threshold: number, isDelivery: boolean): boolean {
  return allowTipping && (mainProductCount >= threshold || isDelivery);
}

export function ComputeBalance(total: IMoney, amountPaid: IMoney): IMoney {
  return { currency: total.currency, amount: total.amount - amountPaid.amount };
}

interface RecomputeTotalsArgs {
  config: {
    TAX_RATE: number;
    SERVICE_CHARGE: number;
    AUTOGRAT_THRESHOLD: number;
    CATALOG_SELECTORS: ICatalogSelectors;
  };
  order: WOrderInstancePartial;
  cart: CategorizedRebuiltCart;
  payments: UnresolvedPayment[];
  discounts: UnresolvedDiscount[];
  fulfillment: Pick<FulfillmentConfig, 'orderBaseCategoryId' | 'serviceCharge' | 'allowTipping'>;
}

export const RecomputeTotals = function ({ config, cart, payments, discounts, fulfillment, order }: RecomputeTotalsArgs): RecomputeTotalsResult {
  const mainCategoryTree = ComputeCategoryTreeIdList(fulfillment.orderBaseCategoryId, config.CATALOG_SELECTORS.category);
  const mainCategoryProductCount = ComputeProductCategoryMatchCount(mainCategoryTree, order.cart);
  const cartSubtotal = { currency: CURRENCY.USD, amount: Object.values(cart).reduce((acc, c) => acc + ComputeCartSubTotal(c).amount, 0) };
  const serviceFee = {
    currency: CURRENCY.USD,
    amount: fulfillment.serviceCharge !== null ? OrderFunctional.ProcessOrderInstanceFunction(order, config.CATALOG_SELECTORS.orderInstanceFunction(fulfillment.serviceCharge)!, config.CATALOG_SELECTORS) as number : 0
  };
  const subtotalPreDiscount = ComputeSubtotalPreDiscount(cartSubtotal, serviceFee);
  const discountApplied = ComputeDiscountsApplied(subtotalPreDiscount, discounts);
  const amountDiscounted = { amount: discountApplied.reduce((acc, x) => acc + x.discount.amount.amount, 0), currency: CURRENCY.USD };
  const serviceChargeAmount = ComputeGratuityServiceCharge(config.SERVICE_CHARGE, subtotalPreDiscount);
  const subtotalAfterDiscount = ComputeSubtotalAfterDiscountAndGratuity(subtotalPreDiscount, amountDiscounted, serviceChargeAmount);
  const taxAmount = ComputeTaxAmount(subtotalAfterDiscount, config.TAX_RATE);
  const hasBankersRoundingTaxSkew = ComputeHasBankersRoundingSkew(subtotalAfterDiscount, config.TAX_RATE);
  const tipBasis = ComputeTipBasis(subtotalPreDiscount, taxAmount);
  const tipMinimum = fulfillment.allowTipping && mainCategoryProductCount >= config.AUTOGRAT_THRESHOLD ? ComputeTipValue({ isPercentage: true, isSuggestion: true, value: .2 }, tipBasis) : { currency: CURRENCY.USD, amount: 0 };
  const tipAmount = ComputeTipValue(order.tip, tipBasis);
  const total = ComputeTotal(subtotalAfterDiscount, taxAmount, tipAmount);
  const paymentsApplied = ComputePaymentsApplied(total, tipAmount, payments);
  const amountPaid = { amount: RoundToTwoDecimalPlaces(paymentsApplied.reduce((acc, x) => acc + x.amount.amount, 0)), currency: CURRENCY.USD };
  const balanceAfterPayments = ComputeBalance(total, amountPaid);
  return {
    mainCategoryProductCount,
    cartSubtotal,
    serviceFee,
    subtotalPreDiscount,
    subtotalAfterDiscount,
    serviceChargeAmount,
    discountApplied,
    taxAmount,
    tipBasis,
    tipMinimum,
    tipAmount,
    total,
    paymentsApplied,
    balanceAfterPayments,
    hasBankersRoundingTaxSkew
  };
}