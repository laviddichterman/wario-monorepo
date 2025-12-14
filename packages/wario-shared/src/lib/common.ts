/**
 * Utilities and helpers for shared order/cart/catalog logic.
 *
 * This module contains functions and constants used across the monorepo for:
 * - cart rebuilding and categorization
 * - scheduling / fulfillment time interval building
 * - disabling/availability checks for products and modifier options
 * - price, tax, discount, payment, tip and totals computation
 * - assembly of event/call-line title strings
 *
 * Types referenced in the descriptions below are declared elsewhere in the codebase (e.g. IMoney, WProduct, CoreCartEntry, FulfillmentConfig, etc.).
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { addMinutes, getTime, isSameDay, startOfDay } from 'date-fns';
import { RRule } from 'rrule';

import type {
  CoreCartEntry,
  DineInInfo,
  FulfillmentConfig,
  FulfillmentData,
  FulfillmentTime,
  IMoney,
  IOption,
  IOptionInstance,
  IOptionType,
  IProduct,
  IProductInstance,
  IRecurringInterval,
  IWInterval,
  OrderLineDiscount,
  OrderPayment,
  ProductInstanceModifierEntry,
  TipSelection,
  WOrderInstancePartial,
} from './derived-types';
import {
  CALL_LINE_DISPLAY,
  CURRENCY,
  DISABLE_REASON,
  DiscountMethod,
  OptionPlacement,
  OptionQualifier,
  PaymentMethod,
  PRODUCT_LOCATION,
} from './enums';
import { RoundToTwoDecimalPlaces } from './numbers';
import { GenerateCategoryOrderList } from './objects/ICatalog';
import { OrderFunctional } from './objects/OrderFunctional';
import { CreateProductWithMetadataFromV2 } from './objects/WCPProduct';
import WDateUtils from './objects/WDateUtils';
import type {
  CategorizedRebuiltCart,
  ICatalogSelectors,
  IdOrdinalMap,
  MetadataModifierMapEntry,
  UnresolvedDiscount,
  UnresolvedPayment,
  WNormalizedInterval,
  WProduct,
  WProductMetadata,
} from './types';
import { type Selector } from './utility-types';

export const CREDIT_REGEX = /[A-Za-z0-9]{3}-[A-Za-z0-9]{2}-[A-Za-z0-9]{3}-[A-Z0-9]{8}$/;

export const PRODUCT_NAME_MODIFIER_TEMPLATE_REGEX = /(\{[A-Za-z0-9]+\})/g;

/**
 * ReduceArrayToMapByKey
 *
 * Convert an array of objects into a map keyed by the specified object property.
 *
 * @template T - element object type
 * @param xs - array of objects
 * @param key - property key to index the resulting record by
 * @returns Record<K, T> - object map where each key is the property value and each value is the original object
 */
export function ReduceArrayToMapByKey<T extends Record<K, PropertyKey>, K extends keyof T>(xs: T[], key: K) {
  return Object.fromEntries(xs.map((x) => [x[key], x])) as Record<PropertyKey, T>;
}

export interface RecomputeTotalsResult {
  mainCategoryProductCount: number;
  cartSubtotal: IMoney;
  serviceFee: IMoney;
  subtotalPreDiscount: IMoney;
  subtotalAfterDiscount: IMoney;
  discountApplied: OrderLineDiscount[];
  taxAmount: IMoney;
  tipBasis: IMoney;
  tipMinimum: IMoney;
  tipAmount: IMoney;
  serviceChargeAmount: IMoney;
  total: IMoney;
  paymentsApplied: OrderPayment[];
  balanceAfterPayments: IMoney;
  hasBankersRoundingTaxSkew: boolean;
}

/**
 * RebuildAndSortCart
 *
 * Convert a cart of V2 product DTOs into a categorized rebuilt cart with WProduct objects containing metadata,
 * using provided catalog selectors and a service time/fulfillment id for metadata resolution.
 *
 * @param cart - array of CoreCartEntry with WCPProductV2Dto product DTOs
 * @param catalogSelectors - catalog selector utilities used to look up product/category metadata
 * @param service_time - service date/time used to compute product metadata (Date | number)
 * @param fulfillmentId - id of the fulfillment used when building product metadata
 * @returns CategorizedRebuiltCart - map of categoryId -> array of rebuilt cart entries
 */
export const RebuildAndSortCart = (
  cart: CoreCartEntry[],
  catalogSelectors: ICatalogSelectors,
  service_time: Date | number,
  fulfillmentId: string,
): CategorizedRebuiltCart => {
  return cart.reduce((acc: CategorizedRebuiltCart, entry) => {
    const product = CreateProductWithMetadataFromV2(entry.product, catalogSelectors, service_time, fulfillmentId);
    const rebuiltEntry: CoreCartEntry<WProduct> = { product, categoryId: entry.categoryId, quantity: entry.quantity };
    return {
      ...acc,
      [entry.categoryId]: Object.hasOwn(acc, entry.categoryId)
        ? [...acc[entry.categoryId], rebuiltEntry]
        : [rebuiltEntry],
    };
  }, {});
};

