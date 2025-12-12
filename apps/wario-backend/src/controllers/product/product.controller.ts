import { Body, Controller, Delete, HttpCode, Param, ParseArrayPipe, Patch, Post } from '@nestjs/common';

import {
  CreateProductBatchRequestDto,
  PartialUncommittedProductInstanceDto,
  UncommittedIProductInstance,
  UncommittedIProductInstanceDto,
  UpdateIProductRequestDto,
  UpdateProductBatchRequestDto,
} from '@wcp/wario-shared';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';
import { SocketIoService } from '../../config/socket-io/socket-io.service';
import { BatchDeleteProductClassDto } from '../../dtos/product.dto';
import {
  CatalogOperationException,
  ProductInstanceNotFoundException,
  ProductNotFoundException,
} from '../../exceptions';

@Controller('api/v1/menu/product')
export class ProductController {
  constructor(
    private readonly catalogProvider: CatalogProviderService,
    private readonly socketIoService: SocketIoService,
  ) {}

  @Post()
  @Scopes('write:catalog')
  @HttpCode(201)
  async postProductClass(@Body() body: CreateProductBatchRequestDto) {
    const createProductResult = await this.catalogProvider.CreateProduct(body.product, body.instances);
    if (!createProductResult) {
      throw new CatalogOperationException(
        'create product',
        'Unable to satisfy prerequisites to create Product and instances',
      );
    }
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return createProductResult;
  }

  @Post('batch')
  @Scopes('write:catalog')
  @HttpCode(201)
  async batchPostProducts(
    @Body(new ParseArrayPipe({ items: UpdateProductBatchRequestDto }))
    body: UpdateProductBatchRequestDto[],
  ) {
    const createBatchesResult = await this.catalogProvider.BatchUpsertProduct(body);
    if (!createBatchesResult) {
      throw new CatalogOperationException(
        'batch create products',
        'Unable to satisfy prerequisites to create Product(s) and instance(s)',
      );
    }
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return createBatchesResult;
  }

  @Patch(':pid')
  @Scopes('write:catalog')
  async patchProductClass(@Param('pid') productId: string, @Body() body: UpdateIProductRequestDto) {
    const doc = await this.catalogProvider.UpdateProduct(productId, body);
    if (!doc) {
      throw new ProductNotFoundException(productId);
    }
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Delete(':pid')
  @Scopes('delete:catalog')
  async deleteProductClass(@Param('pid') productId: string) {
    const doc = await this.catalogProvider.DeleteProduct(productId);
    if (!doc) {
      throw new ProductNotFoundException(productId);
    }
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Post('batch/batchDelete')
  @Scopes('delete:catalog')
  @HttpCode(200)
  async batchDeleteProductClasses(@Body() body: BatchDeleteProductClassDto) {
    const doc = await this.catalogProvider.BatchDeleteProduct(body.pids);
    if (!doc) {
      throw new CatalogOperationException(
        'batch delete products',
        `Unable to delete Products: ${body.pids.join(', ')}`,
      );
    }
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Post(':pid')
  @Scopes('write:catalog')
  @HttpCode(201)
  async postProductInstance(@Param('pid') productId: string, @Body() body: UncommittedIProductInstanceDto) {
    const doc = await this.catalogProvider.CreateProductInstance(productId, body as UncommittedIProductInstance);
    if (!doc) {
      throw new ProductNotFoundException(productId);
    }
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Patch(':pid/:piid')
  @Scopes('write:catalog')
  async patchProductInstance(
    @Param('pid') productId: string,
    @Param('piid') productInstanceId: string,
    @Body() body: PartialUncommittedProductInstanceDto,
  ) {
    const product = this.catalogProvider.CatalogSelectors.productEntry(productId);
    if (!product) {
      throw new ProductNotFoundException(productId);
    }
    const doc = await this.catalogProvider.UpdateProductInstance({
      piid: productInstanceId,
      product,
      productInstance: body,
    });
    if (!doc) {
      throw new ProductInstanceNotFoundException(productInstanceId);
    }
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Delete(':pid/:piid')
  @Scopes('delete:catalog')
  async deleteProductInstance(@Param('piid') productInstanceId: string) {
    const doc = await this.catalogProvider.DeleteProductInstance(productInstanceId);
    if (!doc) {
      throw new ProductInstanceNotFoundException(productInstanceId);
    }
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }
}
