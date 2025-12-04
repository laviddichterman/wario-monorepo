import { Body, Controller, Delete, Get, Next, Param, Patch, Post, Req, Res } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { type DeletePrinterGroupRequest, type DeletePrinterGroupRequestDto, type PrinterGroupDto } from '@wcp/wario-shared';

import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';

@Controller('api/v1/menu/printergroup')
export class PrinterGroupController {
  constructor(private readonly catalogProvider: CatalogProviderService) { }

  @Get()
  async getPrinterGroups(@Res() res: Response) {
    return res.status(200).json(Object.values(this.catalogProvider.PrinterGroups));
  }

  @Post()
  async postPrinterGroup(@Body() body: PrinterGroupDto, @Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    try {
      const doc = await this.catalogProvider.CreatePrinterGroup(body);
      if (!doc) {
        return res.status(500).send(`Unable to create printer group`);
      }
      const location = `${req.protocol}://${req.get('host')}${req.originalUrl}/${doc.id}`;
      res.setHeader('Location', location);
      return res.status(201).send(doc);
    } catch (error) {
      next(error);
      return;
    }
  }

  @Patch(':pgId')
  async patchPrinterGroup(
    @Param('pgId') pgId: string,
    @Body() body: PrinterGroupDto,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const doc = await this.catalogProvider.UpdatePrinterGroup({
        id: pgId,
        printerGroup: {
          name: body.name,
          externalIDs: body.externalIDs,
          singleItemPerTicket: body.singleItemPerTicket,
          isExpo: body.isExpo,
        },
      });
      if (!doc) {
        return res.status(404).send(`Unable to update PrinterGroup: ${pgId}`);
      }
      return res.status(200).send(doc);
    } catch (error) {
      next(error);
      return;
    }
  }

  @Delete(':pgId')
  async deletePrinterGroup(
    @Param('pgId') pgId: string,
    @Body() body: DeletePrinterGroupRequestDto,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {

      const doc = await this.catalogProvider.DeletePrinterGroup({ id: pgId, ...(body as DeletePrinterGroupRequest) });
      if (!doc) {
        return res.status(404).send(`Unable to delete PrinterGroup: ${pgId}`);
      }
      return res.status(200).send(doc);
    } catch (error) {
      next(error);
      return;
    }
  }
}
