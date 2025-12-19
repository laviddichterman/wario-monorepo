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
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

export type ClassConstructor<T = unknown> = new (...args: unknown[]) => T;

import { PaymentMethod, StoreCreditType } from '../enums';

import { ICategoryDto } from './category.dto';
import { EncryptStringLockDto, IMoneyDto } from './common.dto';
import { IOptionDto, IOptionTypeDto } from './modifier.dto';
import { IProductDto, IProductInstanceDto } from './product.dto';

// =============================================================================
// Generic Validator
// =============================================================================

@ValidatorConstraint({ async: false })
export class IsUpsertArrayConstraint implements ValidatorConstraintInterface {
  validate(items: unknown[], args: ValidationArguments): boolean {
    if (!Array.isArray(items)) return false;

    const [CreateDto, UpdateDto] = args.constraints as [ClassConstructor, ClassConstructor];

    for (const item of items) {
      if (typeof item !== 'object' || item === null) return false;

      const record = item as Record<string, unknown>;
      // Check if id exists and is a non-empty string
      const hasId = typeof record.id === 'string' && record.id !== '';

      const transformed = hasId
        ? plainToInstance(UpdateDto, item)
        : plainToInstance(CreateDto, item);

      const errors = validateSync(transformed as object);

      if (errors.length > 0) return false;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const [CreateDto, UpdateDto] = args.constraints as [ClassConstructor, ClassConstructor];
    return `Each item must be a valid ${CreateDto.name} (no id) or ${UpdateDto.name} (with id)`;
  }
}

export function IsUpsertArray(
  CreateDto: ClassConstructor,
  UpdateDto: ClassConstructor,
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [CreateDto, UpdateDto],
      validator: IsUpsertArrayConstraint,
    });
  };
}

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
export class CreateIProductInstanceRequestDto extends OmitType(IProductInstanceDto, ['id']) { }

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
 * Decorator for validating an array of UpsertProductRequestDto.
 * Uses presence of 'id' to discriminate between Create and Update DTOs.
 */
export function IsUpsertProductArray(validationOptions?: ValidationOptions) {
  return IsUpsertArray(CreateIProductRequestDto, UpdateIProductRequestDto, validationOptions);
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

export class CreateIOptionRequestBodyDto extends OmitType(IOptionDto, ['id']) { }

export class CreateIOptionPropsDto {
  @IsString()
  @IsNotEmpty()
  modifierTypeId!: string;

  @ValidateNested()
  @Type(() => CreateIOptionRequestBodyDto)
  option!: CreateIOptionRequestBodyDto;
}

export class UpdateIOptionRequestBodyDto extends PartialType(CreateIOptionRequestBodyDto) { }

export class UpdateIOptionPropsDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  modifierTypeId!: string;

  @ValidateNested()
  @Type(() => UpdateIOptionRequestBodyDto)
  option!: UpdateIOptionRequestBodyDto;
}

export type UpsertIOptionPropsDto = CreateIOptionPropsDto | UpdateIOptionPropsDto;

// Modifier insert/update/upsert DTOs
export class CreateIOptionTypeRequestBodyDto extends OmitType(IOptionTypeDto, ['id', 'options']) {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIOptionRequestBodyDto)
  @IsOptional()
  options?: CreateIOptionRequestBodyDto[];
}
export class UpdateIOptionTypeRequestBodyDto extends PartialType(OmitType(IOptionTypeDto, ['id'])) { }

export class UpdateIOptionTypePropsDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ValidateNested()
  @Type(() => UpdateIOptionTypeRequestBodyDto)
  modifierType!: UpdateIOptionTypeRequestBodyDto;
}

export type UpsertIOptionTypeRequestBodyDto = CreateIOptionTypeRequestBodyDto | UpdateIOptionTypeRequestBodyDto;


export class UncommittedICategoryDto extends OmitType(ICategoryDto, ['id']) { }

// =============================================================================
// Seating Upsert DTOs
// =============================================================================

import {
  SeatingFloorDto,
  SeatingLayoutDto,
  SeatingLayoutSectionDto,
  SeatingResourceDto,
} from './seating.dto';

// --- Seating Floors ---

export class CreateSeatingFloorDto extends OmitType(SeatingFloorDto, ['id']) { }

export class UpdateSeatingFloorDto extends PartialType(CreateSeatingFloorDto) {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export type UpsertSeatingFloorDto = CreateSeatingFloorDto | UpdateSeatingFloorDto;

export function IsUpsertSeatingFloorArray(validationOptions?: ValidationOptions) {
  return IsUpsertArray(CreateSeatingFloorDto, UpdateSeatingFloorDto, validationOptions);
}

// --- Seating Sections ---

export class CreateSeatingLayoutSectionDto extends OmitType(SeatingLayoutSectionDto, ['id']) { }

export class UpdateSeatingLayoutSectionDto extends PartialType(CreateSeatingLayoutSectionDto) {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export type UpsertSeatingSectionDto = CreateSeatingLayoutSectionDto | UpdateSeatingLayoutSectionDto;

export function IsUpsertSeatingSectionArray(validationOptions?: ValidationOptions) {
  return IsUpsertArray(CreateSeatingLayoutSectionDto, UpdateSeatingLayoutSectionDto, validationOptions);
}

// --- Seating Resources ---

export class CreateSeatingResourceDto extends OmitType(SeatingResourceDto, ['id']) { }

export class UpdateSeatingResourceDto extends PartialType(CreateSeatingResourceDto) {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export type UpsertSeatingResourceDto = CreateSeatingResourceDto | UpdateSeatingResourceDto;

export function IsUpsertSeatingResourceArray(validationOptions?: ValidationOptions) {
  return IsUpsertArray(CreateSeatingResourceDto, UpdateSeatingResourceDto, validationOptions);
}

// --- Seating Layout Use DTOs ---

export class CreateSeatingLayoutRequestDto extends OmitType(SeatingLayoutDto, ['id', 'floors', 'sections', 'resources']) {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatingFloorDto)
  floors!: SeatingFloorDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatingLayoutSectionDto)
  sections!: SeatingLayoutSectionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatingResourceDto)
  resources!: SeatingResourceDto[];
}

export class UpdateSeatingLayoutRequestDto extends PartialType(CreateSeatingLayoutRequestDto) {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export type UpsertSeatingLayoutRequestDto = CreateSeatingLayoutRequestDto | UpdateSeatingLayoutRequestDto;

