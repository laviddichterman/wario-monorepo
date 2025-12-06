import { Body, Controller, Delete, HttpCode, Param, Patch, Post } from '@nestjs/common';

import { UncommittedCategoryDto } from '@wcp/wario-shared';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { CatalogCategoryService } from '../../config/catalog-provider/catalog-category.service';
import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';
import { DeleteCategoryDto, UpdateCategoryDto } from '../../dtos/category.dto';
import { CategoryNotFoundException } from '../../exceptions';

@Controller('api/v1/menu/category')
export class CategoryController {
  constructor(
    private readonly catalogProvider: CatalogProviderService,
    private readonly catalogCategoryService: CatalogCategoryService,
  ) { }

  @Post()
  @Scopes('write:catalog')
  @HttpCode(201)
  async postCategory(@Body() body: UncommittedCategoryDto) {
    const doc = await this.catalogCategoryService.CreateCategory(body);
    return doc;
  }

  @Patch(':catid')
  @Scopes('write:catalog')
  async patchCategory(@Param('catid') catid: string, @Body() body: UpdateCategoryDto) {
    // todo: UpdateCategoryDto needs to allow partial updates
    const doc = await this.catalogCategoryService.UpdateCategory(catid, body);
    if (!doc) {
      throw new CategoryNotFoundException(catid);
    }
    return doc;
  }

  @Delete(':catid')
  @Scopes('delete:catalog')
  async deleteCategory(@Param('catid') catid: string, @Body() body: DeleteCategoryDto) {
    const delete_contained_products = body.delete_contained_products ?? false;
    const doc = await this.catalogCategoryService.DeleteCategory(catid, delete_contained_products);
    if (!doc) {
      throw new CategoryNotFoundException(catid);
    }
    return doc;
  }
}