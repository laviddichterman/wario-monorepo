import { Body, Controller, Delete, HttpCode, Param, Patch, Post } from '@nestjs/common';

import { UncommittedICategoryDto } from '@wcp/wario-shared';

import { Scopes } from 'src/auth/decorators/scopes.decorator';

import { DeleteCategoryDto, UpdateCategoryDto } from 'src/dtos/category.dto';
import { CategoryNotFoundException } from 'src/exceptions';
import { SocketIoService } from 'src/infrastructure/messaging/socket-io/socket-io.service';
import { CatalogProviderService } from 'src/modules/catalog-provider/catalog-provider.service';

@Controller('api/v1/menu/category')
export class CategoryController {
  constructor(
    private readonly catalogProvider: CatalogProviderService,
    private readonly socketIoService: SocketIoService,
  ) {}

  @Post()
  @Scopes('write:catalog')
  @HttpCode(201)
  async postCategory(@Body() body: UncommittedICategoryDto) {
    const doc = await this.catalogProvider.CreateCategory(body);
    this.socketIoService.EmitCatalog(this.catalogProvider.getCatalog());
    return doc;
  }

  @Patch(':catid')
  @Scopes('write:catalog')
  async patchCategory(@Param('catid') catid: string, @Body() body: UpdateCategoryDto) {
    // todo: UpdateCategoryDto needs to allow partial updates
    const doc = await this.catalogProvider.UpdateCategory(catid, body);
    if (!doc) {
      throw new CategoryNotFoundException(catid);
    }
    this.socketIoService.EmitCatalog(this.catalogProvider.getCatalog());
    return doc;
  }

  @Delete(':catid')
  @Scopes('delete:catalog')
  async deleteCategory(@Param('catid') catid: string, @Body() body: DeleteCategoryDto) {
    const delete_contained_products = body.delete_contained_products ?? false;
    const doc = await this.catalogProvider.DeleteCategory(catid, delete_contained_products);
    if (!doc) {
      throw new CategoryNotFoundException(catid);
    }
    this.socketIoService.EmitCatalog(this.catalogProvider.getCatalog());
    return doc;
  }
}
