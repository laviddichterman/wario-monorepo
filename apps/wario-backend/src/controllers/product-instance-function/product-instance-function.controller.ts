import { Body, Controller, Delete, Next, Param, Patch, Post, Req, Res } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { IAbstractExpression, IProductInstanceFunctionDto } from '@wcp/wario-shared';
import { WFunctional } from '@wcp/wario-shared';

import { CreateProductInstanceFunctionDto, UpdateProductInstanceFunctionDto } from 'src/dtos/expression.dto';

import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';

@Controller('api/v1/query/language/productinstancefunction')
export class ProductInstanceFunctionController {
  constructor(private readonly catalogProvider: CatalogProviderService) { }

  @Post()
  async postPIF(@Body() body: CreateProductInstanceFunctionDto, @Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    try {
      try {
        WFunctional.AbstractExpressionStatementToString(body.expression, this.catalogProvider.CatalogSelectors);
      } catch {
        return res.status(400).send('Expression invalid');
      }
      const doc = await this.catalogProvider.CreateProductInstanceFunction({
        name: body.name,
        expression: body.expression as IAbstractExpression,
      });
      if (!doc) {
        return res.status(500).send('Unable to create ProductInstanceFunction as requested.');
      }
      const location = `${req.protocol}://${req.get('host')}${req.originalUrl}/${doc.id}`;
      res.setHeader('Location', location);
      return res.status(201).send(doc);
    } catch (error) {
      next(error);
      return;
    }
  }

  @Patch(':fxnid')
  async patchPIF(@Param('fxnid') fxnid: string, @Body() body: UpdateProductInstanceFunctionDto, @Res() res: Response, @Next() next: NextFunction) {
    try {
      if (body.expression) {
        try {
          WFunctional.AbstractExpressionStatementToString(body.expression, this.catalogProvider.CatalogSelectors);
        } catch {
          return res.status(400).send('Expression invalid');
        }
      }

      const doc = await this.catalogProvider.UpdateProductInstanceFunction(fxnid, body);
      if (!doc) {
        return res.status(404).send(`Unable to update ProductInstanceFunction: ${fxnid}`);
      }
      return res.status(200).send(doc);
    } catch (error) {
      next(error);
      return;
    }
  }

  @Delete(':fxnid')
  async deletePIF(@Param('fxnid') fxnid: string, @Res() res: Response, @Next() next: NextFunction) {
    try {
      const doc = await this.catalogProvider.DeleteProductInstanceFunction(fxnid);
      if (!doc) {
        return res.status(404).send(`Unable to delete ProductInstanceFunction: ${fxnid}`);
      }
      return res.status(200).send(doc);
    } catch (error) {
      next(error);
      return;
    }
  }
}