/**
 * Groups and orders cart entries by their category using a category ordering map.
 * @param cart
 * @param categoryOrderMap
 * @returns
 */
export const GroupAndOrderCart = <T extends CoreCartEntry<WProduct>>(cart: T[], categoryOrderMap: IdOrdinalMap) => {
  return Object.entries(
    cart.reduce(
      (cartMap: Record<string, T[]>, entry: T) =>
        Object.hasOwn(cartMap, entry.categoryId)
          ? { ...cartMap, [entry.categoryId]: [...cartMap[entry.categoryId], entry] }
          : { ...cartMap, [entry.categoryId]: [entry] },
      {},
    ),
  ).sort(([keyA, _], [keyB, __]) => (categoryOrderMap[keyA] ?? 0) - (categoryOrderMap[keyB] ?? 0));
};

/**
 * CartByPrinterGroup
 *
 * Group cart entries by their product's printer group. Flattens input and uses the provided product selector
 * to lookup printerGroup on the product; entries with no printer group are omitted.
 *
 * @param cart - array of CoreCartEntry with WProduct instances
 * @param productSelector - selector function to fetch CatalogProductEntry by product id
 * @returns Record<string, CoreCartEntry<WProduct>[]> - map of printerGroupId -> cart entries
 */
// TODO: this could get generified to take WCPProductV2Dto or WCPProduct or WProduct
type MapPrinterGroupToCartEntry = Record<string, CoreCartEntry<WProduct>[]>;
export const CartByPrinterGroup = (
  cart: CoreCartEntry<WProduct>[],
  productSelector: ICatalogSelectors['productEntry'],
): MapPrinterGroupToCartEntry =>
  cart
    .flat()
    .map((x) => ({ entry: x, printerGroupId: productSelector(x.product.p.productId)?.printerGroup ?? null }))
    .filter((x) => x.printerGroupId !== null)
    .reduce(
      (acc: MapPrinterGroupToCartEntry, x) => ({
        ...acc,
        [x.printerGroupId!]: Object.hasOwn(acc, x.printerGroupId!) ? [...acc[x.printerGroupId!], x.entry] : [x.entry],
      }),
      {},
    );

/**
 * DetermineCartBasedLeadTime
 *
 * Estimate a lead time (in minutes) for the given cart by grouping items by prep station and computing
 * the max base prep time per station plus the summed additional unit prep time multiplied by quantities.
 *
 * @param cart - array of CoreCartEntry containing WCPProductV2Dto product DTOs
 * @param productSelector - selector to resolve CatalogProductEntry by product id
 * @returns number - estimated lead time in minutes
 */
// at some point this can use an actual scheduling algorithm, but for the moment it needs to just be a best guess
export const DetermineCartBasedLeadTime = (cart: CoreCartEntry[], productSelector: Selector<IProduct>): number => {
  const leadTimeMap = cart.reduce<Record<number, { base: number; quant: number }>>((acc, cartLine) => {
    const product = productSelector(cartLine.product.pid);
    return product?.timing
      ? {
          ...acc,
          // so we take the max of the base times at a station, then we sum the quantity times
          [product.timing.prepStationId]: Object.hasOwn(acc, product.timing.prepStationId)
            ? {
                base: Math.max(
                  acc[product.timing.prepStationId].base,
                  product.timing.prepTime - product.timing.additionalUnitPrepTime,
                ),
                quant:
                  acc[product.timing.prepStationId].quant + product.timing.additionalUnitPrepTime * cartLine.quantity,
              }
            : {
                base: product.timing.prepTime - product.timing.additionalUnitPrepTime,
                quant: product.timing.additionalUnitPrepTime * cartLine.quantity,
              },
        }
      : acc;
  }, {});
  return Object.values(leadTimeMap).reduce((acc, entry) => Math.max(acc, entry.base + entry.quant), 0);
};

export const GetPlacementFromMIDOID = (
  modifiers: ProductInstanceModifierEntry[],
  mtid: string,
  oid: string,
): IOptionInstance => {
  const NOT_FOUND: IOptionInstance = {
    optionId: oid,
    placement: OptionPlacement.NONE,
    qualifier: OptionQualifier.REGULAR,
  };
  const modifierEntry = modifiers.find((x) => x.modifierTypeId === mtid);
  return modifierEntry !== undefined ? modifierEntry.options.find((x) => x.optionId === oid) || NOT_FOUND : NOT_FOUND;
};

/**
 * DateTimeIntervalBuilder
 *
 * Build a normalized interval ({ start, end }) for a fulfillment time and a maximum fulfillment duration.
 * Uses WDateUtils.ComputeServiceDateTime and adds fulfillmentMaxDuration minutes to compute the end.
 *
 * @param fulfillmentTime - FulfillmentTime describing requested fulfillment slot
 * @param fulfillmentMaxDuration - maximum duration in minutes to extend the interval
 * @returns WNormalizedInterval - interval with concrete Date start and end
 */
