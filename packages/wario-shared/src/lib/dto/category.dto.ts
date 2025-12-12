import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

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

/**
 * Base data for creating/updating a category.
 */
export class UncommittedCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description!: string | null;

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

  // ordered list of child category IDs
  @IsString({ each: true })
  children!: string[];

  // ordered list of product IDs appearing in this category
  @IsString({ each: true })
  products!: string[];
}

export class ICategoryDto extends UncommittedCategoryDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}
