import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { SeatingShape, WSeatingStatus } from '../enums';

// Seating Layout

/**
 * Represents a floor in the restaurant layout (e.g., "Main Floor", "Patio", "Rooftop").
 *
 * Floors are the top-level container in the seating hierarchy:
 * `Floor → Section → Resource/Placement`
 *
 * @example
 * ```ts
 * const floor: SeatingFloor = {
 *   id: 'floor-1',
 *   name: 'Main Floor',
 *   ordinal: 0,
 *   disabled: false,
 * };
 * ```
 */
export class SeatingFloorDto {
  /** Unique identifier for the floor (UUID format recommended) */
  @IsString()
  @IsNotEmpty()
  id!: string;

  /** Human-readable display name shown in UI */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** Sort order for display (0-indexed, lower values appear first) */
  @IsInt()
  @Min(0)
  ordinal!: number;

  /** If true, floor is hidden from staff/customer views but retained in data */
  @IsBoolean()
  disabled!: boolean;
}

/**
 * Represents a section within a floor (e.g., "Dining Room", "Bar Area", "Private Room").
 *
 * Sections group tables logically and visually within a floor.
 *
 * @example
 * ```ts
 * const section: SeatingLayoutSection = {
 *   id: 'sec-1',
 *   floorId: 'floor-1',
 *   name: 'Dining Room',
 *   ordinal: 0,
 *   disabled: false,
 * };
 * ```
 */
export class SeatingLayoutSectionDto {
  /** Unique identifier for the section */
  @IsString()
  @IsNotEmpty()
  id!: string;

  /** Parent floor ID (foreign key to SeatingFloorDto.id) */
  @IsString()
  @IsNotEmpty()
  floorId!: string;

  /** Sort order within the parent floor */
  @IsInt()
  @Min(0)
  ordinal!: number;

  /** Human-readable display name */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** If true, section is hidden but retained in data */
  @IsBoolean()
  disabled!: boolean;
}

// Seating

/**
 * Represents a table or seating resource definition.
 *
 * This defines the table's intrinsic properties (name, capacity, shape, size).
 * The table's position on the floor canvas is stored separately in `SeatingPlacementDto`.
 *
 * **Shape Dimensions (`shapeDimX`, `shapeDimY`)**:
 * - For `RECTANGLE`: half-width and half-height (full table is 2x these values)
 * - For `ELLIPSE`: x-radius and y-radius
 * - Values are in layout units, pre-rotation
 *
 * @example
 * ```ts
 * const table: SeatingResource = {
 *   id: 'table-1',
 *   name: 'Table 1',
 *   capacity: 4,
 *   shape: SeatingShape.RECTANGLE,
 *   sectionId: 'sec-1',
 *   shapeDimX: 30,  // half-width = 30, full width = 60
 *   shapeDimY: 20,  // half-height = 20, full height = 40
 *   disabled: false,
 * };
 * ```
 */
export class SeatingResourceDto {
  /** Unique identifier for the resource */
  @IsString()
  @IsNotEmpty()
  id!: string;

  /** Display name (e.g., "Table 1", "Booth A", "Bar Seat 3") */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * Recommended number of guests for this table.
   * This is a soft limit for guidance, not a hard constraint.
   */
  @IsInt()
  @Min(0)
  capacity!: number;

  /** Visual shape: RECTANGLE or ELLIPSE */
  @IsEnum(SeatingShape)
  @IsNotEmpty()
  shape!: SeatingShape;

  /** Parent section ID (foreign key to SeatingLayoutSectionDto.id) */
  @IsString()
  @IsNotEmpty()
  sectionId!: string;

  /**
   * X dimension in layout units (half-width for rect, x-radius for ellipse).
   * Applied before rotation.
   */
  @IsInt()
  @Min(0)
  shapeDimX!: number;

  /**
   * Y dimension in layout units (half-height for rect, y-radius for ellipse).
   * Applied before rotation.
   */
  @IsInt()
  @Min(0)
  shapeDimY!: number;

  /** X coordinate of center point in layout units */
  @IsInt()
  @Min(0)
  centerX!: number;

  /** Y coordinate of center point in layout units */
  @IsInt()
  @Min(0)
  centerY!: number;

  /** Rotation angle in degrees (clockwise from 0°) */
  @IsInt()
  @Min(0)
  rotation!: number;

  /** If true, resource is hidden from views but retained in data */
  @IsBoolean()
  disabled!: boolean;
}

/**
 * Aggregate DTO containing a complete seating layout configuration.
 *
 * Used to persist and transfer an entire restaurant floor plan including
 * all floors, sections, table definitions, and their placements.
 *
 * @example
 * ```ts
 * const layout: SeatingLayout = {
 *   id: 'layout-main',
 *   name: 'Main Restaurant Layout',
 *   floors: [...],
 *   sections: [...],
 *   resources: [...],
 *   placements: [...],
 * };
 * ```
 */
export class SeatingLayoutDto {
  /** Unique identifier for the layout */
  @IsString()
  @IsNotEmpty()
  id!: string;

  /** Human-readable layout name (e.g., "Default Layout", "Holiday Config") */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** All floors in this layout, ordered by ordinal */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatingFloorDto)
  floors!: SeatingFloorDto[];

  /** All sections across all floors */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatingLayoutSectionDto)
  sections!: SeatingLayoutSectionDto[];

  /** All table/resource definitions (includes position and rotation) */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatingResourceDto)
  resources!: SeatingResourceDto[];
}

/**
 * Seating information attached to an order.
 *
 * Tracks which tables are assigned to an order and the current seating status.
 * Multiple tableIds indicate "pushed together" tables for a party.
 *
 * @example
 * ```ts
 * const seating: WSeatingInfo = {
 *   tableId: ['table-1', 'table-2'], // Two tables pushed together
 *   status: WSeatingStatus.SEATED,
 *   mtime: Date.now(),
 * };
 * ```
 */
export class WSeatingInfoDto {
  /** Array of resource IDs assigned to this order (supports multi-table seating) */
  @IsArray()
  @IsString({ each: true })
  tableId!: string[]; // list of seating resources assigned to this order

  /** Current seating status (PENDING, SEATED, CLEARED) */
  @IsEnum(WSeatingStatus)
  status!: WSeatingStatus;

  /** Last modification timestamp in epoch milliseconds */
  @IsNumber()
  mtime!: number; // modification time
}
