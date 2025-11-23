import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

import { CALL_LINE_DISPLAY, CategoryDisplay, DISPLAY_AS, MODIFIER_CLASS, OptionPlacement, OptionQualifier } from '../enums';

import { IMoneyDto, IRecurringIntervalDto, IWIntervalDto, KeyValueDto } from './common.dto';

export class IOptionTypeDisplayFlagsDto {
  @IsBoolean()
  is3p!: boolean;

  @IsBoolean()
  omit_section_if_no_available_options!: boolean;

  @IsBoolean()
  omit_options_if_not_available!: boolean;

  @IsBoolean()
  use_toggle_if_only_two_options!: boolean;

  @IsBoolean()
  hidden!: boolean;

  @IsEnum(DISPLAY_AS)
  empty_display_as!: DISPLAY_AS;

  @IsEnum(MODIFIER_CLASS)
  modifier_class!: MODIFIER_CLASS;

  @IsString()
  @IsNotEmpty()
  template_string!: string;

  @IsString()
  @IsNotEmpty()
  multiple_item_separator!: string;

  @IsString()
  @IsNotEmpty()
  non_empty_group_prefix!: string;

  @IsString()
  @IsNotEmpty()
  non_empty_group_suffix!: string;
}

export class IOptionTypeDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ValidateNested({ each: true })
  @Type(() => KeyValueDto)
  externalIDs!: KeyValueDto[];

  @IsInt()
  @Min(0)
  ordinal!: number;

  @IsInt()
  @Min(0)
  min_selected!: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  max_selected!: number | null;

  @ValidateNested()
  @Type(() => IOptionTypeDisplayFlagsDto)
  displayFlags!: IOptionTypeDisplayFlagsDto;
}

export class IOptionMetadataDto {
  @IsNumber()
  flavor_factor!: number;

  @IsNumber()
  bake_factor!: number;

  @IsBoolean()
  can_split!: boolean;

  @IsBoolean()
  allowHeavy!: boolean;

  @IsBoolean()
  allowLite!: boolean;

  @IsBoolean()
  allowOTS!: boolean;
}

export class IOptionDisplayFlagsDto {
  @IsBoolean()
  omit_from_shortname!: boolean;

  @IsBoolean()
  omit_from_name!: boolean;
}

export class IOptionDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  modifierTypeId!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  shortcode!: string;

  @ValidateNested()
  @Type(() => IMoneyDto)
  price!: IMoneyDto;

  @ValidateNested({ each: true })
  @Type(() => KeyValueDto)
  externalIDs!: KeyValueDto[];

  @ValidateNested()
  @Type(() => IWIntervalDto)
  @IsOptional()
  disabled!: IWIntervalDto | null;

  @ValidateNested({ each: true })
  @Type(() => IRecurringIntervalDto)
  availability!: IRecurringIntervalDto[];

  @IsInt()
  @Min(0)
  ordinal!: number;

  @ValidateNested()
  @Type(() => IOptionMetadataDto)
  metadata!: IOptionMetadataDto;

  @IsString()
  @IsOptional()
  enable!: string | null;

  @ValidateNested()
  @Type(() => IOptionDisplayFlagsDto)
  displayFlags!: IOptionDisplayFlagsDto;
}

export class IOptionStateDto {
  @IsEnum(OptionPlacement)
  placement!: OptionPlacement;

  @IsEnum(OptionQualifier)
  qualifier!: OptionQualifier;
}

export class IOptionInstanceDto extends IOptionStateDto {
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}

export class CategoryDisplayFlagsDto {
  @IsString()
  @IsNotEmpty()
  call_line_name!: string;

  @IsEnum(CALL_LINE_DISPLAY)
  call_line_display!: CALL_LINE_DISPLAY;

  @IsEnum(CategoryDisplay)
  @IsNotEmpty()
  nesting!: CategoryDisplay;
}
