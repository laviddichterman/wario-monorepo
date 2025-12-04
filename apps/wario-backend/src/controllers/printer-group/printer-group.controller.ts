import { BadRequestException, Body, Controller, Delete, Get, HttpCode, InternalServerErrorException, NotFoundException, Param, Patch, Post } from '@nestjs/common';

import { type DeletePrinterGroupRequest, type DeletePrinterGroupRequestDto, type PrinterGroupDto } from '@wcp/wario-shared';

import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';

@Controller('api/v1/menu/printergroup')
export class PrinterGroupController {
  constructor(private readonly catalogProvider: CatalogProviderService) { }

  @Get()
  getPrinterGroups() {
    return Object.values(this.catalogProvider.PrinterGroups);
  }

  @Post()
  @HttpCode(201)
  async postPrinterGroup(@Body() body: PrinterGroupDto) {
    try {
      const doc = await this.catalogProvider.CreatePrinterGroup(body);
      if (!doc) {
        throw new InternalServerErrorException('Unable to create printer group');
      }
      return doc;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Patch(':pgId')
  async patchPrinterGroup(
    @Param('pgId') pgId: string,
    @Body() body: PrinterGroupDto,
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
        throw new NotFoundException(`Unable to update PrinterGroup: ${pgId}`);
      }
      return doc;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Delete(':pgId')
  async deletePrinterGroup(
    @Param('pgId') pgId: string,
    @Body() body: DeletePrinterGroupRequestDto,
  ) {
    try {
      const doc = await this.catalogProvider.DeletePrinterGroup({ id: pgId, ...(body as DeletePrinterGroupRequest) });
      if (!doc) {
        throw new NotFoundException(`Unable to delete PrinterGroup: ${pgId}`);
      }
      return doc;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
