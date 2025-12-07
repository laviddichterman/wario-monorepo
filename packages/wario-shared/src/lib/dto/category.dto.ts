import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

import { CALL_LINE_DISPLAY, CategoryDisplay } from '../enums';

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

export class UncommittedCategoryDto {
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

export class ICategoryDto extends UncommittedCategoryDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}
