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

import { SeatingFloorDto, SeatingLayoutDto, SeatingLayoutSectionDto, SeatingResourceDto } from './seating.dto';

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
      // Check if id property exists (UpdateDto validation will check if it's non-empty)
      const hasId = 'id' in record;

      const transformed = hasId ? plainToInstance(UpdateDto, item) : plainToInstance(CreateDto, item);

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
  validationOptions?: ValidationOptions,
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

/**
 * Custom validator constraint for validating an array of upsert requests for a child type.
 * Discriminates between Create and Update based on presence of 'id' property.
 * Also accepts bare strings as valid instance IDs (equivalent to { id: 'the_string' }).
 */
@ValidatorConstraint({ async: false })
export class IsUpsertOfChildTypeArrayConstraint implements ValidatorConstraintInterface {
  validate(instances: unknown[], args: ValidationArguments): boolean {
    if (!Array.isArray(instances)) return false;

    const [CreateDto, UpdateDto] = args.constraints as [ClassConstructor, ClassConstructor];

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
      const hasId = 'id' in record;

      const transformed = hasId ? plainToInstance(UpdateDto, instance) : plainToInstance(CreateDto, instance);
      const errors = validateSync(transformed as object);

      if (errors.length > 0) {
        return false;
      }
    }
    return true;
  }

  defaultMessage(): string {
    return 'Each instance must be a valid CreateDto (no id), UpdateDto (with id), or a non-empty string (instance ID)';
  }
}

/**
 * Decorator for validating an array of UpsertIProductInstanceRequestDto.
 * Uses presence of 'id' to discriminate between Create and Update DTOs.
 */
