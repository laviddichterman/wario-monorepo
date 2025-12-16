import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';

import {
  type DeletePrinterGroupRequest,
  type DeletePrinterGroupRequestDto,
  type PrinterGroupDto,
} from '@wcp/wario-shared';

import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';
import { SocketIoService } from '../../config/socket-io/socket-io.service';
import { PrinterGroupNotFoundException, PrinterGroupOperationException } from '../../exceptions';

@Controller('api/v1/menu/printergroup')
export class PrinterGroupController {
  constructor(
    private readonly catalogProvider: CatalogProviderService,
    private readonly socketIoService: SocketIoService,
  ) {}

  @Get()
  getPrinterGroups() {
    return Object.values(this.catalogProvider.getPrinterGroups());
  }

  @Post()
  @HttpCode(201)
  async postPrinterGroup(@Body() body: PrinterGroupDto) {
    const doc = await this.catalogProvider.CreatePrinterGroup(body);
    if (!doc) {
      throw new PrinterGroupOperationException('create printer group', 'Operation returned null');
    }
    return doc;
  }

  @Patch(':pgId')
  async patchPrinterGroup(@Param('pgId') pgId: string, @Body() body: PrinterGroupDto) {
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
      throw new PrinterGroupNotFoundException(pgId);
    }
    return doc;
  }

  @Delete(':pgId')
  async deletePrinterGroup(@Param('pgId') pgId: string, @Body() body: DeletePrinterGroupRequestDto) {
    const doc = await this.catalogProvider.DeletePrinterGroup({ id: pgId, ...(body as DeletePrinterGroupRequest) });
    this.socketIoService.EmitCatalog(this.catalogProvider.getCatalog());
    return doc;
  }
}
