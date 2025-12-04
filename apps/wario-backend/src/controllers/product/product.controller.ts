import { Body, Controller, Delete, HttpCode, InternalServerErrorException, NotFoundException, Param, ParseArrayPipe, Patch, Post } from '@nestjs/common';

import { CreateProductBatchRequestDto, PartialUncommittedProductInstanceDto, UncommittedIProductInstance, UncommittedIProductInstanceDto, UpdateIProductRequestDto, UpdateProductBatchRequestDto } from '@wcp/wario-shared';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';
import {
  BatchDeleteProductClassDto,
} from '../../dtos/product.dto';

@Controller('api/v1/menu/product')
export class ProductController {
  constructor(private readonly catalogProvider: CatalogProviderService) { }

  @Post()
  @Scopes('write:catalog')
  @HttpCode(201)
  async postProductClass(@Body() body: CreateProductBatchRequestDto) {
    try {
      const createProductResult = await this.catalogProvider.CreateProduct(body.product, body.instances);
      if (!createProductResult) {
        const errorDetail = `Unable to satisfy prerequisites to create Product and instances`;
        throw new NotFoundException(errorDetail);
      }

      return createProductResult;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error);
    }
  }

  @Post('batch')
  @Scopes('write:catalog')
  @HttpCode(201)
  async batchPostProducts(
    @Body(new ParseArrayPipe({ items: UpdateProductBatchRequestDto }))
    body: UpdateProductBatchRequestDto[],
  ) {
    try {
      const createBatchesResult = await this.catalogProvider.BatchUpsertProduct(body);
      if (!createBatchesResult) {
        const errorDetail = `Unable to satisfy prerequisites to create Product(s) and instance(s)`;
        throw new NotFoundException(errorDetail);
      }
      return createBatchesResult;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error);
    }
  }

  @Patch(':pid')
  @Scopes('write:catalog')
  async patchProductClass(@Param('pid') productId: string, @Body() body: UpdateIProductRequestDto) {
    try {
      const doc = await this.catalogProvider.UpdateProduct(productId, body);
      if (!doc) {
        throw new NotFoundException(`Unable to update Product: ${productId}`);
      }
      return doc;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error);
    }
  }

  @Delete(':pid')
  @Scopes('delete:catalog')
  async deleteProductClass(@Param('pid') productId: string) {
    try {
      const doc = await this.catalogProvider.DeleteProduct(productId);
      if (!doc) {
        throw new NotFoundException(`Unable to delete Product: ${productId}`);
      }
      return doc;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error);
    }
  }

  @Post('batch/batchDelete')
  @Scopes('delete:catalog')
  @HttpCode(200)
  async batchDeleteProductClasses(@Body() body: BatchDeleteProductClassDto) {
    try {
      const doc = await this.catalogProvider.BatchDeleteProduct(body.pids);
      if (!doc) {
        throw new NotFoundException(`Unable to delete Products: ${body.pids.join(', ')}`);
      }
      return doc;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error);
    }
  }

  @Post(':pid')
  @Scopes('write:catalog')
  @HttpCode(201)
  async postProductInstance(
    @Param('pid') productId: string,
    @Body() body: UncommittedIProductInstanceDto,
  ) {
    try {
      const doc = await this.catalogProvider.CreateProductInstance({
        productId: productId,
        ...(body as UncommittedIProductInstance),
      });
      if (!doc) {
        throw new NotFoundException(`Unable to find parent product id: ${productId} to create new product instance`);
      }
      return doc;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error);
    }
  }

  @Patch(':pid/:piid')
  @Scopes('write:catalog')
  async patchProductInstance(
    @Param('pid') productId: string,
    @Param('piid') productInstanceId: string,
    @Body() body: PartialUncommittedProductInstanceDto,
  ) {
    try {
      const product = this.catalogProvider.CatalogSelectors.productEntry(productId)?.product;
      if (!product) {
        throw new NotFoundException(`Unable to find parent product id: ${productId} to update product instance`);
      }
      const doc = await this.catalogProvider.UpdateProductInstance({
        piid: productInstanceId,
        product,
        productInstance: body,
      });
      if (!doc) {
        throw new NotFoundException(`Unable to update ProductInstance: ${productInstanceId}`);
      }
      return doc;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error);
    }
  }

  @Delete(':pid/:piid')
  @Scopes('delete:catalog')
  async deleteProductInstance(@Param('piid') productInstanceId: string) {
    try {
      const doc = await this.catalogProvider.DeleteProductInstance(productInstanceId);
      if (!doc) {
        throw new NotFoundException(`Unable to delete ProductInstance: ${productInstanceId}`);
      }
      return doc;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error);
    }
  }
}
