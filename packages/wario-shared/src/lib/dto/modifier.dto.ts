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
 * Display configuration flags for a group of modifiers (Option Type).
 * Controls how the modifier group is rendered in the UI.
 */
export class IOptionTypeDisplayFlagsDto {
  /**
   * Indicates if this modifier group is for third-party integration.
   */
  @IsBoolean()
  is3p!: boolean;

  /**
   * If true, the entire section is hidden when no options within it are available (for any reason, including disabled by a function rule or just out of stock).
   * Should default to false.
   */
  @IsBoolean()
  omit_section_if_no_available_options!: boolean;

  /**
   * If true, individual options are hidden from the list if they are unavailable.
   * If false, they might be shown as disabled/grayed out.
   */
  @IsBoolean()
  omit_options_if_not_available!: boolean;

  /**
   * If true, renders the selection as a toggle switch instead of a list/radio group.
   * **Prerequisite**: Requires strict limits `min_selected: 1` and `max_selected: 1`
   * and exactly two options. The first option usually acts as "Off" (or default) and the second as "On".
   */
  @IsBoolean()
  use_toggle_if_only_two_options!: boolean;

  /**
   * If true, this modifier group is strictly for internal use or backend logic and should not be displayed to customers.
   */
  @IsBoolean()
  hidden!: boolean;

  /**
   * Defines how the group should be presented when no selection has been made (if optional).
   */
  @IsEnum(DISPLAY_AS)
  empty_display_as!: DISPLAY_AS;

  /**
   * semantic classification for the modifier group.
   * @see {@link MODIFIER_CLASS}
   */
  @IsEnum(MODIFIER_CLASS)
  modifier_class!: MODIFIER_CLASS;

  /**
   * String template for selections of this modifier type.
   * Does not work for split modifiers.
   * @example if template_string is "FOO" then a product name of "{FOO} Pizza" and a selection of Pepperoni will be "Pepperoni Pizza"
   */
  @IsString()
  @IsNotEmpty()
  template_string!: string;

  /**
   * Separator used when listing multiple selected options from this group.
   * Whitespace is preserved and not added.
   * @example ',' results in 'Pepperoni,Mushroom'
   */
  @IsString()
  @IsNotEmpty()
  multiple_item_separator!: string;

  /**
   * Prefix text displayed when the group has active selections.
   */
  @IsString()
  @IsNotEmpty()
  non_empty_group_prefix!: string;

  /**
   * Suffix text displayed when the group has active selections.
   */
  @IsString()
  @IsNotEmpty()
  non_empty_group_suffix!: string;
}

/**
 * Base data for creating or updating a Modifier Group (Option Type).
 * Contains all fields except the system-generated ID.
 */
export class UncommittedOptionTypeDto {
  /** Internal system name for the modifier group */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** Customer-facing label for the group. e.g. "Choose Your Size". */
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  /** External references for integration (e.g. POS IDs, 3rd party delivery IDs). */
  @ValidateNested({ each: true })
  @Type(() => KeyValueDto)
  externalIDs!: KeyValueDto[];

  /**
   * Sort order for display relative to other modifier groups.
   * Lower numbers appear first.
   */
  @IsInt()
  @Min(0)
  ordinal!: number;

  /** Minimum number of options that must be selected from this group. */
  @IsInt()
  @Min(0)
  min_selected!: number;

  /**
   * Maximum number of options that can be selected from this group.
   * Null implies no limit (unlimited selection).
   */
  @IsInt()
  @Min(0)
  @IsOptional()
  max_selected!: number | null;

  /** UI display configuration. */
  @ValidateNested()
  @Type(() => IOptionTypeDisplayFlagsDto)
  displayFlags!: IOptionTypeDisplayFlagsDto;

  /**
   * List of Option IDs (strings) that belong to this group.
   * The order in this array determines the display order of options within the option type.
   */
  @IsString({ each: true })
  options!: string[];
}
/**
 * Represents a full Modifier Group (Option Type) with its unique ID.
 * Examples: "Pizza Size", "Toppings", "Dressing".
 */
export class IOptionTypeDto extends UncommittedOptionTypeDto {
  /** Unique Identifier for the modifier group. */
  @IsString()
  @IsNotEmpty()
  id!: string;
}

/**
 * Metadata controlling behavior and business logic for a specific modifier option.
 */
