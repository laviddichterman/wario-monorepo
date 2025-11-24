import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

import { PriceDisplay } from '../enums';

import { IMoneyDto, IRecurringIntervalDto, IWIntervalDto, KeyValueDto } from './common.dto';
import { IOptionInstanceDto } from './modifier.dto';

export class PrepTimingDto {
  @IsNumber()
  prepTime!: number;

  @IsNumber()
  additionalUnitPrepTime!: number;

  // additional unit prep times at a given station ID stack
  @IsInt()
  prepStationId!: number;
}

export class IProductOrderGuideDto {
  @IsString({ each: true })
  warnings!: string[];

  @IsString({ each: true })
  suggestions!: string[];
}

export class IProductDisplayFlagsDto {
  @IsBoolean()
  is3p!: boolean;

  @IsNumber()
  flavor_max!: number;

  @IsNumber()
  bake_max!: number;

  @IsNumber()
  bake_differential!: number;

  @IsBoolean()
  show_name_of_base_product!: boolean;

  @IsString()
  @IsNotEmpty()
  singular_noun!: string;

  // order guide is product instance functions that return a string if they should surface a warning or suggestion to the end user
  @ValidateNested()
  @Type(() => IProductOrderGuideDto)
  order_guide!: IProductOrderGuideDto;
}

export class IProductModifierDto {
  @IsString()
  @IsNotEmpty()
  mtid!: string;

  @IsString()
  @IsOptional()
  enable!: string | null;

  // list of disabled fulfillmentIds
  @IsString({ each: true })
  serviceDisable!: string[];
}

export class IProductDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ValidateNested()
  @Type(() => IMoneyDto)
  price!: IMoneyDto;

  @ValidateNested()
  @Type(() => IWIntervalDto)
  @IsOptional()
  disabled!: IWIntervalDto | null;

  @ValidateNested({ each: true })
  @Type(() => IRecurringIntervalDto)
  availability!: IRecurringIntervalDto[];

  // list of disabled fulfillmentIds
  @IsString({ each: true })
  serviceDisable!: string[];

  @ValidateNested({ each: true })
  @Type(() => KeyValueDto)
  externalIDs!: KeyValueDto[];

  @ValidateNested()
  @Type(() => IProductDisplayFlagsDto)
  displayFlags!: IProductDisplayFlagsDto;

  @ValidateNested()
  @Type(() => PrepTimingDto)
  @IsOptional()
  timing!: PrepTimingDto | null;

  @ValidateNested({ each: true })
  @Type(() => IProductModifierDto)
  modifiers!: IProductModifierDto[];

  @IsString({ each: true })
  category_ids!: string[];

  @IsString()
  @IsNotEmpty()
  baseProductId!: string;

  @IsString()
  @IsOptional()
  printerGroup!: string | null;
}

export class IProductInstanceDisplayFlagsPosDto {
  @IsBoolean()
  hide!: boolean;

  // name override for the point of sale integration (helps avoid selling a growler to a customer since every growler fill shouldn't have the words "growler fill" in the name)
  @IsString()
  @IsNotEmpty()
  name!: string;

  // flag to skip going right to customization when a server adds this to a guest check
  @IsBoolean()
  skip_customization!: boolean;
}

export class IProductInstanceDisplayFlagsMenuDto {
  // ordering within this product instance's category in menu page
  @IsInt()
  @Min(0)
  ordinal!: number;

  // flag to hide this from the menu
  @IsBoolean()
  hide!: boolean;

  // governs how prices get displayed in the menu page according to the enum
  @IsEnum(PriceDisplay)
  @IsNotEmpty()
  price_display!: PriceDisplay;

  // HTML-friendly message wrapping the display of this PI in the menu page
  @IsString()
  @IsNotEmpty()
  adornment!: string;

  // suppress the default pizza functionality where the full modifier list is surfaced on the product display
  // and instead use the templating strings to determine what is/isn't displayed
  @IsBoolean()
  suppress_exhaustive_modifier_list!: boolean;

  // show the modifier option list as part of the menu display for this product instance
  @IsBoolean()
  show_modifier_options!: boolean;
}

export class IProductInstanceDisplayFlagsOrderDto {
  // ordering within this product instance's category in order page
  @IsInt()
  @Min(0)
  ordinal!: number;

  // flag to hide this from the ordering page
  @IsBoolean()
  hide!: boolean;

  // flag to skip going right to customization when the guest adds this to their order
  @IsBoolean()
  skip_customization!: boolean;

  // governs how prices get displayed in the order page according to the enum
  @IsEnum(PriceDisplay)
  @IsNotEmpty()
  price_display!: PriceDisplay;

  // HTML-friendly message wrapping the display of this PI in the order page
  @IsString()
  @IsNotEmpty()
  adornment!: string;

  // suppress the default pizza functionality where the full modifier list is surfaced on the product display
  // and instead use the templating strings to determine what is/isn't displayed
  @IsBoolean()
  suppress_exhaustive_modifier_list!: boolean;
}

export class IProductDisplayFlagsFullDto {
  @ValidateNested()
  @Type(() => IProductInstanceDisplayFlagsPosDto)
  pos!: IProductInstanceDisplayFlagsPosDto;

  @ValidateNested()
  @Type(() => IProductInstanceDisplayFlagsMenuDto)
  menu!: IProductInstanceDisplayFlagsMenuDto;

  @ValidateNested()
  @Type(() => IProductInstanceDisplayFlagsOrderDto)
  order!: IProductInstanceDisplayFlagsOrderDto;
}

export class ProductModifierEntryDto {
  @IsString()
  @IsNotEmpty()
  modifierTypeId!: string;

  @ValidateNested({ each: true })
  @Type(() => IOptionInstanceDto)
  @IsArray()
  options!: IOptionInstanceDto[];
}

export class IProductInstanceDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  // ordinal for product matching
  @IsInt()
  @Min(0)
  ordinal!: number;

  // applied modifiers for this instance of the product
  @ValidateNested({ each: true })
  @Type(() => ProductModifierEntryDto)
  modifiers!: ProductModifierEntryDto[];

  @ValidateNested()
  @Type(() => IProductDisplayFlagsFullDto)
  displayFlags!: IProductDisplayFlagsFullDto;

  @ValidateNested({ each: true })
  @Type(() => KeyValueDto)
  externalIDs!: KeyValueDto[];

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  shortcode!: string;
}
