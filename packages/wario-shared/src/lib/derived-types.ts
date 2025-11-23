/**
 * This file contains TypeScript types derived from DTO classes.
 * These types are generated from the DTO classes to eliminate duplication
 * and ensure that DTOs are the single source of truth.
 * 
 * IMPORTANT: This file should ONLY contain types derived directly from DTOs.
 * Complex types, utility types, and types not based on DTOs belong in types.ts.
 */

import type { Polygon } from 'geojson';

import type {
  CatalogCategoryEntryDto,
  CatalogModifierEntryDto,
  CatalogProductEntryDto,
  ICatalogDto,
} from './dto/catalog.dto';
import type { ICategoryDto } from './dto/category.dto';
import type {
  AddressComponentDto,
  DeliveryAddressValidateRequestDto,
  DeliveryAddressValidateResponseDto,
  DeliveryInfoDto,
  EncryptStringLockDto,
  IMoneyDto,
  IRecurringIntervalDto,
  IWIntervalDto,
  KeyValueDto,
  SeatingSectionDto,
  SemverDto,
  TipSelectionAmountDto,
  TipSelectionPercentageDto,
  WErrorDto,
} from './dto/common.dto';
import type {
  AbstractExpressionConstLiteralDto,
  AbstractExpressionHasAnyOfModifierExpressionDto,
  AbstractExpressionModifierPlacementExpressionDto,
  AbstractExpressionProductMetadataDto,
  AbstractOrderExpressionConstLiteralDto,
  ConstBooleanLiteralExpressionDto,
  ConstModifierPlacementLiteralExpressionDto,
  ConstModifierQualifierLiteralExpressionDto,
  ConstNumberLiteralExpressionDto,
  ConstStringLiteralExpressionDto,
  IHasAnyOfModifierExpressionDto,
  IIfElseExpressionDto,
  ILogicalExpressionDto,
  IModifierPlacementExpressionDto,
  IProductInstanceFunctionDto,
  OrderInstanceFunctionDto,
  ProductMetadataExpressionDto,
} from './dto/expression.dto';
import type { FulfillmentConfigDto } from './dto/fulfillment.dto';
import type {
  DateIntervalEntryDto,
  OperatingHourSpecificationDto,
  PostBlockedOffToFulfillmentsRequestDto,
} from './dto/interval.dto';
import type {
  IOptionDto,
  IOptionInstanceDto,
  IOptionStateDto,
  IOptionTypeDto,
} from './dto/modifier.dto';
import type {
  CashPaymentAllocatedDto,
  CashPaymentProposedDto,
  CoreCartEntryDto,
  CreateOrderRequestV2Dto,
  CreditPaymentAllocatedDto,
  CreditPaymentProposedDto,
  CustomerInfoDataDto,
  DineInInfoDto,
  FulfillmentDataDto,
  FulfillmentTimeDto,
  IssueStoreCreditRequestDto,
  MetricsDto,
  OrderLineDiscountCodeAmountDto,
  OrderManualAmountDiscountDto,
  OrderManualPercentDiscountDto,
  OrderTaxDto,
  SeatingResourceDto,
  StoreCreditPaymentAllocatedDto,
  StoreCreditPaymentProposedDto,
  TenderBaseAllocatedDto,
  TenderBaseProposedDto,
  ThirdPartyInfoDto,
  WCPProductV2Dto,
  WOrderInstanceDto,
  WOrderInstancePartialDto,
  WSeatingInfoDto,
} from './dto/order.dto';
import type {
  IProductDisplayFlagsFullDto,
  IProductDto,
  IProductInstanceDto,
  IProductModifierDto,
  PrepTimingDto,
  ProductModifierEntryDto,
} from './dto/product.dto';
import type { OrderInstanceFunctionType, ProductInstanceFunctionType } from './enums';
import type { DistributiveOmit } from './utility-types';

// =============================================================================
// Common Types (from common.dto.ts)
// =============================================================================

export type SEMVER = Omit<SemverDto, never>;
export type WError = Omit<WErrorDto, never>;
export type KeyValue = Omit<KeyValueDto, never>;
// Represents a time interval. If start or end is -1, it means unbounded in that direction.
export type IWInterval = Omit<IWIntervalDto, never>;
export type IMoney = Omit<IMoneyDto, never>;
export type EncryptStringLock = Omit<EncryptStringLockDto, never>;
/**
 * Availability interval. if rrule === '' then interval represents the start and end time of when the thing is available.
 * -1 for either start or end means the value is unbounded.
 * if rrule !== '' then rrule is an rrule string and the values within interval (start and end) should be construed as times within the day (0 to 24*60*60*1000).
 */
export type IRecurringInterval = Omit<IRecurringIntervalDto, never>;
export type TipSelectionPercentage = Omit<TipSelectionPercentageDto, never>;
export type TipSelectionAmount = Omit<TipSelectionAmountDto, never>;
export type TipSelection = TipSelectionPercentage | TipSelectionAmount;
export type AddressComponent = Omit<AddressComponentDto, never>;
export type DeliveryAddressValidateRequest = Omit<DeliveryAddressValidateRequestDto, never>;
export type DeliveryAddressValidateResponse = Omit<DeliveryAddressValidateResponseDto, never>;
export type DeliveryInfo = Omit<DeliveryInfoDto, never>;
export type SeatingSection = Omit<SeatingSectionDto, never>;

