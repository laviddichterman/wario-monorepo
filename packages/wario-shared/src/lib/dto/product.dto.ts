import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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

import { PriceDisplay } from '../enums';

import { IMoneyDto, IRecurringIntervalDto, IWIntervalDto, KeyValueDto } from './common.dto';
import { IOptionInstanceDto } from './modifier.dto';

/**
 * Preparation timing configurations for a product.
 * A product has a base prep time, which is the time it takes to make one.
 * It also has an additional prep time, which is the time it takes to make each additional unit.
 * Conceptually the single unit time is like the bake time.
 * The additional unit time is like the prep time (like, time to top a pizza).
 * Times at a given station ID are summed together since it is assumed the additional unit prep time is akin to the throughput
 * Used for order timing.
 */
export class PrepTimingDto {
  /**
   * Base time in minutes to prepare the first unit of this product.
   */
  @IsNumber()
  prepTime!: number;

  /**
   * Additional time in minutes for each subsequent unit in the same order.
   * @example 30 (if prepTime is 60, 2 items take 60+30=90 minutes)
   */
  @IsNumber()
  additionalUnitPrepTime!: number;

  /**
   * ID of the station where this item is prepared.
   * Used for grouping the additional time.
   */
  @IsInt()
  prepStationId!: number;
}
/**
 * Configuration for displaying warnings or suggestions to the user based on product state.
 * These are evaluated dynamically via Product Instance Functions.
 */
export class IProductOrderGuideDto {
  /**
   * List of ProductInstanceFunction IDs that return a warning string if triggered.
   * Warnings typically indicate non-optimal but allowed configurations.
   */
  @IsString({ each: true })
  warnings!: string[];

  /**
   * List of ProductInstanceFunction IDs that return a suggestion string.
   * Suggestions are upsell or pairing recommendations.
   */
  @IsString({ each: true })
  suggestions!: string[];

  /**
   * List of ProductInstanceFunction IDs that return an error string.
   * Errors indicate invalid configurations and prevent the item from being added to an order.
   * TODO: NOT IMPLEMENTED
   */
  @IsString({ each: true })
  errors!: string[];
}

/**
 * Global display and behavior flags for a Product.
 * Affects validation and rendering across all interfaces.
 */
export class IProductDisplayFlagsDto {
  /**
   * Indicates if this product is managed by a third-party integration.
   */
  @IsBoolean()
  is3p!: boolean;

  /**
   * Maximum cumulative "flavor factor" allowed for this product.
   * Used to limit toppings (e.g. max 5 flavor points on a pizza).
   */
  @IsNumber()
  flavor_max!: number;

  /**
   * Maximum cumulative "bake factor" allowed.
   * Used to prevent undercooking by limiting heavy toppings.
   */
  @IsNumber()
  bake_max!: number;

  /**
   * Bake factor cost for splitting this product (e.g. half/half pizza).
   */
  @IsNumber()
  bake_differential!: number;

  /**
   * If true, the base product name is prefixed to the instance name in certain contexts.
   */
  @IsBoolean()
  show_name_of_base_product!: boolean;

  /**
   * Grammatical singular noun for the product (e.g. "Pizza", "Salad").
   * Used in generated text (e.g. "Select your Pizza").
   */
  @IsString()
  singular_noun!: string;

  /**
   * Dynamic guide rules for user feedback.
   */
  @ValidateNested()
  @Type(() => IProductOrderGuideDto)
  order_guide!: IProductOrderGuideDto;
}

/**
 * Association between a Product and a Modifier Group (Option Type).
 * Defines *which* modifier groups are available for this product.
 */
export class IProductModifierDto {
  /**
   * Modifier Type ID. Links to an `IOptionTypeDto`.
   */
  @IsString()
  @IsNotEmpty()
  mtid!: string;

  /**
   * ID of a `ProductInstanceFunction` that determines availability.
   * If null, the modifier group is not explicitly disabled by this feature.
   */
  @IsString()
  @IsOptional()
  enable?: string | null;

  /**
   * List of Fulfillment IDs where this modifier group is disabled.
   * @example ['DeliveryId'] (to disable for delivery orders, assuming DeliveryId is the ID of the Delivery fulfillment)
   */
  @IsString({ each: true })
  serviceDisable!: string[];
}