export const DateTimeIntervalBuilder = (fulfillmentTime: FulfillmentTime, fulfillmentMaxDuration: number) => {
  // hack for date computation on DST transition days since we're currently not open during the time jump
  const date_lower = WDateUtils.ComputeServiceDateTime(fulfillmentTime);
  const date_upper = addMinutes(date_lower, fulfillmentMaxDuration);
  return { start: date_lower, end: date_upper } as WNormalizedInterval;
};

/** Generic version of the service disable check for a fulfillment ID
 * Used by IProduct, IOption, and IProduct.modifiers
 *
 */
export function IsSomethingDisabledForFulfillment<T extends { serviceDisable: string[] }>(
  something: Pick<T, 'serviceDisable'>,
  fulfillmentId: string,
) {
  return something.serviceDisable.indexOf(fulfillmentId) !== -1;
}

/**
 * Helper constant representing a blanket disabled interval (start > end)
 */
export const BLANKET_DISABLED_INTERVAL: IWInterval = { start: 1, end: 0 };

/**
 * DisableDataCheck
 *
 * Determine whether an item (product or option) is enabled, disabled by blanket disable, disabled by time window,
 * or disabled by recurring availability rules.
 *
 * The function checks:
 * - explicit blanket disable interval (start > end)
 * - explicit time disable interval that contains the order time
 * - configured recurring availability rules (supports both simple intervals and rrule strings)
 *
 * @param disable_data - IWInterval | null - direct disable interval information from catalog metadata
 * @param availabilities - list of recurring availability intervals (IRecurringInterval[])
 * @param order_time - time to check (Date | number | string)
 * @returns one of:
 *  - { enable: DISABLE_REASON.ENABLED }
 *  - { enable: DISABLE_REASON.DISABLED_BLANKET }
 *  - { enable: DISABLE_REASON.DISABLED_TIME, interval: IWInterval }
 *  - { enable: DISABLE_REASON.DISABLED_AVAILABILITY, availability: IRecurringInterval[] }
 *
 * Notes:
 * - when an rrule is provided, the function parses and checks whether the order day matches the recurrence,
 *   then validates the selected fulfillment time against the availability interval.
 * - parse errors of rrule result in that availability being treated as unavailable (logged to console).
 */
export function DisableDataCheck(
  disable_data: IWInterval | null | undefined,
  availabilities: IRecurringInterval[],
  order_time: Date | number | string,
):
  | (
      | { enable: DISABLE_REASON.ENABLED }
      | { enable: DISABLE_REASON.DISABLED_BLANKET }
      | { enable: DISABLE_REASON.DISABLED_TIME; interval: IWInterval }
    )
  | { enable: DISABLE_REASON.DISABLED_AVAILABILITY; availability: IRecurringInterval[] } {
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
      if (availability.rrule === '') {
        // we check for if we're INSIDE the availability interval here since we'll return that we're not otherwise later
        if (
          (availability.interval.start === -1 || orderTimeAsNumber >= availability.interval.start) &&
          (availability.interval.end === -1 || orderTimeAsNumber <= availability.interval.end)
        ) {
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
            if (
              fulfillmentTime.selectedTime >= availability.interval.start &&
              fulfillmentTime.selectedTime <= availability.interval.end
            ) {
              return { enable: DISABLE_REASON.ENABLED };
            }
          }
        } catch (error) {
          console.error(
            `Unable to parse recurrence rule from ${availability.rrule}. Returning unavailable for this rule. Error: ${JSON.stringify(error)}`,
          );
        }
      }
    }
    return { enable: DISABLE_REASON.DISABLED_AVAILABILITY, availability: availabilities };
  }
  return { enable: DISABLE_REASON.ENABLED };
}

/**
 * FilterUnselectableModifierOption
 *
 * Return whether a modifier option (metadata modifier map entry) should be considered selectable.
 * The option is unselectable only when it is disabled in all placements (left, right, whole).
 *
 * @param mmEntry - metadata modifier map entry for the product
 * @param moid - modifier option id to inspect
 * @returns boolean - true if the option is selectable (enabled in at least one placement), false otherwise
 */
export const FilterUnselectableModifierOption = (mmEntry: MetadataModifierMapEntry, moid: string) => {
  const optionMapEntry = mmEntry.options[moid];
  return (
    optionMapEntry.enable_left.enable === DISABLE_REASON.ENABLED ||
    optionMapEntry.enable_right.enable === DISABLE_REASON.ENABLED ||
    optionMapEntry.enable_whole.enable === DISABLE_REASON.ENABLED
  );
};

