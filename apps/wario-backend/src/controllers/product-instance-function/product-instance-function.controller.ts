import { BadRequestException, Body, Controller, Delete, HttpCode, InternalServerErrorException, NotFoundException, Param, Patch, Post } from '@nestjs/common';

import { IAbstractExpression } from '@wcp/wario-shared';
import { WFunctional } from '@wcp/wario-shared';

import { CreateProductInstanceFunctionDto, UpdateProductInstanceFunctionDto } from 'src/dtos/expression.dto';

import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';

@Controller('api/v1/query/language/productinstancefunction')
export class ProductInstanceFunctionController {
  constructor(private readonly catalogProvider: CatalogProviderService) { }

  @Post()
  @HttpCode(201)
  async postPIF(@Body() body: CreateProductInstanceFunctionDto) {
    try {
      WFunctional.AbstractExpressionStatementToString(body.expression, this.catalogProvider.CatalogSelectors);
    } catch {
      throw new BadRequestException('Expression invalid');
    }
    const doc = await this.catalogProvider.CreateProductInstanceFunction({
      name: body.name,
      expression: body.expression as IAbstractExpression,
    });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!doc) {
      throw new InternalServerErrorException('Unable to create ProductInstanceFunction as requested.');
    }
    return doc;
  }

  @Patch(':fxnid')
  async patchPIF(@Param('fxnid') fxnid: string, @Body() body: UpdateProductInstanceFunctionDto) {
    if (body.expression) {
      try {
        WFunctional.AbstractExpressionStatementToString(body.expression, this.catalogProvider.CatalogSelectors);
      } catch {
        throw new BadRequestException('Expression invalid');
      }
    }

    const doc = await this.catalogProvider.UpdateProductInstanceFunction(fxnid, body);
    if (!doc) {
      throw new NotFoundException(`Unable to update ProductInstanceFunction: ${fxnid}`);
    }
    return doc;
  }

  @Delete(':fxnid')
  async deletePIF(@Param('fxnid') fxnid: string) {
    const doc = await this.catalogProvider.DeleteProductInstanceFunction(fxnid);
    if (!doc) {
      throw new NotFoundException(`Unable to delete ProductInstanceFunction: ${fxnid}`);
    }
    return doc;
  }
}
