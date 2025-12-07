import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  IProductDisplayFlagsDto,
  IProductInstanceDisplayFlagsDto,
  IProductModifierDto,
  PrepTimingDto,
  ProductModifierEntryDto,
  UncommittedIProductInstanceDto,
} from '../..';
import { PaymentMethod, StoreCreditType } from '../enums';

import { EncryptStringLockDto, IMoneyDto, IRecurringIntervalDto, IWIntervalDto, KeyValueDto } from './common.dto';
import { UncommittedIProductDto } from './product.dto';

// =============================================================================
// Store Credit Request DTOs
// =============================================================================

export class ValidateLockAndSpendRequestDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ValidateNested()
  @Type(() => IMoneyDto)
  amount!: IMoneyDto;

  @ValidateNested()
  @Type(() => EncryptStringLockDto)
  lock!: EncryptStringLockDto;

  @IsString()
  @IsNotEmpty()
  updatedBy!: string;
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
  // look at this method  s@IsDateString()
  expiration!: string | null;
}

/**
 * Base DTO for purchasing store credit.
 * Contains common fields for all store credit purchase requests.
 */
export class PurchaseStoreCreditRequestBaseDto {
  @ValidateNested()
  @Type(() => IMoneyDto)
  amount!: IMoneyDto;

  @IsBoolean()
  sendEmailToRecipient!: boolean;

  @IsString()
  @IsNotEmpty()
  senderName!: string;

  @IsEmail()
  senderEmail!: string;

  @IsString()
  @IsNotEmpty()
  recipientNameFirst!: string;

  @IsString()
  @IsNotEmpty()
  recipientNameLast!: string;

  @IsString()
  @IsNotEmpty()
  nonce!: string;
}

/**
 * DTO for purchasing store credit with email to recipient.
 */
export class PurchaseStoreCreditRequestSendEmailDto extends PurchaseStoreCreditRequestBaseDto {
  declare sendEmailToRecipient: true;

  @IsEmail()
  recipientEmail!: string;

  @IsString()
  recipientMessage!: string;
}

/**
 * DTO for purchasing store credit without email to recipient.
 */
export class PurchaseStoreCreditRequestNoEmailDto extends PurchaseStoreCreditRequestBaseDto {
  declare sendEmailToRecipient: false;
}

/**
 * Union type for all store credit purchase request DTOs.
 */
export type PurchaseStoreCreditRequestDto =
  | PurchaseStoreCreditRequestSendEmailDto
  | PurchaseStoreCreditRequestNoEmailDto;

// =============================================================================
// Payment & Tender Base DTOs
// =============================================================================

/**
 * DTO for partial payment base data.
 */
export class PaymentBasePartialDto {
  @IsEnum(PaymentMethod)
  readonly t!: PaymentMethod;

  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly amount!: IMoneyDto;

  // the tipAmount below is PART OF the amount field above
  @ValidateNested()
  @Type(() => IMoneyDto)
  readonly tipAmount!: IMoneyDto;
}
export class CreateProductBatchRequestDto {
  @ValidateNested()
  @Type(() => UncommittedIProductDto)
  product!: UncommittedIProductDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UncommittedIProductInstanceDto)
  instances!: UncommittedIProductInstanceDto[];
}

/**
 * Pick<IProduct, 'id'> & Partial<Omit<IProduct, 'id'>>; // PartialProductWithIDs
 * aka PartialType(IProductDto)
 */
export class UpdateIProductRequestDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ValidateNested()
  @Type(() => IMoneyDto)
  @IsOptional()
  price!: IMoneyDto;

  @ValidateNested()
  @Type(() => IWIntervalDto)
  @IsOptional()
  disabled!: IWIntervalDto | null;

  @ValidateNested({ each: true })
  @Type(() => IRecurringIntervalDto)
  @IsOptional()
  availability!: IRecurringIntervalDto[];

  // list of disabled fulfillmentIds
  @IsString({ each: true })
  @IsOptional()
  serviceDisable!: string[];

  @ValidateNested({ each: true })
  @Type(() => KeyValueDto)
  @IsOptional()
  externalIDs!: KeyValueDto[];

  @ValidateNested()
  @Type(() => IProductDisplayFlagsDto)
  @IsOptional()
  displayFlags!: IProductDisplayFlagsDto;

  @ValidateNested()
  @Type(() => PrepTimingDto)
  @IsOptional()
  timing!: PrepTimingDto | null;

  @ValidateNested({ each: true })
  @Type(() => IProductModifierDto)
  @IsOptional()
  modifiers!: IProductModifierDto[];

  @IsString({ each: true })
  @IsOptional()
  category_ids!: string[];

  @IsString()
  @IsOptional()
  printerGroup!: string | null;
}
/**
 * Partial<Omit<IProductInstance, "id" | "productId">>
 */
export class PartialUncommittedProductInstanceDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  ordinal!: number;

  @ValidateNested({ each: true })
  @Type(() => ProductModifierEntryDto)
  @IsOptional()
  modifiers!: ProductModifierEntryDto[];

  @ValidateNested()
  @Type(() => IProductInstanceDisplayFlagsDto)
  @IsOptional()
  displayFlags!: IProductInstanceDisplayFlagsDto;

  @ValidateNested({ each: true })
  @Type(() => KeyValueDto)
  @IsOptional()
  externalIDs!: KeyValueDto[];

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description!: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  shortcode!: string;
}

/**
 * aka Pick<IProductInstance, 'id'> & Partial<CreateIProductInstance>;
 * UpdateIProductUpdateIProductInstanceDto extends PartialType(UncommittedIProductInstanceDto) {}
 */
export class UpdateIProductUpdateIProductInstanceDto extends PartialUncommittedProductInstanceDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export class UpdateProductBatchRequestDto {
  @ValidateNested()
  @Type(() => UpdateIProductRequestDto)
  product!: UpdateIProductRequestDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateIProductUpdateIProductInstanceDto)
  instances!: (UncommittedIProductInstanceDto | UpdateIProductUpdateIProductInstanceDto)[];
}

export type UpsertProductBatchRequestDto = CreateProductBatchRequestDto | UpdateProductBatchRequestDto;
