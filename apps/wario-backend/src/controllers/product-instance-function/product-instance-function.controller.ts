import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { IAbstractExpression } from '@wcp/wario-shared';
import { WFunctional } from '@wcp/wario-shared';

import { CreateProductInstanceFunctionDto, UpdateProductInstanceFunctionDto } from 'src/dtos/expression.dto';
import { SocketIoService } from 'src/infrastructure/messaging/socket-io/socket-io.service';
import { CatalogProviderService } from 'src/modules/catalog-provider/catalog-provider.service';

@Controller('api/v1/query/language/productinstancefunction')
export class ProductInstanceFunctionController {
  constructor(
    private readonly catalogProvider: CatalogProviderService,
    private readonly socketIoService: SocketIoService,
  ) {}

  @Post()
  @HttpCode(201)
  async postPIF(@Body() body: CreateProductInstanceFunctionDto) {
    try {
      WFunctional.AbstractExpressionStatementToString(body.expression, this.catalogProvider.getCatalogSelectors());
    } catch {
      throw new BadRequestException('Expression invalid');
    }
    const doc = await this.catalogProvider.CreateProductInstanceFunction({
      name: body.name,
      expression: body.expression as IAbstractExpression,
    });
    this.socketIoService.EmitCatalog(this.catalogProvider.getCatalog());
    return doc;
  }

  @Patch(':fxnid')
  async patchPIF(@Param('fxnid') fxnid: string, @Body() body: UpdateProductInstanceFunctionDto) {
    if (body.expression) {
      try {
        WFunctional.AbstractExpressionStatementToString(body.expression, this.catalogProvider.getCatalogSelectors());
      } catch {
        throw new BadRequestException('Expression invalid');
      }
    }

    const doc = await this.catalogProvider.UpdateProductInstanceFunction(fxnid, body);
    if (!doc) {
      throw new NotFoundException(`Unable to update ProductInstanceFunction: ${fxnid}`);
    }
    this.socketIoService.EmitCatalog(this.catalogProvider.getCatalog());
    return doc;
  }

  @Delete(':fxnid')
  async deletePIF(@Param('fxnid') fxnid: string) {
    const doc = await this.catalogProvider.DeleteProductInstanceFunction(fxnid);
    if (!doc) {
      throw new NotFoundException(`Unable to delete ProductInstanceFunction: ${fxnid}`);
    }
    this.socketIoService.EmitCatalog(this.catalogProvider.getCatalog());
    return doc;
  }
}