// =============================================================================
// Interval Types (from interval.dto.ts)
// =============================================================================

export type DateIntervalEntry = Omit<DateIntervalEntryDto, never>;
export type DateIntervalsEntries = DateIntervalEntry[];
export type OperatingHourSpecification = Omit<OperatingHourSpecificationDto, never>;
export type PostBlockedOffToFulfillmentsRequest = Omit<PostBlockedOffToFulfillmentsRequestDto, never>;
export type SetLeadTimesRequest = Record<string, number>;

// =============================================================================
// Fulfillment Types (from fulfillment.dto.ts)
// =============================================================================

export type FulfillmentConfig = Omit<FulfillmentConfigDto, 'serviceArea'> & {
  serviceArea?: Polygon;
};
export type FulfillmentConfigMap = Record<string, FulfillmentConfig>;

// =============================================================================
// Modifier/Option Types (from modifier.dto.ts)
// =============================================================================

export type IOptionState = Omit<IOptionStateDto, never>;
export type IOptionType = Omit<IOptionTypeDto, never>;
export type IOption = Omit<IOptionDto, never>;
export type IOptionInstance = Omit<IOptionInstanceDto, never>;

// =============================================================================
// Category Types (from category.dto.ts)
// =============================================================================

export type ICategory = Omit<ICategoryDto, never>;

// =============================================================================
// Product Types (from product.dto.ts)
// =============================================================================

export type PrepTiming = Omit<PrepTimingDto, never>;
export type IProductModifier = Omit<IProductModifierDto, never>;
export type IProduct = Omit<IProductDto, never>;
export type IProductDisplayFlags = Omit<IProductDisplayFlagsFullDto, never>;
export type ProductModifierEntry = Omit<ProductModifierEntryDto, never>;
export type IProductInstance = Omit<IProductInstanceDto, never>;

// =============================================================================
// Catalog Types (from catalog.dto.ts)
// =============================================================================

export type RecordModifierOptions = Record<string, IOption>;
export type CatalogModifierEntry = Omit<CatalogModifierEntryDto, never>;
export type ICatalogModifiers = Record<string, CatalogModifierEntry>;
export type CatalogCategoryEntry = Omit<CatalogCategoryEntryDto, never>;
export type ICatalogCategories = Record<string, CatalogCategoryEntry>;
export type RecordProductInstances = Record<string, IProductInstance>;
export type CatalogProductEntry = Omit<CatalogProductEntryDto, never>;
export type ICatalogProducts = Record<string, CatalogProductEntry>;
export type RecordProductInstanceFunctions = Record<string, IProductInstanceFunction>;
export type RecordOrderInstanceFunctions = Record<string, OrderInstanceFunction>;

export type ICatalog = Omit<ICatalogDto, 'productInstanceFunctions' | 'orderInstanceFunctions'> & {
  productInstanceFunctions: RecordProductInstanceFunctions;
  orderInstanceFunctions: RecordOrderInstanceFunctions;
};

// =============================================================================
// Expression Types (from expression.dto.ts)
// =============================================================================

export type ConstStringLiteralExpression = Omit<ConstStringLiteralExpressionDto, never>;
export type ConstNumberLiteralExpression = Omit<ConstNumberLiteralExpressionDto, never>;
export type ConstBooleanLiteralExpression = Omit<ConstBooleanLiteralExpressionDto, never>;
export type ConstModifierPlacementLiteralExpression = Omit<ConstModifierPlacementLiteralExpressionDto, never>;
export type ConstModifierQualifierLiteralExpression = Omit<ConstModifierQualifierLiteralExpressionDto, never>;

export type IConstLiteralExpression =
  | ConstStringLiteralExpression
  | ConstNumberLiteralExpression
  | ConstBooleanLiteralExpression
  | ConstModifierPlacementLiteralExpression
  | ConstModifierQualifierLiteralExpression;

export type IIfElseExpression<T> = Omit<IIfElseExpressionDto<T>, never>;
export type ILogicalExpression<T> = Omit<ILogicalExpressionDto<T>, never>;
export type IModifierPlacementExpression = Omit<IModifierPlacementExpressionDto, never>;
export type IHasAnyOfModifierExpression = Omit<IHasAnyOfModifierExpressionDto, never>;
export type ProductMetadataExpression = Omit<ProductMetadataExpressionDto, never>;

export type AbstractExpressionConstLiteral = Omit<AbstractExpressionConstLiteralDto, never>;
export type AbstractExpressionProductMetadata = Omit<AbstractExpressionProductMetadataDto, never>;
export type AbstractExpressionIfElseExpression = Omit<AbstractExpressionConstLiteralDto, 'expr' | 'discriminator'> & {
  expr: IIfElseExpression<IAbstractExpression>;
  discriminator: ProductInstanceFunctionType.IfElse;
};
export type AbstractExpressionLogicalExpression = Omit<AbstractExpressionConstLiteralDto, 'expr' | 'discriminator'> & {
  expr: ILogicalExpression<IAbstractExpression>;
  discriminator: ProductInstanceFunctionType.Logical;
};
export type AbstractExpressionModifierPlacementExpression = Omit<AbstractExpressionModifierPlacementExpressionDto, never>;
export type AbstractExpressionHasAnyOfModifierExpression = Omit<AbstractExpressionHasAnyOfModifierExpressionDto, never>;