/**
 * SortAndFilterModifierOptions
 *
 * Given a product's metadata and a modifier type description, return a list of modifier options
 * that are both enabled for the specified serviceDateTime and visible per the modifier's display flags.
 *
 * Behavior:
 * - resolves option entries via modifierOptionSelector
 * - sorts options by their ordinal
 * - filters options based on DisableDataCheck and modifier display flags.omit_options_if_not_available
 *
 * @todo determine if we actually need to call DisableDataCheck per placement or if we can optimize that away
 * since FilterUnselectableModifierOption checks the metadata which is derived from the same logic
 * namely the line in WCPProduct: const is_enabled = enable_modifier_type.enable === DISABLE_REASON.ENABLED ? DisableDataCheck(option_object.disabled, option_object.availability, service_time) : enable_modifier_type;
 *
 * @param metadata - WProductMetadata for the product
 * @param modifierType - IOptionType describing the modifier type
 * @param modifierOptionSelector - selector to resolve IOption objects for modifier options
 * @param serviceDateTime - service date/time to use for availability checks (Date | number)
 * @returns IOption[] - ordered list of available modifier options
 */
export const SortAndFilterModifierOptions = (
  metadata: WProductMetadata,
  modifierType: IOptionType,
  modifierOptionSelector: Selector<IOption>,
  serviceDateTime: Date | number,
) => {
  const filterUnavailable = modifierType.displayFlags.omit_options_if_not_available;
  const mmEntry = metadata.modifier_map[modifierType.id];
  return modifierType.options
    .map((o) => modifierOptionSelector(o)!)
    .filter((o) => {
      const disableInfo = DisableDataCheck(o.disabled, o.availability, serviceDateTime).enable;
      const isUnavailableButStillVisible = !filterUnavailable || FilterUnselectableModifierOption(mmEntry, o.id);
      return disableInfo === DISABLE_REASON.ENABLED && isUnavailableButStillVisible;
    });
};

/**
 * ComputeServiceTimeDisplayString
 *
 * Build a human-friendly display string for a service/fulfillment time range. If minDuration is zero,
 * displays the single formatted time, otherwise shows a range "start to end".
 *
 * @param minDuration - minimum duration (in minutes) to append to selectedTime
 * @param selectedTime - selected time in minutes (since midnight) or other Minutes representation consumed by WDateUtils
 * @returns string - formatted display string (e.g. "10:00 AM to 10:15 AM" or "10:00 AM")
 */
export const ComputeServiceTimeDisplayString = (minDuration: number, selectedTime: number) =>
  minDuration !== 0
    ? `${WDateUtils.MinutesToPrintTime(selectedTime)} to ${WDateUtils.MinutesToPrintTime(selectedTime + minDuration)}`
    : WDateUtils.MinutesToPrintTime(selectedTime);

export const GenerateShortCode = function (productInstanceSelector: Selector<IProductInstance>, p: WProduct) {
  if (p.m.is_split && p.m.pi[PRODUCT_LOCATION.LEFT] !== p.m.pi[PRODUCT_LOCATION.RIGHT]) {
    return `${productInstanceSelector(p.m.pi[PRODUCT_LOCATION.LEFT])?.shortcode ?? 'UNDEFINED'}|${productInstanceSelector(p.m.pi[PRODUCT_LOCATION.RIGHT])?.shortcode ?? 'UNDEFINED'}`;
  }
  return productInstanceSelector(p.m.pi[PRODUCT_LOCATION.LEFT])?.shortcode ?? 'UNDEFINED';
};

export const GenerateDineInGuestCountString = (dineInInfo: DineInInfo | null) =>
  dineInInfo && dineInInfo.partySize > 0 ? ` (${dineInInfo.partySize.toString()})` : '';

/**
 * EventTitleSectionBuilder
 *
 * Build a call-line / event title sub-section for a single category cart:
 * - chooses presentation style based on category.display_flags.call_line_display
 * - supports SHORTCODE, SHORTNAME and QUANTITY display modes
 * SHORTCODE: a single shortcode, repeated quantity times. So if there are two items with a matched shortcode of z then it'll be "z z".
 * SHORTNAME: the short name (like Be + NO NUTS) prefixed by a quantity, like 2xBe + NO NUTS
 * QUANTITY: the quantity followed by the call line name. So like 2B if the category's call line name is B
 *
 * Note: internal helper used by EventTitleStringBuilder. Returns an empty string for empty cart or missing category.
 *
 * @param catalogSelectors - partial catalog selectors containing productInstance and category resolvers
 * @param cart - array of CoreCartEntry<WProduct> for a single category
 * @returns string - formatted section string (may be empty)
 */