export class IOptionMetadataDto {
  /**
   * Used to limit combinations of too many toppings.
   * The sum of active flavor factors might be capped at the product level.
   */
  @IsNumber()
  flavor_factor!: number;

  /**
   * Represents the "weight" or impact on cooking.
   * Used to ensure a product isn't overloaded with toppings that prevent proper cooking.
   */
  @IsNumber()
  bake_factor!: number;

  /**
   * If true, this option can be applied to only half of the product (e.g. Left/Right on a Pizza).
   */
  @IsBoolean()
  can_split!: boolean;

  /**
   * If true, allows "Double" or "Extra" quantity selection.
   * Doubles price and bake factors.
   */
  @IsBoolean()
  allowHeavy!: boolean;

  /**
   * If true, allows "Light" quantity selection.
   * Affects portioning instructions but not price.
   */
  @IsBoolean()
  allowLite!: boolean;

  /**
   * If true, this item can be requested "On The Side" (OTS).
   */
  @IsBoolean()
  allowOTS!: boolean;
}

/**
 * Display flags for a specific modifier option.
 */
export class IOptionDisplayFlagsDto {
  /**
   * If true, this option is excluded from the product's generated short-name/receipt alias.
   */
  @IsBoolean()
  omit_from_shortname!: boolean;

  /**
   * If true, this option is excluded from the product's full display name construction.
   */
  @IsBoolean()
  omit_from_name!: boolean;
}

/**
 * Base data for creating or updating a Modifier Option.
 * Excludes ID.
 */
export class UncommittedOptionDto {
  /** Customer-facing name. e.g. "Pepperoni". */
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  /** Description or tooltip text. */
  @IsString()
  @IsNotEmpty()
  description!: string;

  /** Abbreviated code for receipts or kitchen display. */
  @IsString()
  @IsNotEmpty()
  shortcode!: string;

  /** Base price for this option. */
  @ValidateNested()
  @Type(() => IMoneyDto)
  price!: IMoneyDto;

  /** External references (POS IDs, etc). */
  @ValidateNested({ each: true })
  @Type(() => KeyValueDto)
  externalIDs!: KeyValueDto[];

  /**
   * If set, defines a date range when this option is disabled/out of stock.
   */
  @ValidateNested()
  @Type(() => IWIntervalDto)
  @IsOptional()
  disabled!: IWIntervalDto | null;

  /**
   * Defines recurring availability schedules (e.g. "Breakfast only").
   * @see {@link IRecurringIntervalDto}
   */
  @ValidateNested({ each: true })
  @Type(() => IRecurringIntervalDto)
  availability!: IRecurringIntervalDto[];

  /** Business logic behavior flags. */
  @ValidateNested()
  @Type(() => IOptionMetadataDto)
  metadata!: IOptionMetadataDto;

  /**
   * ID of a `ProductInstanceFunction` that determines dynamic availability.
   * If null, the option is always enabled (subject to other checks).
   */
  @IsString()
  @IsOptional()
  enable!: string | null;

  /** UI rendering flags. */
  @ValidateNested()
  @Type(() => IOptionDisplayFlagsDto)
  displayFlags!: IOptionDisplayFlagsDto;
}

/**
 * Represents a specific option that can be selected.
 * (e.g., "Pepperoni", "Large", "Soy Milk").
 */
export class IOptionDto extends UncommittedOptionDto {
  /** Unique Identifier for the option. */
  @IsString()
  @IsNotEmpty()
  id!: string;
}
/**
 * Describes the state of a selected modifier customization.
 * Define *how* a modifier is applied (e.g. "Left Half", "Heavy").
 */
export class IOptionStateDto {
  /**
   * Spatial placement of the option (e.g. Left, Right, Whole).
   */
  @IsEnum(OptionPlacement)
  placement!: OptionPlacement;

  /**
   * Quantity/Intensity qualifier (e.g. Lite, Regular, Heavy, Side).
   * TODO: NOT IMPLEMENTED
   */
  @IsEnum(OptionQualifier)
  qualifier!: OptionQualifier;
}

/**
 * A concrete instantiation of a modifier option on a product or order item.
 * Connects the `optionId` with its configuration state.
 */
export class IOptionInstanceDto extends IOptionStateDto {
  /** The ID of the `IOptionDto` being selected. */
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}
