import { BadRequestException, Body, Controller, Delete, HttpCode, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import type { FulfillmentConfig } from '@wcp/wario-shared';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { ScopesGuard } from '../../auth/guards/scopes.guard';
import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';
import { DataProviderService } from '../../config/data-provider/data-provider.service';
import { SocketIoService } from '../../config/socket-io/socket-io.service';
import { CreateFulfillmentDto, UpdateFulfillmentDto } from '../../dtos/fulfillment.dto';

@Controller('api/v1/config/fulfillment')
@UseGuards(AuthGuard('jwt'), ScopesGuard)
export class FulfillmentController {
  constructor(
    private readonly dataProvider: DataProviderService,
    private readonly catalogProvider: CatalogProviderService,
    private readonly socketIoService: SocketIoService,
  ) { }

  @Post()
  @Scopes('write:config')
  @HttpCode(201)
  async postFulfillment(@Body() body: CreateFulfillmentDto) {
    try {
      const newFulfillment = await this.dataProvider.setFulfillment(body);
      await this.dataProvider.syncFulfillments();
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.Fulfillments);
      return newFulfillment;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Patch(':fid')
  @Scopes('write:config')
  async patchFulfillment(
    @Param('fid') fulfillmentId: string,
    @Body() body: UpdateFulfillmentDto,
  ) {
    try {
      // TODO: FIX!
      // Note: UpdateFulfillmentDto is partial, but the code constructs a full object.
      // If body properties are undefined, they will be undefined in the object.
      // DataProviderService.updateFulfillment should handle this (e.g. merge or replace).
      // Assuming it handles partial updates or the client sends full object.
      const fulfillment: any = {
        displayName: body.displayName,
        shortcode: body.shortcode,
        exposeFulfillment: body.exposeFulfillment,
        ordinal: body.ordinal,
        service: body.service,
        terms: body.terms,
        messages: body.messages,
        menuBaseCategoryId: body.menuBaseCategoryId,
        orderBaseCategoryId: body.orderBaseCategoryId,
        orderSupplementaryCategoryId: body.orderSupplementaryCategoryId,
        requirePrepayment: body.requirePrepayment,
        allowPrepayment: body.allowPrepayment,
        allowTipping: body.allowTipping,
        autograt: body.autograt,
        serviceCharge: body.serviceCharge,
        leadTime: body.leadTime,
        leadTimeOffset: body.leadTimeOffset,
        operatingHours: body.operatingHours,
        specialHours: body.specialHours,
        blockedOff: body.blockedOff,
        minDuration: body.minDuration,
        maxDuration: body.maxDuration,
        timeStep: body.timeStep,
        maxGuests: body.maxGuests,
        serviceArea: body.serviceArea,
      };

      // Remove undefined keys if it's a partial update to avoid overwriting with undefined
      Object.keys(fulfillment).forEach((key) => fulfillment[key] === undefined && delete fulfillment[key]);

      const updatedFulfillment = await this.dataProvider.updateFulfillment(fulfillmentId, fulfillment);
      await this.dataProvider.syncFulfillments();
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.Fulfillments);
      return updatedFulfillment;
    } catch (error) {
      throw new NotFoundException(error);
    }
  }

  @Delete(':fid')
  @Scopes('delete:config')
  async deleteFulfillment(@Param('fid') fulfillmentId: string) {
    try {
      await this.catalogProvider.BackfillRemoveFulfillment(fulfillmentId);
      const doc = await this.dataProvider.deleteFulfillment(fulfillmentId);
      await this.dataProvider.syncFulfillments();
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.Fulfillments);
      return doc;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