const EventTitleSectionBuilder = (
  catalogSelectors: Pick<ICatalogSelectors, 'productInstance' | 'category'>,
  cart: CoreCartEntry<WProduct>[],
) => {
  if (cart.length === 0) {
    return '';
  }
  const category = catalogSelectors.category(cart[0].categoryId);
  if (!category) {
    return '';
  }
  const callLineName = category.display_flags.call_line_name || '';
  const callLineNameWithSpaceIfNeeded = callLineName.length > 0 ? `${callLineName} ` : '';
  const callLineDisplay = category.display_flags.call_line_display;
  switch (callLineDisplay) {
    case CALL_LINE_DISPLAY.SHORTCODE: {
      const { total, shortcodes } = cart.reduce(
        (acc: { total: number; shortcodes: string[] }, entry) => ({
          total: acc.total + entry.quantity,
          shortcodes: [
            ...acc.shortcodes,
            ...Array<string>(entry.quantity).fill(GenerateShortCode(catalogSelectors.productInstance, entry.product)),
          ],
        }),
        { total: 0, shortcodes: [] },
      );
      return `${callLineNameWithSpaceIfNeeded} ${total.toString(10)}x ${shortcodes.join(' ')}`;
    }
    case CALL_LINE_DISPLAY.SHORTNAME: {
      const shortnames: string[] = cart.map((item) => `${item.quantity.toString()}x${item.product.m.shortname}`);
      return `${callLineNameWithSpaceIfNeeded}${shortnames.join(' ')}`;
    }
    case CALL_LINE_DISPLAY.QUANTITY: {
      // would be nice to have a
      const total = cart.reduce((total, entry) => total + entry.quantity, 0);
      return `${total.toString(10)}${callLineName || 'x'}`;
    }
  }
};

/**
 * EventTitleStringBuilder
 *
 * Compose a full event title string for an order (used for call-line or third-party integrations).
 * The title integrates:
 * - a fulfillment shortcode (either derived from thirdPartyInfo or configured shortcode)
 * - a main category section built from the base order category tree
 * - supplemental sections for other categories
 * - customer name
 * - optional dine-in guest count
 * - indicator for special instructions
 *
 * @param catalogSelectors - catalog selectors with category and productInstance resolvers
 * @param fulfillmentConfig - fulfills minimal fields: orderBaseCategoryId and shortcode
 * @param customer - customer display name
 * @param fulfillmentDto - FulfillmentDto containing third-party info and dineInInfo
 * @param cart - CategorizedRebuiltCart mapping category id to cart entries
 * @param special_instructions - freeform special instructions string
 * @returns string - assembled event title
 */
export const EventTitleStringBuilder = (
  catalogSelectors: Pick<ICatalogSelectors, 'category' | 'productInstance'>,
  categoryIdOrdinalMap: IdOrdinalMap,
  fulfillmentConfig: Pick<FulfillmentConfig, 'orderBaseCategoryId' | 'shortcode'>,
  customer: string,
  fulfillmentDto: FulfillmentData,
  cart: CategorizedRebuiltCart,
  special_instructions: string,
) => {
  const has_special_instructions = special_instructions && special_instructions.length > 0;
  const mainCategoryTree = GenerateCategoryOrderList(fulfillmentConfig.orderBaseCategoryId, catalogSelectors.category);
  const mainCategorySection = mainCategoryTree
    .map((x) => EventTitleSectionBuilder(catalogSelectors, cart[x] ?? []))
    .filter((x) => x.length > 0)
    .join(' ');
  const fulfillmentShortcode = fulfillmentDto.thirdPartyInfo?.source
    ? fulfillmentDto.thirdPartyInfo.source.slice(0, 2).toUpperCase()
    : fulfillmentConfig.shortcode;
  const supplementalSections = Object.entries(cart)
    .filter(([cid, _]) => mainCategoryTree.findIndex((x) => x === cid) === -1)
    .sort(([cIdA, _], [cIdB, __]) => categoryIdOrdinalMap[cIdA] - categoryIdOrdinalMap[cIdB])
    .map(([_, catCart]) => EventTitleSectionBuilder(catalogSelectors, catCart))
    .join(' ');
  return `${fulfillmentShortcode} ${mainCategorySection ? `${mainCategorySection} ` : ''}${customer}${GenerateDineInGuestCountString(fulfillmentDto.dineInInfo ?? null)} ${supplementalSections}${has_special_instructions ? ' *' : ''}`;
};

export function MoneyToDisplayString(money: IMoney, showCurrencyUnit: boolean) {
  return `${showCurrencyUnit ? '$' : ''}${(money.amount / 100).toFixed(2)}`;
}

/**
 * Sums the total of products in a cart that match a list of Category IDs
 * @param catIds
 * @param cart
 * @returns the number products in the category ID list
 */
export function ComputeProductCategoryMatchCount(catIds: string[], cart: CoreCartEntry<unknown>[]) {
  return cart.reduce((acc, e) => acc + (catIds.indexOf(e.categoryId) !== -1 ? e.quantity : 0), 0);
}

/**
 * ComputeCartSubTotal
 *
 * Sum the price * quantity for each cart entry and return as IMoney in USD.
 *
 * @param cart - array of CoreCartEntry<WProduct>
 * @returns IMoney - subtotal amount in cents (or smallest currency unit) with currency USD
 */
export function ComputeCartSubTotal(cart: CoreCartEntry<WProduct>[]): IMoney {
  return {
    amount: cart.reduce((acc, entry) => acc + entry.product.m.price.amount * entry.quantity, 0),
    currency: CURRENCY.USD,
  };
}

