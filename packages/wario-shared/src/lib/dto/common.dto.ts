import 'reflect-metadata';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

import { CURRENCY } from '../enums';

export class SemverDto {
  @IsInt()
  @Min(0)
  major!: number;

  @IsInt()
  @Min(0)
  minor!: number;

  @IsInt()
  @Min(0)
  patch!: number;
}

export class WErrorDto {
  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  detail!: string;
}

export class KeyValueDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;
}

export class IWIntervalDto {
  @IsNumber()
  start!: number;

  @IsNumber()
  end!: number;
}

export class IMoneyDto {
  @IsNumber()
  amount!: number;

  @IsEnum(CURRENCY)
  currency!: string;
}

export class EncryptStringLockDto {
  @IsString()
  @IsNotEmpty()
  readonly enc!: string;

  @IsString()
  @IsNotEmpty()
  readonly iv!: string;

  @IsString()
  @IsNotEmpty()
  readonly auth!: string;
}

export class IRecurringIntervalDto {
  @ValidateNested()
  @Type(() => IWIntervalDto)
  interval!: IWIntervalDto;

  @IsString()
  rrule!: string;
}

export class TipSelectionPercentageDto {
  @IsNumber()
  value!: number;

  @IsBoolean()
  isSuggestion!: boolean;

  @IsBoolean()
  isPercentage!: true;
}

export class TipSelectionAmountDto {
  @ValidateNested()
  @Type(() => IMoneyDto)
  value!: IMoneyDto;

  @IsBoolean()
  isSuggestion!: boolean;

  @IsBoolean()
  isPercentage!: false;
}

export class AddressComponentDto {
  @IsString({ each: true })
  readonly types!: string[];

  @IsString()
  readonly long_name!: string;

  @IsString()
  readonly short_name!: string;
}

export class DeliveryAddressValidateRequestDto {
  @IsString()
  @IsNotEmpty()
  fulfillmentId!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  zipcode!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;
}

export class DeliveryAddressValidateResponseDto {
  @IsString()
  readonly validated_address!: string;

  @IsBoolean()
  readonly in_area!: boolean;

  @IsBoolean()
  readonly found!: boolean;

  @ValidateNested({ each: true })
  @Type(() => AddressComponentDto)
  readonly address_components!: AddressComponentDto[];
}

export class DeliveryInfoDto {
  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  address2!: string;

  @IsString()
  @IsNotEmpty()
  zipcode!: string;

  @IsString()
  @IsNotEmpty()
  deliveryInstructions!: string;

  @ValidateNested()
  @Type(() => DeliveryAddressValidateResponseDto)
  @IsOptional()
  validation!: DeliveryAddressValidateResponseDto | null;
}

export class SeatingSectionDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}
