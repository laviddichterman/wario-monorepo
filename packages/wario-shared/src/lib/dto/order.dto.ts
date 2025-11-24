import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

import { DiscountMethod, PaymentMethod, StoreCreditType, TenderBaseStatus, WFulfillmentStatus, WOrderStatus } from '../enums';

import { DeliveryInfoDto, EncryptStringLockDto, IMoneyDto, TipSelectionAmountDto, TipSelectionPercentageDto } from './common.dto';
import { ProductModifierEntryDto } from './product.dto';
import { WSeatingInfoDto } from './seating.dto';

export class DineInInfoDto {
  @IsInt()
  @Min(1)
  partySize!: number;

  @ValidateNested()
  @Type(() => WSeatingInfoDto)
  @IsOptional()
  seating?: WSeatingInfoDto;
}

export class ThirdPartyInfoDto {
  @IsString()
  @IsNotEmpty()
  squareId!: string;

  @IsString()
  @IsNotEmpty()
  source!: string;
}

export class FulfillmentTimeDto {
  // as formatISODate
  @IsString()
  @IsNotEmpty()
  selectedDate!: string;

  @IsNumber()
  selectedTime!: number;
}

export class FulfillmentDataDto extends FulfillmentTimeDto {
  @IsEnum(WFulfillmentStatus)
  status!: WFulfillmentStatus;

  @IsString()
  @IsNotEmpty()
  selectedService!: string;

  @ValidateNested()
  @Type(() => DineInInfoDto)
  @IsOptional()
  dineInInfo?: DineInInfoDto;

  @ValidateNested()
  @Type(() => DeliveryInfoDto)
  @IsOptional()
  deliveryInfo?: DeliveryInfoDto;

  @ValidateNested()
  @Type(() => ThirdPartyInfoDto)
  @IsOptional()
  thirdPartyInfo?: ThirdPartyInfoDto;
}

export class CustomerInfoDataDto {
  @IsString()
  @IsNotEmpty()
  givenName!: string;

  @IsString()
  @IsNotEmpty()
  familyName!: string;

  @IsString()
  @IsNotEmpty()
  mobileNum!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  referral!: string;
}

export class WCPProductV2Dto {
  @IsString()
  @IsNotEmpty()
  pid!: string;

  @ValidateNested({ each: true })
  @Type(() => ProductModifierEntryDto)
  modifiers!: ProductModifierEntryDto[];
}

export class CoreCartEntryDto {
  @IsInt()
  @Min(1)
  quantity!: number;

  @ValidateNested()
  @Type(() => WCPProductV2Dto)
  product!: WCPProductV2Dto;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;
}

// Note: the timeToX should be adjusted by pageLoadTimeLocal to represent a duration
// todo: perhaps change this to UxMetrics?
export class MetricsDto {
  // parsed from ISO string of the server time given during page load
  @IsNumber()
  pageLoadTime!: number;

  // number of times the user got pushed to a new time
  @IsInt()
  @Min(0)
  numTimeBumps!: number;

  // times the tip was adjusted
  @IsInt()
  @Min(0)
  numTipAdjusts!: number;

  // times the tip got reset due to being under minimum
  @IsInt()
  @Min(0)
  numTipFixed!: number;

  // time to first product added to cart
  @IsNumber()
  timeToFirstProduct!: number;

  // time of selecting a service date
  @IsNumber()
  timeToServiceDate!: number;

  // time of selecting a service time
  @IsNumber()
  timeToServiceTime!: number;

  // completion time for various stages
  @IsArray()
  @IsNumber({}, { each: true })
  timeToStage!: number[];

  // time when the user hit submit to send the order
  @IsNumber()
  submitTime!: number;

  @IsString()
  @IsNotEmpty()
  useragent!: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;
}

// Payment DTOs
export class TenderBaseProposedDto {
  @IsNumber()
  readonly createdAt!: number; // millisecond ticks

  @IsEnum(TenderBaseStatus)
  readonly status!: TenderBaseStatus.PROPOSED;
}

export class TenderBaseAllocatedDto {
  @IsNumber()
  readonly createdAt!: number; // millisecond ticks

  @IsEnum(TenderBaseStatus)
  readonly status!: Exclude<TenderBaseStatus, TenderBaseStatus.PROPOSED>;
}

export class StoreCreditPaymentDataDto {
  @IsString()
  @IsNotEmpty()
  readonly code!: string;

  // the balance available at time of locking
  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly balance!: IMoneyDto;

  @ValidateNested()
  @Type(() => EncryptStringLockDto)
  readonly lock!: EncryptStringLockDto;
}

