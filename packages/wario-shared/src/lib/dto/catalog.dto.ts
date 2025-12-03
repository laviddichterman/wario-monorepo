import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';

import { ICategoryDto } from './category.dto';
import { SemverDto } from './common.dto';
import type { IOrderInstanceFunctionDto, IProductInstanceFunctionDto } from './expression.dto';
import { IOptionDto, IOptionTypeDto } from './modifier.dto';
import { IProductDto, IProductInstanceDto } from './product.dto';

export class CatalogModifierEntryDto {
  @IsString({ each: true })
  options!: string[];

  @ValidateNested()
  @Type(() => IOptionTypeDto)
  modifierType!: IOptionTypeDto;
}

export class CatalogCategoryEntryDto {
  @ValidateNested()
  @Type(() => ICategoryDto)
  category!: ICategoryDto;

  @IsString({ each: true })
  children!: string[];

  @IsString({ each: true })
  products!: string[];
}

export class CatalogProductEntryDto {
  @ValidateNested()
  @Type(() => IProductDto)
  product!: IProductDto;

  @IsString({ each: true })
  instances!: string[];
}

export class ICatalogDto {
  @IsObject()
  options!: Record<string, IOptionDto>;

  @IsObject()
  modifiers!: Record<string, CatalogModifierEntryDto>;

  @IsObject()
  categories!: Record<string, CatalogCategoryEntryDto>;

  @IsObject()
  products!: Record<string, CatalogProductEntryDto>;

  @IsObject()
  productInstances!: Record<string, IProductInstanceDto>;

  @IsObject()
  productInstanceFunctions!: Record<string, IProductInstanceFunctionDto>;

  @IsObject()
  orderInstanceFunctions!: Record<string, IOrderInstanceFunctionDto>;

  @IsString()
  @IsNotEmpty()
  version!: string;

  @ValidateNested()
  @Type(() => SemverDto)
  api!: SemverDto;
}
