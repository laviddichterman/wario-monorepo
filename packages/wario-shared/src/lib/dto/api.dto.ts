import { OmitType, PartialType } from '@nestjs/mapped-types';
import { plainToInstance, Type } from 'class-transformer';
import {
  ArrayMinSize,
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
 * special case for the instances field in UpdateIProductRequestDto where we allow a bare string to be passed in as the id field
 */
export type UpdateIProductRequestInstances = UpsertIProductInstanceRequestDto | string;

/**
 * Custom validator constraint for validating an array of product instance upsert requests.
 * Discriminates between Create and Update based on presence of 'id' property.
 * Also accepts bare strings as valid instance IDs (equivalent to { id: 'the_string' }).
 */
@ValidatorConstraint({ async: false })
export class IsUpsertProductInstanceArrayConstraint implements ValidatorConstraintInterface {
  validate(instances: unknown[]): boolean {
    if (!Array.isArray(instances)) return false;

    for (const instance of instances) {
      // Handle bare string case - treat as update with just an ID
      if (typeof instance === 'string') {
        if (instance === '') {
          return false; // Empty string is not a valid ID
        }
        // Valid non-empty string ID, continue to next instance
        continue;
      }

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
    return 'Each instance must be a valid CreateIProductInstanceRequestDto (no id), UpdateIProductInstanceRequestDto (with id), or a non-empty string (instance ID)';
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
 * Custom validator constraint for validating an array of product upsert requests.
 * Discriminates between Create and Update based on presence of 'id' property.
 */
@ValidatorConstraint({ async: false })
export class IsUpsertProductArrayConstraint implements ValidatorConstraintInterface {
  validate(products: unknown[]): boolean {
    if (!Array.isArray(products)) return false;

    for (const product of products) {
      if (typeof product !== 'object' || product === null) {
        return false;
      }

      const record = product as Record<string, unknown>;
      const hasId = typeof record.id === 'string' && record.id !== '';

      const transformed = hasId
        ? plainToInstance(UpdateIProductRequestDto, product)
        : plainToInstance(CreateIProductRequestDto, product);
      const errors = validateSync(transformed);

      if (errors.length > 0) {
        return false;
      }
    }
    return true;
  }

  defaultMessage(): string {
    return 'Each product must be a valid CreateIProductRequestDto (no id) or UpdateIProductRequestDto (with id)';
  }
}

/**
 * Decorator for validating an array of UpsertProductRequestDto.
 * Uses presence of 'id' to discriminate between Create and Update DTOs.
 */
export function IsUpsertProductArray(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUpsertProductArrayConstraint,
    });
  };
}

/**
 * DTO for creating a single product along with its instances.
 */
export class CreateIProductRequestDto extends OmitType(IProductDto, ['id', 'instances']) {

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
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
  instances!: UpdateIProductRequestInstances[];
}


export type UpsertProductRequestDto = CreateIProductRequestDto | UpdateIProductRequestDto;

/**
 * DTO for batch upsert of products.
 * Wraps an array validated by IsUpsertProductArray.
 */
export class BatchUpsertProductRequestDto {
  @IsArray()
  @IsUpsertProductArray()
  products!: UpsertProductRequestDto[];
}

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
