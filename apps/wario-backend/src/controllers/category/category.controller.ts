import { Body, Controller, Delete, HttpCode, InternalServerErrorException, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { ScopesGuard } from '../../auth/guards/scopes.guard';
import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';
import { CreateCategoryDto, DeleteCategoryDto, UpdateCategoryDto } from '../../dtos/category.dto';

@Controller('api/v1/menu/category')
@UseGuards(AuthGuard('jwt'), ScopesGuard)
export class CategoryController {
  constructor(private readonly catalogProvider: CatalogProviderService) { }

  @Post()
  @Scopes('write:catalog')
  @HttpCode(201)
  async postCategory(@Body() body: CreateCategoryDto) {
    const doc = await this.catalogProvider.CreateCategory(body);
    if (!doc) {
      throw new InternalServerErrorException('Unable to create category');
    }
    return doc;
  }

  @Patch(':catid')
  @Scopes('write:catalog')
  async patchCategory(@Param('catid') catid: string, @Body() body: UpdateCategoryDto) {
    // todo: UpdateCategoryDto needs to allow partial updates
    const doc = await this.catalogProvider.UpdateCategory(catid, body);
    if (!doc) {
      throw new NotFoundException(`Unable to update category: ${catid} `);
    }
    return doc;
  }

  @Delete(':catid')
  @Scopes('delete:catalog')
  async deleteCategory(@Param('catid') catid: string, @Body() body: DeleteCategoryDto) {
    const delete_contained_products = body.delete_contained_products ?? false;
    const doc = await this.catalogProvider.DeleteCategory(catid, delete_contained_products);
    if (!doc) {
      throw new NotFoundException(`Unable to delete category: ${catid} `);
    }
    return doc;
  }
}