/**
 * Represents a full Product entity.
 * Contains the shared logic and rules for a set of Product Instances.
 * A Product is an item of a given type, that can be potentially modified in some set of ways. But the product itself is like a style of pizza, or a base burger.
 * It will have at least one instance, which will describe the "basic" sellable version of that thing and will include the name and description logic.
 * @see @link IProductInstanceDto for more information about product instances.
 */
export class IProductDto {
  /** Unique Product ID. */
  @IsString()
  @IsNotEmpty()
  id!: string;

  //Omit<IProduct, 'id'>;
  /** Base price configuration. */
  @ValidateNested()
  @Type(() => IMoneyDto)
  price!: IMoneyDto;

  /**
   * Date range when this product is unavailable/disabled.
   */
  @ValidateNested()
  @Type(() => IWIntervalDto)
  @IsOptional()
  disabled?: IWIntervalDto | null;

  /**
   * Weekly recurring availability schedule.
   */
  @ValidateNested({ each: true })
  @Type(() => IRecurringIntervalDto)
  availability!: IRecurringIntervalDto[];

  /**
   * List of Fulfillment Type IDs where this product is entirely unavailable.
   */
  @IsString({ each: true })
  serviceDisable!: string[];

  /** External system references (POS, etc).
   * Also used for general metadata storage and attributes that aren't directly supported by the schema.
   */
  @ValidateNested({ each: true })
  @Type(() => KeyValueDto)
  externalIDs!: KeyValueDto[];

  /** Display & validation behavior flags. */
  @ValidateNested()
  @Type(() => IProductDisplayFlagsDto)
  displayFlags!: IProductDisplayFlagsDto;

  /** Preparation timing configuration.
   * @see @link PrepTimingDto for more information.
   */
  @ValidateNested()
  @Type(() => PrepTimingDto)
  @IsOptional()
  timing?: PrepTimingDto | null;

  /**
   * Available modifier groups for this product.
   * Defines what the user can customize.
   */
  @ValidateNested({ each: true })
  @Type(() => IProductModifierDto)
  modifiers!: IProductModifierDto[];

  /**
   * ID of the printer group for routing tickets / KDS.
   */
  @IsString()
  @IsOptional()
  printerGroup?: string | null;

  /**
   * List of IDs for Product Instances belonging to this product.
   * Must have at least one instance.
   * @remarks Order matters a lot here. The 0th element is the base or default configuration.
   * In terms of how multi-instance products work, the end of this array should be the "most complex" configuration.
   * The naming starts at the end of the array and works to the beginning, looking for a match that "at least" satisfies the product configuration.
   */
  @ValidateNested({ each: true })
  @IsString({ each: true })
  @ArrayMinSize(1)
  instances!: string[];
}

/**
 * Display flags specific to the Point of Sale (Staff) interface.
 */
export class IProductInstanceDisplayFlagsPosDto {
  /**
   * If true, hidden from the POS grid.
   */
  @IsBoolean()
  hide!: boolean;

  /**
   * Override name for POS buttons/receipts.
   * Useful to clarify names that would be the same on the menu, due to the category context in which they appear but need to be included in a product search.
   * If an empty string, the name will be taken from the product.
   */
  @IsString()
  name!: string;

  /**
   * If true, adding this item adds it directly to the cart without showing the customization modal.
   * Useful for speed (e.g. standard drinks).
   */
  @IsBoolean()
  skip_customization!: boolean;
}

/**
 * Display flags specific to the Menu (View-only) interface.
 */
export class IProductInstanceDisplayFlagsMenuDto {
  /**
   * Sort order among the other product instances in the Menu context.
   */
  @IsInt()
  @Min(0)
  ordinal!: number;

  /**
   * If true, hidden from the public menu.
   */
  @IsBoolean()
  hide!: boolean;

  /**
   * Controls how the price is presented (e.g. "From $5.00", "Market Price").
   */
  @IsEnum(PriceDisplay)
  @IsNotEmpty()
  price_display!: PriceDisplay;

  /**
   * HTML/Rich text snippet to display alongside the product (promos, badges).
   */
  @IsString()
  @IsOptional()
  adornment?: string;

  /**
   * If true, prevents automatically listing all available modifiers.
   * Relies on the product's `template_string` or manual description instead.
   */
  @IsBoolean()
  suppress_exhaustive_modifier_list!: boolean;