/**
 * ComputeDiscountsApplied
 *
 * Given a pre-credit subtotal and a list of UnresolvedDiscount validations, return a resolved list of OrderLineDiscounts
 * that are actually applied, respecting the order of the credits and available remaining amount.
 *
 * Behavior:
 * - percentage credits are applied to the current remaining balance (rounded appropriately).
 * - amount credits (credit codes or manual amounts) deduct up to the remaining balance.
 * - credits that would apply zero are omitted.
 *
 * @param subtotalPreCredits - IMoney representing the subtotal before credits
 * @param creditValidations - array of UnresolvedDiscount describing discounts/credits to attempt to apply
 * @returns OrderLineDiscount[] - resolved discounts that were applied with amounts normalized to USD
 */
type DiscountAccumulator = { remaining: number; credits: OrderLineDiscount[] };
export const ComputeDiscountsApplied = (
  subtotalPreCredits: IMoney,
  creditValidations: UnresolvedDiscount[],
): OrderLineDiscount[] => {
  const validations = creditValidations.reduce(
    (acc: DiscountAccumulator, credit) => {
      const amountToApply =
        credit.t === DiscountMethod.CreditCodeAmount || credit.t === DiscountMethod.ManualAmount
          ? Math.min(acc.remaining, credit.discount.balance.amount)
          : Math.round(RoundToTwoDecimalPlaces(acc.remaining * credit.discount.percentage));
      if (amountToApply === 0) {
        return acc;
      }
      switch (credit.t) {
        case DiscountMethod.CreditCodeAmount: {
          return {
            remaining: acc.remaining - amountToApply,
            credits: [
              ...acc.credits,
              {
                createdAt: credit.createdAt,
                status: credit.status,
                t: credit.t,
                discount: {
                  ...credit.discount,
                  amount: { currency: CURRENCY.USD, amount: amountToApply },
                },
              },
            ],
          };
        }
        case DiscountMethod.ManualAmount: {
          return {
            remaining: acc.remaining - amountToApply,
            credits: [
              ...acc.credits,
              {
                createdAt: credit.createdAt,
                status: credit.status,
                t: credit.t,
                discount: {
                  ...credit.discount,
                  amount: { currency: CURRENCY.USD, amount: amountToApply },
                },
              },
            ],
          };
        }
        case DiscountMethod.ManualPercentage: {
          return {
            remaining: acc.remaining - amountToApply,
            credits: [
              ...acc.credits,
              {
                createdAt: credit.createdAt,
                status: credit.status,
                t: credit.t,
                discount: {
                  ...credit.discount,
                  amount: { currency: CURRENCY.USD, amount: amountToApply },
                },
              },
            ],
          };
        }
      }
    },
    { remaining: subtotalPreCredits.amount, credits: [] } satisfies DiscountAccumulator,
  );
  return validations.credits;
};

type PaymentAccumulator = { remaining: number; remainingTip: number; payments: OrderPayment[] };
/**
 * ComputePaymentsApplied
 *
 * Resolve a list of UnresolvedPayment entries into concrete OrderPayment entries applied toward a total due.
 * The total parameter includes tip; tips parameter is the IMoney representing tip amounts to be applied.
 *
 * Rules:
 * - StoreCredit is consumed up to the remaining balance and apportions tip as a proportional share of the amount paid.
 * - CreditCard consumes the rest of the remaining balance and tip in full (single-card assumption).
 * - Cash consumes up to the remaining balance, apportions tip proportionally, and records change if amountTendered > applied amount.
 *
 * @param total - IMoney total due (including tip)
 * @param tips - IMoney representing tip amounts (basis for distribution)
 * @param paymentsToValidate - UnresolvedPayment[] payments in priority order to validate/apply
 * @returns OrderPayment[] - resolved payments applied with explicit amount and tipAmount fields and any change information
 */
export const ComputePaymentsApplied = (
  total: IMoney,
  tips: IMoney,
  paymentsToValidate: UnresolvedPayment[],
): OrderPayment[] => {
  const validations: PaymentAccumulator = paymentsToValidate.reduce(
    (acc: PaymentAccumulator, payment: UnresolvedPayment) => {
      // we don't short circuit when remaining === 0 && remainingTip === 0 because we want to hold on to potential payments in case we need to authorize more
      switch (payment.t) {
        case PaymentMethod.StoreCredit: {
          const amountToApply = Math.min(acc.remaining, payment.payment.balance.amount);
          // apply tip as a percentage of the balance due paid
          const tipToApply =
            acc.remaining > 0
              ? Math.round(RoundToTwoDecimalPlaces((acc.remainingTip * amountToApply) / acc.remaining))
              : 0;
          return <PaymentAccumulator>{
            remaining: acc.remaining - amountToApply,
            remainingTip: acc.remainingTip - tipToApply,
            payments: [
              ...acc.payments,
              {
                ...payment,
                amount: { currency: total.currency, amount: amountToApply },
                tipAmount: { currency: tips.currency, amount: tipToApply },
              },
            ],
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
            payments: [
              ...acc.payments,
              {
                ...payment,
                amount: { currency: total.currency, amount: acc.remaining },
                tipAmount: { currency: tips.currency, amount: acc.remainingTip },
              },
            ],
          };
        }
        case PaymentMethod.Cash: {
          const amountToApply = Math.min(acc.remaining, payment.payment.amountTendered.amount);
          const tipToApply =
            acc.remaining > 0
              ? Math.round(RoundToTwoDecimalPlaces((acc.remainingTip * amountToApply) / acc.remaining))
              : 0;
          return <PaymentAccumulator>{
            remaining: acc.remaining - amountToApply,
            remainingTip: acc.remainingTip - tipToApply,
            payments: [
              ...acc.payments,
              {
                ...payment,
                amount: { currency: total.currency, amount: amountToApply },
                tipAmount: { currency: tips.currency, amount: tipToApply },
                payment: {
                  ...payment.payment,
                  change: {
                    currency: payment.payment.amountTendered.currency,
                    amount: payment.payment.amountTendered.amount - amountToApply,
                  },
                },
              },
            ],
          };
        }
      }
    },
    { remaining: total.amount, remainingTip: tips.amount, payments: [] satisfies OrderPayment[] },
  );
  return validations.payments;
};