export class StoreCreditPaymentProposedDto extends TenderBaseProposedDto {
  @IsEnum(PaymentMethod)
  readonly t!: PaymentMethod.StoreCredit;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly amount!: IMoneyDto;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly tipAmount!: IMoneyDto;

  @ValidateNested()
  @Type(() => StoreCreditPaymentDataDto)
  readonly payment!: StoreCreditPaymentDataDto;
}

export class StoreCreditPaymentAllocatedDto extends TenderBaseAllocatedDto {
  @IsEnum(PaymentMethod)
  readonly t!: PaymentMethod.StoreCredit;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly amount!: IMoneyDto;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly tipAmount!: IMoneyDto;

  @IsString()
  @IsNotEmpty()
  readonly processorId!: string;

  @ValidateNested()
  @Type(() => StoreCreditPaymentDataDto)
  readonly payment!: StoreCreditPaymentDataDto;
}

export class CashPaymentDataDto {
  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly amountTendered!: IMoneyDto;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly change!: IMoneyDto;
}

export class CashPaymentProposedDto extends TenderBaseProposedDto {
  @IsEnum(PaymentMethod)
  readonly t!: PaymentMethod.Cash;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly amount!: IMoneyDto;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly tipAmount!: IMoneyDto;

  @ValidateNested()
  @Type(() => CashPaymentDataDto)
  readonly payment!: CashPaymentDataDto;
}

export class CashPaymentAllocatedDto extends TenderBaseAllocatedDto {
  @IsEnum(PaymentMethod)
  readonly t!: PaymentMethod.Cash;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly amount!: IMoneyDto;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly tipAmount!: IMoneyDto;

  @IsString()
  @IsNotEmpty()
  readonly processorId!: string;

  @ValidateNested()
  @Type(() => CashPaymentDataDto)
  readonly payment!: CashPaymentDataDto;
}

export class CreditPaymentProposedDataDto {
  @IsString()
  @IsNotEmpty()
  sourceId!: string;
}

export class CreditPaymentProposedDto extends TenderBaseProposedDto {
  @IsEnum(PaymentMethod)
  readonly t!: PaymentMethod.CreditCard;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly amount!: IMoneyDto;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly tipAmount!: IMoneyDto;

  @ValidateNested()
  @Type(() => CreditPaymentProposedDataDto)
  readonly payment!: CreditPaymentProposedDataDto;
}

export class CreditPaymentAllocatedDataDto {
  @IsString()
  @IsNotEmpty()
  readonly processor!: "SQUARE";

  @IsString()
  @IsNotEmpty()
  readonly receiptUrl!: string;

  @IsString()
  @IsNotEmpty()
  readonly last4!: string;

  @IsString()
  @IsOptional()
  readonly cardBrand?: string;

  @IsString()
  @IsOptional()
  readonly expYear?: string;

  @IsString()
  @IsOptional()
  readonly cardholderName?: string;

  @IsString()
  @IsOptional()
  readonly billingZip?: string;
}

export class CreditPaymentAllocatedDto extends TenderBaseAllocatedDto {
  @IsEnum(PaymentMethod)
  readonly t!: PaymentMethod.CreditCard;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly amount!: IMoneyDto;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly tipAmount!: IMoneyDto;

  @IsString()
  @IsNotEmpty()
  readonly processorId!: string;

  @ValidateNested()
  @Type(() => CreditPaymentAllocatedDataDto)
  readonly payment!: CreditPaymentAllocatedDataDto;
}

// Discount DTOs
export class OrderManualPercentDiscountDataDto {
  @IsString()
  @IsNotEmpty()
  readonly reason!: string;

  @IsNumber()
  readonly percentage!: number;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly amount!: IMoneyDto;
}

export class OrderManualPercentDiscountDto extends TenderBaseAllocatedDto {
  @IsEnum(DiscountMethod)
  readonly t!: DiscountMethod.ManualPercentage;

  @ValidateNested()
  @Type(() => OrderManualPercentDiscountDataDto)
  readonly discount!: OrderManualPercentDiscountDataDto;
}

export class OrderManualAmountDiscountDataDto {
  @IsString()
  @IsNotEmpty()
  readonly reason!: string;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly amount!: IMoneyDto;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly balance!: IMoneyDto;
}

export class OrderManualAmountDiscountDto extends TenderBaseAllocatedDto {
  @IsEnum(DiscountMethod)
  readonly t!: DiscountMethod.ManualAmount;

