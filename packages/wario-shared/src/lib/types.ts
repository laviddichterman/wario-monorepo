/**
 * This file contains types that are NOT derived from DTOs.
 * These include:
 * - Utility types and helpers
 * - Complex composed types
 * - Function-specific types
 * - Types that don't require validation
 *
 * Types that ARE derived from DTOs belong in derived-types.ts
 */

import type {
  CashPayment,
  CatalogCategoryEntry,
  CatalogModifierEntry,
  CatalogProductEntry,
  CoreCartEntry,
  CreditPayment,
  EncryptStringLock,
  IMoney,
  IOption,
  IOptionState,
  IOptionType,
  IProductInstance,
  IProductInstanceFunction,
  IRecurringInterval,
  IWInterval,
  OrderInstanceFunction,
  OrderLineDiscountCodeAmount,
  OrderManualAmountDiscount,
  OrderManualPercentDiscount,
  ProductModifierEntry,
  StoreCreditPayment,
  WError,
  WOrderInstance,
} from './derived-types';
import type { CategoryDisplay, DISABLE_REASON, StoreCreditType } from './enums';
import type { SelectIds, Selector } from './utility-types';

// =============================================================================
// Utility & Composition Types (Non-DTO)
// =============================================================================

/**
 * A version of {@link Interval} that has both start and end resolved to DateType or number.
 */
export interface WNormalizedInterval<DateType extends Date = Date> {
  /** The start of the interval. */
  start: DateType | number;
  /** The end of the interval. */
  end: DateType | number;
}
export interface AvailabilityInfoMap {
  // the union of blocked off times for the services specified in computation
  blockedOffUnion: IWInterval[];
  // the normal operating intervals for the services specified in computation
  operatingIntervals: IWInterval[];
  // the minutes from current time needed to prepare the order
  leadTime: number;
  // the minimum time step for the service
  minTimeStep: number;
}

// =============================================================================
// Catalog Selector Types
// =============================================================================

export interface ICatalogModifierSelectors {
  option: Selector<IOption>;
  modifierEntry: Selector<CatalogModifierEntry>;
}

export type ICatalogSelectors = ICatalogModifierSelectors & {
  options: SelectIds;
  modifierEntries: SelectIds;
  category: Selector<CatalogCategoryEntry>;
  categories: SelectIds;
  productInstance: Selector<IProductInstance>;
  productInstances: SelectIds;
  productEntry: Selector<CatalogProductEntry>;
  productEntries: SelectIds;
  productInstanceFunction: Selector<IProductInstanceFunction>;
  productInstanceFunctions: SelectIds;
  orderInstanceFunction: Selector<OrderInstanceFunction>;
  orderInstanceFunctions: SelectIds;
};

// =============================================================================
// Product Metadata & Customization Types
// =============================================================================

export type OptionEnableState =
  | { enable: DISABLE_REASON.ENABLED }
  | { enable: DISABLE_REASON.DISABLED_BLANKET }
  | { enable: DISABLE_REASON.DISABLED_TIME; interval: IWInterval }
  | { enable: DISABLE_REASON.DISABLED_WEIGHT }
  | { enable: DISABLE_REASON.DISABLED_FLAVORS }
  | { enable: DISABLE_REASON.DISABLED_NO_SPLITTING }
  | { enable: DISABLE_REASON.DISABLED_SPLIT_DIFFERENTIAL }
  | { enable: DISABLE_REASON.DISABLED_MAXIMUM }
  | { enable: DISABLE_REASON.DISABLED_FULFILLMENT_TYPE; fulfillment: string }
  | { enable: DISABLE_REASON.DISABLED_FUNCTION; functionId: string }
  | { enable: DISABLE_REASON.DISABLED_AVAILABILITY; availability: IRecurringInterval[] };

export interface MetadataModifierOptionMapEntry extends IOptionState {
  enable_left: OptionEnableState;
  enable_right: OptionEnableState;
  enable_whole: OptionEnableState;
}

export interface MetadataModifierMapEntry {
  has_selectable: boolean;
  meets_minimum: boolean;
  options: Record<string, MetadataModifierOptionMapEntry>;
}

export type MetadataModifierMap = Record<string, MetadataModifierMapEntry>;
export type MTID_MOID = [string, string];

