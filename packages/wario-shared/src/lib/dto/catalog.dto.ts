import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';

import { ICategoryDto } from './category.dto';
import { SemverDto } from './common.dto';
import type { IProductInstanceFunctionDto, OrderInstanceFunctionDto } from './expression.dto';
import { IOptionDto, IOptionTypeDto } from './modifier.dto';
import { IProductDto, IProductInstanceDto } from './product.dto';

export class ICatalogDto {
  @IsObject()
  options!: Record<string, IOptionDto>;

  @IsObject()
  modifiers!: Record<string, IOptionTypeDto>;

  @IsObject()
  categories!: Record<string, ICategoryDto>;

  @IsObject()
  products!: Record<string, IProductDto>;

  @IsObject()
  productInstances!: Record<string, IProductInstanceDto>;

  @IsObject()
  productInstanceFunctions!: Record<string, IProductInstanceFunctionDto>;

  @IsObject()
  orderInstanceFunctions!: Record<string, OrderInstanceFunctionDto>;

  @IsString()
  @IsNotEmpty()
  version!: string;

  @ValidateNested()
  @Type(() => SemverDto)
  api!: SemverDto;
}
