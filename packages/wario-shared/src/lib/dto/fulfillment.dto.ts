import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import type { Polygon } from 'geojson';

import { FulfillmentType } from '../enums';

import { DateIntervalEntryDto, OperatingHourSpecificationDto } from './interval.dto';

export class FulfillmentMessagesDto {
  @IsString()
  @IsOptional()
  DESCRIPTION!: string | null;

  @IsString()
  @IsNotEmpty()
  CONFIRMATION!: string;

  @IsString()
  @IsNotEmpty()
  INSTRUCTIONS!: string;
}

export class FulfillmentAutogratDto {
  @IsString()
  @IsNotEmpty()
  function!: string;

  @IsNumber()
  percentage!: number;
}

export class FulfillmentConfigDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  // short identifier for the service
  @IsString()
  @IsNotEmpty()
  shortcode!: string;

  // flag to expose this fulfillment option to the end user
  @IsBoolean()
  exposeFulfillment!: boolean;

  // user-facing name for the service
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  // ordering of the service in the UI
  @IsInt()
  @Min(0)
  ordinal!: number;

  // the type of service (PICKUP, DELIVERY, DINEIN, CURBSIDE, etc.)
  @IsEnum(FulfillmentType)
  service!: FulfillmentType;

  // terms and conditions for this service
  @IsString({ each: true })
  terms!: string[];

  // messages to display to the user
  @ValidateNested()
  @Type(() => FulfillmentMessagesDto)
  messages!: FulfillmentMessagesDto;

  // the root category ID for the menu page
  @IsString()
  @IsNotEmpty()
  menuBaseCategoryId!: string;

  // the root category ID for the order page
  @IsString()
  @IsNotEmpty()
  orderBaseCategoryId!: string;

  // optional supplementary category ID for the order page
  @IsString()
  @IsOptional()
  orderSupplementaryCategoryId!: string | null;

  // whether prepayment is required for this service
  @IsBoolean()
  requirePrepayment!: boolean;

  // whether prepayment is allowed for this service
  @IsBoolean()
  allowPrepayment!: boolean;

  // whether tipping is allowed for this service
  @IsBoolean()
  allowTipping!: boolean;

  // automatic gratuity configuration
  @ValidateNested()
  @Type(() => FulfillmentAutogratDto)
  @IsOptional()
  autograt!: FulfillmentAutogratDto | null;

  // service charge function reference
  @IsString()
  @IsOptional()
  serviceCharge!: string | null;

  // offset to the lead time in minutes
  @IsNumber()
  leadTimeOffset!: number;

  // base lead time in minutes
  @IsNumber()
  leadTime!: number;

  // operating hours specification
  @ValidateNested()
  @Type(() => OperatingHourSpecificationDto)
  operatingHours!: OperatingHourSpecificationDto;

  // special hours (holidays, events, etc.)
  @ValidateNested({ each: true })
  @Type(() => DateIntervalEntryDto)
  specialHours!: DateIntervalEntryDto[];

  // blocked off time periods when service is unavailable
  @ValidateNested({ each: true })
  @Type(() => DateIntervalEntryDto)
  blockedOff!: DateIntervalEntryDto[];

  // minimum duration for this service in minutes
  @IsNumber()
  minDuration!: number;

  // maximum duration for this service in minutes
  @IsNumber()
  maxDuration!: number;

  // time step granularity in minutes
  @IsNumber()
  timeStep!: number;

  // maximum number of guests (for dine-in)
  @IsInt()
  @Min(1)
  @IsOptional()
  maxGuests?: number;

  // GeoJSON polygon defining the service area (for delivery)
  @ValidateNested()
  @IsOptional()
  serviceArea?: Polygon;
}