export interface ModifierDisplayListByLocation {
  left: MTID_MOID[];
  right: MTID_MOID[];
  whole: MTID_MOID[];
}

export interface WProductMetadata {
  name: string;
  shortname: string;
  description: string;
  price: IMoney;
  pi: [string, string];
  is_split: boolean;
  incomplete: boolean;
  modifier_map: MetadataModifierMap;
  advanced_option_eligible: boolean;
  advanced_option_selected: boolean;
  additional_modifiers: ModifierDisplayListByLocation;
  exhaustive_modifiers: ModifierDisplayListByLocation;
  bake_count: [number, number];
  flavor_count: [number, number];
}

export interface WCPProduct {
  productId: string;
  modifiers: ProductModifierEntry[];
}

export interface WProduct {
  p: WCPProduct;
  m: WProductMetadata;
}

export interface WCPOption {
  mt: IOptionType;
  mo: IOption;
  index: number;
}

// =============================================================================
// Menu Display Types
// =============================================================================

export interface CategoryEntry {
  // in a new version we should be passing the IDs instead of the instances
  menu: IProductInstance[];
  children: string[];
  menu_name: string;
  subtitle: string | null;
  footer: string | null;
  nesting: CategoryDisplay;
  // list of disabled fulfillmentIds
  serviceDisable: string[];
}
// =============================================================================
// Store Credit Helper Types
// =============================================================================

export interface ValidateAndLockCreditResponseValid {
  readonly valid: true;
  readonly lock: EncryptStringLock;
  readonly amount: IMoney;
  readonly credit_type: StoreCreditType;
}
export interface ValidateLockAndSpendSuccess {
  success: true;
  entry: unknown[];
  index: number;
}

export type ValidateAndLockCreditResponse = ValidateAndLockCreditResponseValid | { readonly valid: false };

export interface SpendCreditResponseSuccess {
  readonly success: true;
  readonly balance: IMoney;
}
export type SpendCreditResponse = SpendCreditResponseSuccess | { success: false };

export interface PurchaseStoreCreditResponseSuccess {
  referenceId: string;
  code: string;
  squareOrderId: string;
  amount: IMoney;
  last4: string;
  receiptUrl: string;
}

// =============================================================================
// Cart & Ordering Helper Types
// =============================================================================

export interface ItemWithQuantity<T> {
  quantity: number;
  product: T;
}

// TODO: change CartEntry from WProduct to WCPProduct and derive the metadata via a selector
export interface CartEntry extends CoreCartEntry<WProduct> {
  id: string;
  isLocked: boolean;
}

export type CategorizedRebuiltCart = Record<string, CoreCartEntry<WProduct>[]>;

// =============================================================================
// Payment & Tender Helper Types (utility types derived from other types)
// =============================================================================

export type UnresolvedPayment =
  | Omit<StoreCreditPayment, 'amount' | 'tipAmount'>
  | Omit<CreditPayment, 'amount' | 'tipAmount'>
  | (Omit<CashPayment, 'amount' | 'tipAmount' | 'payment'> & {
      payment: Omit<CashPayment['payment'], 'change'>;
    });

export type UnresolvedDiscount =
  | (Omit<OrderLineDiscountCodeAmount, 'discount'> & {
      discount: Omit<OrderLineDiscountCodeAmount['discount'], 'amount'>;
    })
  | (Omit<OrderManualPercentDiscount, 'discount'> & {
      discount: Omit<OrderManualPercentDiscount['discount'], 'amount'>;
    })
  | (Omit<OrderManualAmountDiscount, 'discount'> & { discount: Omit<OrderManualAmountDiscount['discount'], 'amount'> });

// =============================================================================
// API Response Wrappers
// =============================================================================

export interface ResponseSuccess<T> {
  success: true;
  result: T;
}

export interface ResponseFailure {
  success: false;
  error: WError[];
}

export type PurchaseStoreCreditResponse = ResponseSuccess<PurchaseStoreCreditResponseSuccess> | ResponseFailure;
export type CrudOrderResponse = ResponseSuccess<WOrderInstance> | ResponseFailure;
export type ResponseWithStatusCode<T> = T & { status: number };
