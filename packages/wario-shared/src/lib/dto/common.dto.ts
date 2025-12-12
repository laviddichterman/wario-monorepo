import 'reflect-metadata';
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

import { CURRENCY } from '../enums';

/**
 * Represents a Semantic Versioning (SemVer) triplet.
 * Used for version compatibility checks between systems (e.g., POS vs Backend).
 *
 * @see https://semver.org/
 */
export class SemverDto {
  /**
   * Major version number. Incremented for incompatible API changes.
   * @example 1 (in 1.0.0)
   */
  @IsInt()
  @Min(0)
  major!: number;

  /**
   * Minor version number. Incremented for backward-compatible functionality.
   * @example 2 (in 1.2.0)
   */
  @IsInt()
  @Min(0)
  minor!: number;

  /**
   * Patch version number. Incremented for backward-compatible bug fixes.
   * @example 3 (in 1.2.3)
   */
  @IsInt()
  @Min(0)
  patch!: number;
}

/**
 * Standardized application error structure used across Wario services.
 * Typically returned in 4xx/5xx HTTP responses.
 */
export class WErrorDto {
  /**
   * Broad error category.
   * @example 'Validation', 'Auth', 'System'
   */
  @IsString()
  @IsNotEmpty()
  category!: string;

  /**
   * Unique machine-readable error code.
   * @example 'ORDER_NOT_FOUND', 'PAYMENT_DECLINED'
   */
  @IsString()
  @IsNotEmpty()
  code!: string;

  /**
   * Human-readable explanation or technical detail.
   * @example 'Order #123 could not be found in the active database.'
   */
  @IsString()
  @IsNotEmpty()
  detail!: string;
}

/**
 * Generic key-value pair string object.
 * Useful for dynamic lists of properties or metadata.
 */
export class KeyValueDto {
  /** The key or label. */
  @IsString()
  @IsNotEmpty()
  key!: string;

  /** The string value. */
  @IsString()
  @IsNotEmpty()
  value!: string;
}

/**
 * Represents a simplified numeric usage interval (e.g., time range or numeric range).
 * Use `IRecurringIntervalDto` for calendar-based recurrence.
 */
export class IWIntervalDto {
  /** Start value (inclusive). */
  @IsNumber()
  start!: number;

  /** End value (inclusive). */
  @IsNumber()
  end!: number;
}

/**
 * Represents a monetary value.
 *
 * @remarks
 * While `amount` is a number, it typically represents the smallest unit (cents)
 * to avoid floating point math issues, but check specific consumer documentation.
 *
 * @example
 * { amount: 1050, currency: 'USD' } // Represents $10.50
 */
export class IMoneyDto {
  /** Numeric amount. Check context if this is cents or dollars (usually cents). */
  @IsNumber()
  amount!: number;

  /** Currency code (ISO 4217). */
  @IsEnum(CURRENCY)
  currency!: string;
}

/**
 * Transport object for encrypted data.
 * Used when sensitive information must be passed through the client
 * (e.g., payment tokens, PII) without being readable by the client.
 */
export class EncryptStringLockDto {
  /** Encrypted content (Ciphertext). */
  @IsString()
  @IsNotEmpty()
  readonly enc!: string;

  /** Initialization Vector (IV). */
  @IsString()
  @IsNotEmpty()
  readonly iv!: string;

  /** Authentication Tag (for GCM/CCM modes). */
  @IsString()
  @IsNotEmpty()
  readonly auth!: string;
}

/**
 * Defines a recurring schedule.
 * Combines a specific interval window with a recurrence rule (RRULE).
 */
export class IRecurringIntervalDto {
  /** The time window for the event. */
  @ValidateNested()
  @Type(() => IWIntervalDto)
  interval!: IWIntervalDto;

  /**
   * iCalendar RFC 5545 recurrence rule string.
   * @example 'FREQ=WEEKLY;BYDAY=MO,WE,FR'
   */
  @IsString()
  rrule!: string;
}

/**
 * Configuration for a percentage-based tip option.
 */
export class TipSelectionPercentageDto {
  /** Percentage value (e.g., 20 for 20%). */
  @IsNumber()
  value!: number;

  /** If true, this option is a pre-populated suggestion. */
  @IsBoolean()
  isSuggestion!: boolean;

  /** Discriminator: always true for percentage tips. */
  @IsBoolean()
  isPercentage!: true;
}

/**
 * Configuration for a fixed-amount tip option.
 */
export class TipSelectionAmountDto {
  /** Fixed monetary amount. */
  @ValidateNested()
  @Type(() => IMoneyDto)
  value!: IMoneyDto;

  /** If true, this option is a pre-populated suggestion. */
  @IsBoolean()
  isSuggestion!: boolean;

