import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from 'class-validator';

import { SeatingShape, WSeatingStatus } from '../enums';

// Seating
export class SeatingResourceDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  // capacity is a soft limit, it indicates the typical or recommended number of guests for this resource
  // the number of seats at this resource, not a hard limit
  @IsInt()
  @Min(0)
  capacity!: number;

  @IsEnum(SeatingShape)
  shape!: SeatingShape;

  @IsString()
  @IsNotEmpty()
  sectionId!: string;

  @ValidateNested()
  @Type(() => Object)
  center!: { x: number; y: number };

  // shapeDims is either radius in x and y direction for ellipses or half the x length and y length for rectangles, pre-rotation
  @ValidateNested()
  @Type(() => Object)
  shapeDims!: { x: number; y: number };

  @IsNumber()
  rotation!: number; // degrees

  // we can't delete seating resources, just disable them
  @IsBoolean()
  disabled!: boolean;
}

export class WSeatingInfoDto {
  @IsString({ each: true })
  tableId!: [string]; // list of seating resources assigned to this order

  @IsEnum(WSeatingStatus)
  status!: WSeatingStatus;

  @IsNumber()
  mtime!: number; // modification time
}