  /**
   * Explicitly show modifier options in the menu card?
   */
  @IsBoolean()
  show_modifier_options!: boolean;
}

/**
 * Display flags specific to the Ordering (Customer) interface.
 */
export class IProductInstanceDisplayFlagsOrderDto {
  /**
   * Sort order among the other product instances in the Ordering context.
   */
  @IsInt()
  @Min(0)
  ordinal!: number;

  /**
   * If true, hidden from the online ordering page.
   */
  @IsBoolean()
  hide!: boolean;

  /**
   * If true, clicking "Add" adds immediately to cart (Quick Add).
   * Bypasses the customization step (requires valid default configuration).
   */
  @IsBoolean()
  skip_customization!: boolean;

  /**
   * Controls price formatting.
   */
  @IsEnum(PriceDisplay)
  @IsNotEmpty()
  price_display!: PriceDisplay;

  /**
   * HTML/Rich text snippet for the ordering UI.
   */
  @IsString()
  @IsOptional()
  adornment?: string;

  /**
   * If true, simplifies the display by not listing every single modifier option upfront.
   */
  @IsBoolean()
  suppress_exhaustive_modifier_list!: boolean;
}

/**
 * Composite display configuration for a Product Instance.
 * Separates concerns for POS (Staff), Menu (View), and Order (Customer).
 */
export class IProductInstanceDisplayFlagsDto {
  /** Staff/Register UI settings. */
  @ValidateNested()
  @Type(() => IProductInstanceDisplayFlagsPosDto)
  pos!: IProductInstanceDisplayFlagsPosDto;

  /** Digital Menu/Signage UI settings. */
  @ValidateNested()
  @Type(() => IProductInstanceDisplayFlagsMenuDto)
  menu!: IProductInstanceDisplayFlagsMenuDto;

  /** Online Ordering UI settings. */
  @ValidateNested()
  @Type(() => IProductInstanceDisplayFlagsOrderDto)
  order!: IProductInstanceDisplayFlagsOrderDto;
}

/**
 * Represents a pre-configured modifier selection/dimension on a Product Instance.
 * Defines the "Recipe" or default state of an instance (e.g. Roasted Garlic + Spinach + Baked-In Pepperoni + Charred Onion + House Sausage.
 */
export class ProductInstanceModifierEntryDto {
  /**
   * The ID of the Modifier Type (Option Type).
   */
  @IsString()
  @IsNotEmpty()
  modifierTypeId!: string;

  /**
   * The specific options selected for this modifier type.
   * NOTE: The ordering here is not canonical.
   */
  @ValidateNested({ each: true })
  @Type(() => IOptionInstanceDto)
  @IsArray()
  options!: IOptionInstanceDto[];
}

/**
 * Represents a full Product Instance entity.
 * A specific purchasable variation of a Product.
 * Base data for creating or updating a Product Instance.
 * A Product Instance is a concrete, sellable configuration of a Product (e.g. "Seapine IPA", "Build-Your-Own Deep Dish Pizza", "Beet Salad").
 */
export class IProductInstanceDto {
  /** Unique Instance ID. */
  @IsString()
  @IsNotEmpty()
  id!: string;

  /**
   * Default/Pre-selected modifiers for this instance.
   * Defines the specific configuration (e.g. "Pepperoni Pizza" has pepperoni selected by default).
   */
  @ValidateNested({ each: true })
  @Type(() => ProductInstanceModifierEntryDto)
  modifiers!: ProductInstanceModifierEntryDto[];

  /** Per-channel display settings. */
  @ValidateNested()
  @Type(() => IProductInstanceDisplayFlagsDto)
  displayFlags!: IProductInstanceDisplayFlagsDto;

  /** External references. */
  @ValidateNested({ each: true })
  @Type(() => KeyValueDto)
  externalIDs!: KeyValueDto[];

  /**
   * Detailed description of this specific configuration.
   */
  @IsString()
  description!: string;

  /**
   * Name of this specific instance (e.g. "Build-Your-Own Deep Dish Pizza").
   */
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  /**
   * base short name of the product instance (e.g. "Cz", "Be", "BTP", "ThinPizza").
   * The full short name is the base short name + any modifiers that deviate from the base
   */
  @IsString()
  @IsNotEmpty()
  shortcode!: string;
}
