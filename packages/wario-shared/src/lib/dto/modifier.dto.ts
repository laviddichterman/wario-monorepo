import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { DISPLAY_AS, MODIFIER_CLASS, OptionPlacement, OptionQualifier } from '../enums';

import { IMoneyDto, IRecurringIntervalDto, IWIntervalDto, KeyValueDto } from './common.dto';

/**
 * @description
 * IOptionTypeDisplayFlagsDto is a display flags object that is used to store additional information about a modifier type.
 *
 * @property {boolean} is3p - Whether the modifier type is a third party modifier type.
 * @property {boolean} omit_section_if_no_available_options - Whether the modifier type should if there are no available options. (Probably always yes?)
 * @property {boolean} omit_options_if_not_available - Whether the modifier type's options should be shown if they are not available.
 * @property {boolean} use_toggle_if_only_two_options - Whether the modifier type should use a toggle if there are only two options belonging to the modifier type. Requires that min_selected and max_selected are both 1. If so, then the default option will be the deselected option.
 * @property {boolean} hidden - Whether the modifier type is hidden.
 * @property {DISPLAY_AS} empty_display_as - The display as of the modifier type when it is empty.
 * @property {MODIFIER_CLASS} modifier_class - The modifier class of the modifier type.
 * @property {string} template_string - The template string of the modifier type.
 * @property {string} multiple_item_separator - The multiple item separator of the modifier type.
 * @property {string} non_empty_group_prefix - The non empty group prefix of the modifier type.
 * @property {string} non_empty_group_suffix - The non empty group suffix of the modifier type.
 */
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

export class UncommittedOptionTypeDto {
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
/**
 * @description
 * IOptionTypeDto is also known as a modifier type. It represents a group of modifier options that are somehow related.
 * An example could be selecting the size of something, or selecting which toppings you want on a pizza.
 * The is the type of the modifier type in the catalog.
 *
 * @property {string} id - The unique identifier of the modifier type.
 * @property {string} name - The name of the modifier type, this is the name that will be used in the catalog.
 * @property {string} displayName - The display name of the modifier type, this is the name that will be shown to the customer.
 * @property {KeyValueDto[]} externalIDs - The external IDs of the modifier type, this is used for integration with other systems and storing metadata about the modifier type.
 * @property {number} ordinal - The ordinal of the modifier type, this is used to determine the order of the modifier type relative to the other modifier types displayed alongside a product.
 * @property {number} min_selected - The minimum number of options that must be selected.
 * @property {number | null} max_selected - The maximum number of options that can be selected.
 * @property {IOptionTypeDisplayFlagsDto} displayFlags - The display flags of the modifier type. See {@link IOptionTypeDisplayFlagsDto} for more information.
 */
export class IOptionTypeDto extends UncommittedOptionTypeDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

/**
 * @description
 * IOptionMetadataDto is a metadata object that is used to store additional information about a modifier option.
 *
 * @property {number} flavor_factor - The flavor factor of the modifier option. This is used as a limiter defined at the IProduct level.
 * @property {number} bake_factor - The bake factor of the modifier option. Essentially the weight of the option. This is used as a limiter defined at the IProduct level.
 * @property {boolean} can_split - Whether the modifier option can be split. This is used to determine if the modifier option can be split in half. Useful for pizzas.
 * @property {boolean} allowHeavy - Whether the modifier option can be ordered with heavy/extra amount. This doubles the price and the bake_factor.
 * @property {boolean} allowLite - Whether the modifier option can be ordered 'lite' amount. This does not impact the price or the bake_factor.
 * @property {boolean} allowOTS - Whether the modifier option can be ordered "on the side".
 */
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

/**
 * @description
 * IOptionDisplayFlagsDto is a display flags object that is used to store additional information about a modifier option.
 *
 * @property {boolean} omit_from_shortname - Whether the modifier option should be omitted from the shortname of the product.
 * @property {boolean} omit_from_name - Whether the modifier option should be omitted from the full name of the product.
 */
export class IOptionDisplayFlagsDto {
  @IsBoolean()
  omit_from_shortname!: boolean;

  @IsBoolean()
  omit_from_name!: boolean;
}

/** Helper partial type used for API requests */
export class UncommittedOptionDto {
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

/**
 * @description
 * IOptionDto is a modifier option. It represents a single option that can be selected by the customer.
 *
 * @property {string} id - The unique identifier of the modifier option.
 * @property {string} modifierTypeId - The unique identifier of the modifier type that this option belongs to.
 * @property {string} displayName - The display name of the modifier option.
 * @property {string} description - The description of the modifier option. Not really used at the moment, but could be used for a tooltip.
 * @property {string} shortcode - The shortcode of the modifier option. This is used to build the shortname of a product.
 * @property {IMoneyDto} price - The price of the modifier option.
 * @property {KeyValueDto[]} externalIDs - The external IDs of the modifier option.
 * This is used for integration with other systems and storing metadata about the modifier option.
 * @property {IWIntervalDto} disabled - The disabled interval of the modifier option.
 * Specifies the time period during which the modifier option is disabled. @see {@link IWIntervalDto}.
 * @property {IRecurringIntervalDto[]} availability - The availability intervals of the modifier option. @see {@link IRecurringIntervalDto}
 * @property {number} ordinal - The ordinal of the modifier option.
 * This is used to determine the order of the modifier option relative to the other modifier options displayed in a modifier type.
 * @property {IOptionMetadataDto} metadata - The metadata of the modifier option. @see {@link IOptionMetadataDto}
 * @property {string | null} enable - The enable function ID that is used to determine if the modifier option should be enabled.
 * @see {@link IProductInstanceFunctionDto}
 * @property {IOptionDisplayFlagsDto} displayFlags - The display flags of the modifier option. @see {@link IOptionDisplayFlagsDto}
 */
export class IOptionDto extends UncommittedOptionDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  modifierTypeId!: string;
}
/**
 * @description
 * IOptionStateDto is a tuple of how much and where the modifier option is placed.
 *
 * @property {OptionPlacement} placement - The placement of the modifier option. @see {@link OptionPlacement}
 * @property {OptionQualifier} qualifier - The @see {@link OptionQualifier} of the modifier option.
 */
export class IOptionStateDto {
  @IsEnum(OptionPlacement)
  placement!: OptionPlacement;

  @IsEnum(OptionQualifier)
  qualifier!: OptionQualifier;
}

/**
 * @description
 * IOptionInstanceDto adds a modifier option ID to the {@link IOptionStateDto}. Representing a specific option that is selected in a particular way.
 *
 * @property {string} optionId - The ID of the modifier option.
 * @see {@link IOptionStateDto}
 */
export class IOptionInstanceDto extends IOptionStateDto {
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}
