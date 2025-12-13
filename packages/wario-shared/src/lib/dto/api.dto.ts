import { OmitType, PartialType } from '@nestjs/mapped-types';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  registerDecorator,
  ValidateNested,
  validateSync,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

import { PaymentMethod, StoreCreditType } from '../enums';

import { EncryptStringLockDto, IMoneyDto } from './common.dto';
import { IOptionDto, IOptionTypeDto } from './modifier.dto';
import {
  IProductDto,
  IProductInstanceDto,
} from './product.dto';

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
  expiration?: string | null;
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

/**
 * DTO for creating a new product instance
 */
export class CreateIProductInstanceRequestDto extends OmitType(IProductInstanceDto, ['id']) {

}

export class UpdateIProductInstanceRequestDto extends PartialType(CreateIProductInstanceRequestDto) {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export type UpsertIProductInstanceRequestDto = CreateIProductInstanceRequestDto | UpdateIProductInstanceRequestDto;

/**
 * Custom validator constraint for validating an array of product instance upsert requests.
 * Discriminates between Create and Update based on presence of 'id' property.
 */
@ValidatorConstraint({ async: false })
export class IsUpsertProductInstanceArrayConstraint implements ValidatorConstraintInterface {
  validate(instances: unknown[]): boolean {
    if (!Array.isArray(instances)) return false;

    for (const instance of instances) {
      const record = instance as Record<string, unknown>;
      const hasId = typeof record.id === 'string' && record.id !== '';

      const transformed = hasId
        ? plainToInstance(UpdateIProductInstanceRequestDto, instance)
        : plainToInstance(CreateIProductInstanceRequestDto, instance);
      const errors = validateSync(transformed);

      if (errors.length > 0) {
        return false;
      }
    }
    return true;
  }

  defaultMessage(): string {
    return 'Each instance must be a valid CreateIProductInstanceRequestDto (no id) or UpdateIProductInstanceRequestDto (with id)';
  }
}

/**
 * Decorator for validating an array of UpsertIProductInstanceRequestDto.
 * Uses presence of 'id' to discriminate between Create and Update DTOs.
 */
export function IsUpsertProductInstanceArray(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUpsertProductInstanceArrayConstraint,
    });
  };
}

/**
 * DTO for creating a single product along with its instances.
 */
export class CreateIProductRequestDto extends OmitType(IProductDto, ['id', 'instances']) {

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIProductInstanceRequestDto)
  instances!: CreateIProductInstanceRequestDto[];
}

/**
 * An update request for a single product with its instances.
 * Does not support removing instances as part of the update
 * Can add instances and/or reorder them
 */
export class UpdateIProductRequestDto extends PartialType(OmitType(IProductDto, ['id', 'instances'])) {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsArray()
  @IsUpsertProductInstanceArray()
  instances!: UpsertIProductInstanceRequestDto[];
}


export type UpsertProductRequestDto = CreateIProductRequestDto | UpdateIProductRequestDto;


// Modifier insert/update/upsert DTOs
export class CreateIOptionTypeRequestDto extends OmitType(IOptionTypeDto, ['id']) {

}
export class UpdateIOptionTypeRequestDto extends PartialType(OmitType(IOptionTypeDto, ['id'])) {

}
export type UpsertIOptionTypeRequestDto = CreateIOptionTypeRequestDto | UpdateIOptionTypeRequestDto;

export class CreateIOptionRequestDto extends OmitType(IOptionDto, ['id']) {

}
export class UpdateIOptionRequestDto extends PartialType(OmitType(IOptionDto, ['id'])) {

}
export type UpsertIOptionRequestDto = CreateIOptionRequestDto | UpdateIOptionRequestDto;