  /** Discriminator: always false for fixed amount tips. */
  @IsBoolean()
  isPercentage!: false;
}

/**
 * Google Maps-style address component.
 */
export class AddressComponentDto {
  /**
   * Array of types describing this component.
   * @example ['locality', 'political']
   */
  @IsString({ each: true })
  readonly types!: string[];

  /** Full text description or name. */
  @IsString()
  readonly long_name!: string;

  /** Abbreviated signature. */
  @IsString()
  readonly short_name!: string;
}

/**
 * Request payload for validating a delivery address.
 */
export class DeliveryAddressValidateRequestDto {
  /** ID of the fulfillment entity (store/location) checking the address. */
  @IsString()
  @IsNotEmpty()
  fulfillmentId!: string;

  /** Street address line. */
  @IsString()
  @IsNotEmpty()
  address!: string;

  /** Postal/Zip code. */
  @IsString()
  @IsNotEmpty()
  zipcode!: string;

  /** City/Locality. */
  @IsString()
  @IsNotEmpty()
  city!: string;

  /** State/Province/Region. */
  @IsString()
  @IsNotEmpty()
  state!: string;
}

/**
 * Response payload from address validation.
 */
export class DeliveryAddressValidateResponseDto {
  /** The normalized, formatted address returned by the provider. */
  @IsString()
  readonly validated_address!: string;

  /** Whether the address falls within the delivery zone. */
  @IsBoolean()
  readonly in_area!: boolean;

  /** Whether the address was successfully found/resolved. */
  @IsBoolean()
  readonly found!: boolean;

  /** Detailed address components (street, city, etc.). */
  @ValidateNested({ each: true })
  @Type(() => AddressComponentDto)
  readonly address_components!: AddressComponentDto[];
}

/**
 * Detailed delivery information attached to an order.
 */
export class DeliveryInfoDto {
  /** Primary street address. */
  @IsString()
  @IsNotEmpty()
  address!: string;

  /** Secondary address line (Apt, Suite, Unit). */
  @IsString()
  address2!: string;

  /** Postal/Zip code. */
  @IsString()
  @IsNotEmpty()
  zipcode!: string;

  /** Special instructions for the driver. */
  @IsString()
  @IsNotEmpty()
  deliveryInstructions!: string;

  /**
   * Snapshot of validation results at the time of order.
   * Null if validation was skipped or failed.
   */
  @ValidateNested()
  @Type(() => DeliveryAddressValidateResponseDto)
  @IsOptional()
  validation!: DeliveryAddressValidateResponseDto | null;
}

/**
 * Represents a physical seating section in the restaurant (e.g., "Patio", "Bar").
 */
export class SeatingSectionDto {
  /** Section ID. */
  @IsString()
  @IsNotEmpty()
  id!: string;

  /** Display name. */
  @IsString()
  @IsNotEmpty()
  name!: string;
}

/**
 * PUBLICLY VISIBLE SETTINGS.
 * These settings are exposed to the frontend/clients.
 *
 * TODO: Many fields here should be migrated to environment variables or feature flags.
 */
export class IWSettingsDto {
  // remove key/value config in favor of a typed config

  /**
   * Name of the location.
   * @todo Move to env or location config.
   */
  @IsString()
  @IsNotEmpty()
  LOCATION_NAME!: string;

  /**
   * Square Location ID.
   * @todo Move to env.
   */
  @IsString()
  @IsNotEmpty()
  SQUARE_LOCATION!: string;

  /**
   * Alternate Square Location ID.
   * @todo Move to env.
   */
  @IsString()
  SQUARE_LOCATION_ALTERNATE!: string;

  /**
   * Square Application ID.
   * @todo Move to env.
   */
  @IsString()
  @IsNotEmpty()
  SQUARE_APPLICATION_ID!: string;

  /**
   * Default Fulfillment (Store) ID.
   * @todo Make this configurable via UI/Location config.
   */
  @IsString()
  @IsNotEmpty()
  DEFAULT_FULFILLMENTID!: string;

  /**
   * Tax rate as a scalar (Percentage/100).
   * @todo: move to catalog config around taxes once developed
   */
  @IsNumber()
  @Min(0)
  TAX_RATE!: number;

  /**
   * Feature flag: Allow advanced options.
   * @todo Move to env/feature flags.
   */
  @IsBoolean()
  ALLOW_ADVANCED!: boolean;

  /**
   * Text preamble displayed before tip selection.
   */
  @IsString()
  TIP_PREAMBLE!: string;

  /**
   * Location phone number.
   * @todo Move to env or location config.
   */
  @IsString()
  LOCATION_PHONE_NUMBER!: string;
}
