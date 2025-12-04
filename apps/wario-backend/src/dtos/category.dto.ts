import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';

import { ICategoryDto } from '@wcp/wario-shared';

export class CreateCategoryDto extends OmitType(ICategoryDto, ['id'] as const) {}

export class UpdateCategoryDto extends PartialType(ICategoryDto) {}

export class DeleteCategoryDto {
  @IsOptional()
  @IsBoolean()
  delete_contained_products?: boolean;
}