/**
 * ComputeGratuityServiceCharge
 *
 * Compute a service charge (gratuity) amount given a percentage and a basis amount.
 *
 * @param serviceChargePercentage - fractional percentage (e.g. 0.2 for 20%)
 * @param basis - IMoney basis from which to compute the service charge
 * @returns IMoney - computed service charge, rounded to integer currency units
 */
export function ComputeGratuityServiceCharge(serviceChargePercentage: number, basis: IMoney): IMoney {
  return {
    currency: basis.currency,
    amount: Math.round(RoundToTwoDecimalPlaces(serviceChargePercentage * basis.amount)),
  };
}

/**
 * ComputeHasBankersRoundingSkew
 *
 * Detect whether bankers rounding will produce a .5 skew for tax computation by checking whether
 * rounding(subtotalAfterDiscount * taxRate) yields a fractional half-cent (.5).
 *
 * @param subtotalAfterDiscount - IMoney subtotal after discounts and gratuity
 * @param taxRate - tax multiplier (e.g. 0.0875)
 * @returns boolean - true if a bankers rounding skew is present
 */
export function ComputeHasBankersRoundingSkew(subtotalAfterDiscount: IMoney, taxRate: number): boolean {
  return RoundToTwoDecimalPlaces(subtotalAfterDiscount.amount * taxRate) % 1 === 0.5;
}

export function ComputeTaxAmount(subtotalAfterDiscount: IMoney, taxRate: number): IMoney {
  return {
    amount: Math.round(RoundToTwoDecimalPlaces(subtotalAfterDiscount.amount * taxRate)),
    currency: subtotalAfterDiscount.currency,
  };
}

export function ComputeTipBasis(subtotalPreDiscount: IMoney, taxAmount: IMoney): IMoney {
  return { ...subtotalPreDiscount, amount: subtotalPreDiscount.amount + taxAmount.amount };
}

export function ComputeTipValue(tip: TipSelection | null, basis: IMoney): IMoney {
  return {
    currency: basis.currency,
    amount:
      tip !== null
        ? tip.isPercentage
          ? Math.round(RoundToTwoDecimalPlaces(tip.value * basis.amount))
          : tip.value.amount
        : 0,
  };
}

export function ComputeSubtotalPreDiscount(cartTotal: IMoney, serviceFees: IMoney): IMoney {
  return { currency: cartTotal.currency, amount: cartTotal.amount + serviceFees.amount };
}

export function ComputeSubtotalAfterDiscountAndGratuity(
  subtotalPreDiscount: IMoney,
  discountApplied: IMoney,
  gratuityServiceCharge: IMoney,
): IMoney {
  return {
    currency: subtotalPreDiscount.currency,
    amount: subtotalPreDiscount.amount + gratuityServiceCharge.amount - discountApplied.amount,
  };
}

export function ComputeTotal(subtotalAfterDiscountAndGratuity: IMoney, taxAmount: IMoney, tipAmount: IMoney): IMoney {
  return {
    currency: subtotalAfterDiscountAndGratuity.currency,
    amount: subtotalAfterDiscountAndGratuity.amount + taxAmount.amount + tipAmount.amount,
  };
}