  @ValidateNested()
  @Type(() => OrderManualAmountDiscountDataDto)
  readonly discount!: OrderManualAmountDiscountDataDto;
}

export class OrderLineDiscountCodeAmountDataDto {
  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly amount!: IMoneyDto;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly balance!: IMoneyDto;

  @IsString()
  @IsNotEmpty()
  readonly code!: string;

  @ValidateNested()
  @Type(() => EncryptStringLockDto)
  readonly lock!: EncryptStringLockDto;
}

export class OrderLineDiscountCodeAmountDto extends TenderBaseAllocatedDto {
  @IsEnum(DiscountMethod)
  readonly t!: DiscountMethod.CreditCodeAmount;

  @ValidateNested()
  @Type(() => OrderLineDiscountCodeAmountDataDto)
  readonly discount!: OrderLineDiscountCodeAmountDataDto;
}

export class OrderTaxDto {
  @ValidateNested()
  @Type(() => IMoneyDto)
  amount!: IMoneyDto;
}

// Store Credit Request DTOs
export class IssueStoreCreditRequestDto {
  @ValidateNested()
  @Type(() => IMoneyDto)
  amount!: IMoneyDto;

  @IsString()
  @IsNotEmpty()
  addedBy!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsNotEmpty()
  recipientNameFirst!: string;

  @IsString()
  @IsNotEmpty()
  recipientNameLast!: string;

  @IsString()
  @IsNotEmpty()
  recipientEmail!: string;

  @IsEnum(StoreCreditType)
  creditType!: StoreCreditType;

  @IsString()
  @IsOptional()
  expiration!: string | null;
}

// Main Order DTOs
export class WOrderInstancePartialDto {
  @ValidateNested()
  @Type(() => CustomerInfoDataDto)
  readonly customerInfo!: CustomerInfoDataDto;

  @ValidateNested()
  @Type(() => FulfillmentDataDto)
  readonly fulfillment!: FulfillmentDataDto;

  @ValidateNested({ each: true })
  @Type(() => CoreCartEntryDto)
  @IsArray()
  readonly cart!: CoreCartEntryDto[];

  @ValidateNested()
  @Type(() => MetricsDto)
  @IsOptional()
  readonly metrics?: MetricsDto;

  // Tip can be either percentage or amount
  @IsOptional()
  readonly tip!: TipSelectionPercentageDto | TipSelectionAmountDto;

  @IsString()
  @IsOptional()
  readonly specialInstructions?: string;
}

export class CreateOrderRequestV2Dto extends WOrderInstancePartialDto {
  // keep these fields differently named (with the word proposed) so we don't get lazy and accidentally accept a cash payment here
  @ValidateNested({ each: true })
  @Type(() => CreditPaymentProposedDto)
  @IsArray()
  readonly proposedPayments!: (CreditPaymentProposedDto | StoreCreditPaymentProposedDto)[];

  @ValidateNested({ each: true })
  @Type(() => OrderLineDiscountCodeAmountDto)
  @IsArray()
  readonly proposedDiscounts!: OrderLineDiscountCodeAmountDto[];
}

export class KeyValueOrderDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;
}

export class WOrderInstanceDto extends WOrderInstancePartialDto {
  @IsString()
  @IsNotEmpty()
  readonly id!: string;

  @IsEnum(WOrderStatus)
  readonly status!: WOrderStatus;

  // NOTE: discounts are APPLIED IN THE ORDER LISTED, the order should be determined by the business logic
  @ValidateNested({ each: true })
  @Type(() => OrderLineDiscountCodeAmountDto)
  @IsArray()
  readonly discounts!: (OrderLineDiscountCodeAmountDto | OrderManualAmountDiscountDto | OrderManualPercentDiscountDto)[];

  @ValidateNested({ each: true })
  @IsArray()
  readonly payments!: (CashPaymentAllocatedDto | CreditPaymentAllocatedDto | StoreCreditPaymentAllocatedDto)[];

  @ValidateNested({ each: true })
  @IsArray()
  readonly refunds!: (CashPaymentAllocatedDto | CreditPaymentAllocatedDto | StoreCreditPaymentAllocatedDto)[];

  @ValidateNested({ each: true })
  @Type(() => OrderTaxDto)
  @IsArray()
  readonly taxes!: OrderTaxDto[];

  // metadata is for storing state in 3p applications
  @ValidateNested({ each: true })
  @Type(() => KeyValueOrderDto)
  @IsArray()
  readonly metadata!: KeyValueOrderDto[];

  // null means not locked, string identifies the lock holder
  @IsString()
  @IsOptional()
  readonly locked!: string | null;
}
