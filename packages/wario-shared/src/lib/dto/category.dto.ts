import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

import { CategoryDisplayFlagsDto } from './modifier.dto';

export class ICategoryDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description!: string | null;

  @IsInt()
  @Min(0)
  ordinal!: number;

  @IsString()
  @IsOptional()
  parent_id!: string | null;

  @IsString()
  @IsOptional()
  subheading!: string | null;

  @IsString()
  @IsOptional()
  footnotes!: string | null;

  @ValidateNested()
  @Type(() => CategoryDisplayFlagsDto)
  display_flags!: CategoryDisplayFlagsDto;

  // list of disabled fulfillmentIds
  @IsString({ each: true })
  serviceDisable!: string[];
}
