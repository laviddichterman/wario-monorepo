import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

import { DayOfTheWeek } from '../enums';

import { IWIntervalDto } from './common.dto';

export class DateIntervalEntryDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ValidateNested({ each: true })
  @Type(() => IWIntervalDto)
  @IsArray()
  value!: IWIntervalDto[];
}

export class OperatingHourSpecificationDto {
  @ValidateNested({ each: true })
  @Type(() => IWIntervalDto)
  @IsArray()
  [DayOfTheWeek.SUNDAY]!: IWIntervalDto[];

  @ValidateNested({ each: true })
  @Type(() => IWIntervalDto)
  @IsArray()
  [DayOfTheWeek.MONDAY]!: IWIntervalDto[];

  @ValidateNested({ each: true })
  @Type(() => IWIntervalDto)
  @IsArray()
  [DayOfTheWeek.TUESDAY]!: IWIntervalDto[];

  @ValidateNested({ each: true })
  @Type(() => IWIntervalDto)
  @IsArray()
  [DayOfTheWeek.WEDNESDAY]!: IWIntervalDto[];

  @ValidateNested({ each: true })
  @Type(() => IWIntervalDto)
  @IsArray()
  [DayOfTheWeek.THURSDAY]!: IWIntervalDto[];

  @ValidateNested({ each: true })
  @Type(() => IWIntervalDto)
  @IsArray()
  [DayOfTheWeek.FRIDAY]!: IWIntervalDto[];

  @ValidateNested({ each: true })
  @Type(() => IWIntervalDto)
  @IsArray()
  [DayOfTheWeek.SATURDAY]!: IWIntervalDto[];
}

export class PostBlockedOffToFulfillmentsRequestDto {
  @IsString({ each: true })
  fulfillmentIds!: string[];

  @IsString()
  @IsNotEmpty()
  date!: string;

  @ValidateNested()
  @Type(() => IWIntervalDto)
  interval!: IWIntervalDto;
}