export function ComputeAutogratuityEnabled(
  allowTipping: boolean,
  mainProductCount: number,
  threshold: number,
  isDelivery: boolean,
): boolean {
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

export interface RecomputeTotalsResult {
  mainCategoryProductCount: number;
  cartSubtotal: IMoney;
  serviceFee: IMoney;
  subtotalPreDiscount: IMoney;
  subtotalAfterDiscount: IMoney;
  discountApplied: OrderLineDiscount[];
  taxAmount: IMoney;
  tipBasis: IMoney;
  tipMinimum: IMoney;
  tipAmount: IMoney;
  serviceChargeAmount: IMoney;
  total: IMoney;
  paymentsApplied: OrderPayment[];
  balanceAfterPayments: IMoney;
  hasBankersRoundingTaxSkew: boolean;
}

/**
 * RecomputeTotals
 *
 * Given full context (catalog configuration, order/cart state, payments, discounts, fulfillment settings),
 * recompute all derived financial and order summary values necessary for display and further processing.
 *
 * The function returns a RecomputeTotalsResult containing:
 * - mainCategoryProductCount
 * - cartSubtotal
 * - serviceFee
 * - subtotalPreDiscount
 * - subtotalAfterDiscount
 * - serviceChargeAmount
 * - discountApplied (resolved list)
 * - taxAmount
 * - tipBasis
 * - tipMinimum (suggested/autogratuity minimum)
 * - tipAmount (from order)
 * - total (grand total)
 * - paymentsApplied (resolved list)
 * - balanceAfterPayments
 * - hasBankersRoundingTaxSkew
 *
 * Key behaviors:
 * - resolves service fee using OrderFunctional.ProcessOrderInstanceFunction if configured
 * - applies discounts in provided order and caps them to available remaining subtotal
 * - computes service charge, tax and tip in the configured sequence
 * - resolves and apportions payments against the total
 *
 * @param args - RecomputeTotalsArgs gathering:
 *   - config: TAX_RATE, SERVICE_CHARGE, AUTOGRAT_THRESHOLD, CATALOG_SELECTORS
 *   - order: WOrderInstancePartial (order instance to inspect)
 *   - cart: CategorizedRebuiltCart (rebuilt cart to compute subtotals)
 *   - payments: UnresolvedPayment[] list of candidate payments (in priority order)
 *   - discounts: UnresolvedDiscount[] list of candidate discounts (in priority order)
 *   - fulfillment: minimal FulfillmentConfig slice (orderBaseCategoryId, serviceCharge, allowTipping)
 * @returns RecomputeTotalsResult - full set of recomputed monetary and order summary fields
 */
export const RecomputeTotals = function ({
  config,
  cart,
  payments,
  discounts,
  fulfillment,
  order,
}: RecomputeTotalsArgs): RecomputeTotalsResult {
  const mainCategoryTree = GenerateCategoryOrderList(
    fulfillment.orderBaseCategoryId,
    config.CATALOG_SELECTORS.category,
  );
  const mainCategoryProductCount = ComputeProductCategoryMatchCount(mainCategoryTree, order.cart);
  const cartSubtotal = {
    currency: CURRENCY.USD,
    amount: Object.values(cart).reduce((acc, c) => acc + ComputeCartSubTotal(c).amount, 0),
  };
  const serviceChargeFunction = fulfillment.serviceCharge
    ? config.CATALOG_SELECTORS.orderInstanceFunction(fulfillment.serviceCharge)
    : null;
  const serviceFee = {
    currency: CURRENCY.USD,
    amount: serviceChargeFunction
      ? (OrderFunctional.ProcessOrderInstanceFunction(order, serviceChargeFunction, config.CATALOG_SELECTORS) as number)
      : 0,
  };
  const subtotalPreDiscount = ComputeSubtotalPreDiscount(cartSubtotal, serviceFee);
  const discountApplied = ComputeDiscountsApplied(subtotalPreDiscount, discounts);
  const amountDiscounted = {
    amount: discountApplied.reduce((acc, x) => acc + x.discount.amount.amount, 0),
    currency: CURRENCY.USD,
  };
  const serviceChargeAmount = ComputeGratuityServiceCharge(config.SERVICE_CHARGE, subtotalPreDiscount);
  const subtotalAfterDiscount = ComputeSubtotalAfterDiscountAndGratuity(
    subtotalPreDiscount,
    amountDiscounted,
    serviceChargeAmount,
  );
  const taxAmount = ComputeTaxAmount(subtotalAfterDiscount, config.TAX_RATE);
  const hasBankersRoundingTaxSkew = ComputeHasBankersRoundingSkew(subtotalAfterDiscount, config.TAX_RATE);
  const tipBasis = ComputeTipBasis(subtotalPreDiscount, taxAmount);
  const tipMinimum =
    fulfillment.allowTipping && mainCategoryProductCount >= config.AUTOGRAT_THRESHOLD
      ? ComputeTipValue({ isPercentage: true, isSuggestion: true, value: 0.2 }, tipBasis)
      : { currency: CURRENCY.USD, amount: 0 };
  const tipAmount = ComputeTipValue(order.tip, tipBasis);
  const total = ComputeTotal(subtotalAfterDiscount, taxAmount, tipAmount);
  const paymentsApplied = ComputePaymentsApplied(total, tipAmount, payments);
  const amountPaid = {
    amount: RoundToTwoDecimalPlaces(paymentsApplied.reduce((acc, x) => acc + x.amount.amount, 0)),
    currency: CURRENCY.USD,
  };
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
    hasBankersRoundingTaxSkew,
  };
};