export type IAbstractExpression =
  | AbstractExpressionConstLiteral
  | AbstractExpressionProductMetadata
  | AbstractExpressionIfElseExpression
  | AbstractExpressionLogicalExpression
  | AbstractExpressionModifierPlacementExpression
  | AbstractExpressionHasAnyOfModifierExpression;

export type IProductInstanceFunction = Omit<IProductInstanceFunctionDto, 'expression'> & {
  expression: IAbstractExpression;
};

export type AbstractOrderExpressionConstLiteral = Omit<AbstractOrderExpressionConstLiteralDto, never>;
export type AbstractOrderExpressionIfElseExpression = Omit<AbstractOrderExpressionConstLiteralDto, 'expr' | 'discriminator'> & {
  expr: IIfElseExpression<AbstractOrderExpression>;
  discriminator: OrderInstanceFunctionType.IfElse;
};
export type AbstractOrderExpressionLogicalExpression = Omit<AbstractOrderExpressionConstLiteralDto, 'expr' | 'discriminator'> & {
  expr: ILogicalExpression<AbstractOrderExpression>;
  discriminator: OrderInstanceFunctionType.Logical;
};

export type AbstractOrderExpression =
  | AbstractOrderExpressionConstLiteral
  | AbstractOrderExpressionIfElseExpression
  | AbstractOrderExpressionLogicalExpression;

export type OrderInstanceFunction = Omit<OrderInstanceFunctionDto, 'expression'> & {
  expression: AbstractOrderExpression;
};

// =============================================================================
// Order Types (from order.dto.ts)
// =============================================================================

export type SeatingResource = Omit<SeatingResourceDto, never>;
export type WSeatingInfo = Omit<WSeatingInfoDto, never>;
export type DineInInfo = Omit<DineInInfoDto, never>;
export type ThirdPartyInfo = Omit<ThirdPartyInfoDto, never>;
export type FulfillmentTime = Omit<FulfillmentTimeDto, never>;
export type FulfillmentData = DistributiveOmit<FulfillmentDataDto, never>;
export type CustomerInfoData = Omit<CustomerInfoDataDto, never>;
export type WCPProductV2 = Omit<WCPProductV2Dto, never>;
export type CoreCartEntry<T = WCPProductV2> = Omit<CoreCartEntryDto, 'product'> & {
  product: T;
};
export type Metrics = Omit<MetricsDto, never>;

// Tender/Payment base types
export type TenderBase = TenderBaseAllocated | TenderBaseProposed;
export type TenderBaseAllocated = Omit<TenderBaseAllocatedDto, never>;
export type TenderBaseProposed = Omit<TenderBaseProposedDto, never>;

// Payment types
export type StoreCreditPaymentProposed = Omit<StoreCreditPaymentProposedDto, never>;
export type StoreCreditPaymentAllocated = Omit<StoreCreditPaymentAllocatedDto, never>;
export type StoreCreditPayment = StoreCreditPaymentProposed | StoreCreditPaymentAllocated;

export type CashPaymentProposed = Omit<CashPaymentProposedDto, never>;
export type CashPaymentAllocated = Omit<CashPaymentAllocatedDto, never>;
export type CashPayment = CashPaymentAllocated | CashPaymentProposed;

export type CreditPaymentProposed = Omit<CreditPaymentProposedDto, never>;
export type CreditPaymentAllocated = Omit<CreditPaymentAllocatedDto, never>;
export type CreditPayment = CreditPaymentProposed | CreditPaymentAllocated;

export type OrderPaymentProposed = CashPaymentProposed | CreditPaymentProposed | StoreCreditPaymentProposed;
export type OrderPaymentAllocated = CashPaymentAllocated | CreditPaymentAllocated | StoreCreditPaymentAllocated;
export type OrderPayment = CashPayment | CreditPayment | StoreCreditPayment;

// Discount types
export type OrderManualPercentDiscount = Omit<OrderManualPercentDiscountDto, never>;
export type OrderManualAmountDiscount = Omit<OrderManualAmountDiscountDto, never>;
export type OrderLineDiscountCodeAmount = Omit<OrderLineDiscountCodeAmountDto, never>;
export type OrderLineDiscount = OrderLineDiscountCodeAmount | OrderManualAmountDiscount | OrderManualPercentDiscount;

export type OrderTax = Omit<OrderTaxDto, never>;
export type IssueStoreCreditRequest = Omit<IssueStoreCreditRequestDto, never>;
export type WOrderInstancePartial = Omit<WOrderInstancePartialDto, never>;
export type CreateOrderRequestV2 = Omit<CreateOrderRequestV2Dto, never>;
export type WOrderInstance = Omit<WOrderInstanceDto, never>;