export function IsUpsertOfChildTypeArray(
  CreateDto: ClassConstructor,
  UpdateDto: ClassConstructor,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [CreateDto, UpdateDto],
      validator: IsUpsertOfChildTypeArrayConstraint,
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
export class CreateIProductInstanceRequestDto extends OmitType(IProductInstanceDto, ['id']) {}

export class UpdateIProductInstanceRequestDto extends PartialType(CreateIProductInstanceRequestDto) {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export type UpsertIProductInstanceRequestDto = CreateIProductInstanceRequestDto | UpdateIProductInstanceRequestDto;

/**
 * special case for the instances field in UpdateIProductRequestDto where we allow a bare string to be passed in as the id field
 */
export type UpsertIProductRequestInstancesDto = UpsertIProductInstanceRequestDto | string;

/**
 * Decorator for validating an array of UpsertIProductInstanceRequestDto.
 * Uses presence of 'id' to discriminate between Create and Update DTOs, allowing bare strings as valid instance IDs.
 */
export function IsUpsertProductInstanceArray(validationOptions?: ValidationOptions) {
  return IsUpsertOfChildTypeArray(
    CreateIProductInstanceRequestDto,
    UpdateIProductInstanceRequestDto,
    validationOptions,
  );
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
  instances!: UpsertIProductRequestInstancesDto[];
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

export class CreateIOptionRequestBodyDto extends OmitType(IOptionDto, ['id']) {}

export class CreateIOptionPropsDto {
  @IsString()
  @IsNotEmpty()
  modifierTypeId!: string;

  @ValidateNested()
  @Type(() => CreateIOptionRequestBodyDto)
  option!: CreateIOptionRequestBodyDto;
}

export class UpdateIOptionRequestBodyDto extends PartialType(CreateIOptionRequestBodyDto) {}

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
export class UpdateIOptionTypeRequestBodyDto extends PartialType(OmitType(IOptionTypeDto, ['id'])) {}

export class UpdateIOptionTypePropsDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ValidateNested()
  @Type(() => UpdateIOptionTypeRequestBodyDto)
  modifierType!: UpdateIOptionTypeRequestBodyDto;
}

export type UpsertIOptionTypeRequestBodyDto = CreateIOptionTypeRequestBodyDto | UpdateIOptionTypeRequestBodyDto;

export class UncommittedICategoryDto extends OmitType(ICategoryDto, ['id']) {}

// =============================================================================
// Seating Upsert DTOs
// =============================================================================

// --- Seating Resources ---

export class CreateSeatingResourceDto extends OmitType(SeatingResourceDto, ['id']) {}

export class UpdateSeatingResourceDto extends PartialType(CreateSeatingResourceDto) {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export type UpsertSeatingResourceDto = CreateSeatingResourceDto | UpdateSeatingResourceDto;

export type UpsertSeatingResourceArrayElementDto = UpsertSeatingResourceDto | string;

/**
 * Decorator for validating an array of UpsertSeatingResourceArrayElementDto.
 * Uses presence of 'id' to discriminate between Create and Update DTOs, allowing bare strings as valid instance IDs.
 */
export function IsUpsertSeatingResourceArray(validationOptions?: ValidationOptions) {
  return IsUpsertOfChildTypeArray(CreateSeatingResourceDto, UpdateSeatingResourceDto, validationOptions);
}

// --- Seating Sections ---

export class CreateSeatingLayoutSectionDto extends OmitType(SeatingLayoutSectionDto, ['id', 'resources']) {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSeatingResourceDto)
  @IsOptional()
  resources?: CreateSeatingResourceDto[];
}

export class UpdateSeatingLayoutSectionDto extends PartialType(OmitType(SeatingLayoutSectionDto, ['id', 'resources'])) {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @IsUpsertSeatingResourceArray()
  resources?: UpsertSeatingResourceArrayElementDto[];
}

export type UpsertSeatingLayoutSectionDto = CreateSeatingLayoutSectionDto | UpdateSeatingLayoutSectionDto;

export type UpsertSeatingLayoutSectionArrayElementDto = UpsertSeatingLayoutSectionDto | string;

/**
 * Decorator for validating an array of UpsertSeatingLayoutSectionArrayElementDto.
 * Uses presence of 'id' to discriminate between Create and Update DTOs, allowing bare strings as valid instance IDs.
 */
export function IsUpsertSeatingLayoutSectionArray(validationOptions?: ValidationOptions) {
  return IsUpsertOfChildTypeArray(CreateSeatingLayoutSectionDto, UpdateSeatingLayoutSectionDto, validationOptions);
}

// --- Seating Floors ---

export class CreateSeatingFloorDto extends OmitType(SeatingFloorDto, ['id', 'sections']) {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSeatingLayoutSectionDto)
  @IsOptional()
  sections?: CreateSeatingLayoutSectionDto[];
}

export class UpdateSeatingFloorDto extends PartialType(OmitType(SeatingFloorDto, ['id', 'sections'])) {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @IsUpsertSeatingLayoutSectionArray()
  sections?: UpsertSeatingLayoutSectionArrayElementDto[];
}

export type UpsertSeatingFloorDto = CreateSeatingFloorDto | UpdateSeatingFloorDto;

export type UpsertSeatingFloorArrayElementDto = UpsertSeatingFloorDto | string;

/**
 * Decorator for validating an array of UpsertSeatingFloorDto.
 * Uses presence of 'id' to discriminate between Create and Update DTOs, allowing bare strings as valid instance IDs.
 */
export function IsUpsertSeatingFloorArray(validationOptions?: ValidationOptions) {
  return IsUpsertOfChildTypeArray(CreateSeatingFloorDto, UpdateSeatingFloorDto, validationOptions);
}

// --- Seating Layout DTOs ---

export class CreateSeatingLayoutDto extends OmitType(SeatingLayoutDto, ['id', 'floors']) {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSeatingFloorDto)
  @IsOptional()
  floors?: CreateSeatingFloorDto[];
}

export class UpdateSeatingLayoutDto extends PartialType(OmitType(SeatingLayoutDto, ['id', 'floors'])) {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @IsUpsertSeatingFloorArray()
  floors?: UpsertSeatingFloorArrayElementDto[];
}

export type UpsertSeatingLayoutDto = CreateSeatingLayoutDto | UpdateSeatingLayoutDto;
