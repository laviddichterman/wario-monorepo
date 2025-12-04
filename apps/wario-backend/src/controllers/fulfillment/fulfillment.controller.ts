import { Body, Controller, Delete, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';

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
  async postFulfillment(@Body() body: CreateFulfillmentDto, @Req() req: Request, @Res() res: Response) {
    try {
      const newFulfillment = await this.dataProvider.setFulfillment(body);
      await this.dataProvider.syncFulfillments();
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.Fulfillments);
      const location = `${req.protocol}://${req.get('host')}${req.originalUrl}/${newFulfillment._id.toString()}`;
      res.setHeader('Location', location);
      return res.status(201).send(newFulfillment);
    } catch (error) {
      return res.status(400).send(error);
    }
  }

  @Patch(':fid')
  @Scopes('write:config')
  async patchFulfillment(
    @Param('fid') fulfillmentId: string,
    @Body() body: UpdateFulfillmentDto,
    @Res() res: Response,
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
      return res.status(200).send(updatedFulfillment);
    } catch (error) {
      return res.status(404).send(error);
    }
  }

  @Delete(':fid')
  @Scopes('delete:config')
  async deleteFulfillment(@Param('fid') fulfillmentId: string, @Res() res: Response) {
    try {
      await this.catalogProvider.BackfillRemoveFulfillment(fulfillmentId);
      const doc = await this.dataProvider.deleteFulfillment(fulfillmentId);
      await this.dataProvider.syncFulfillments();
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.Fulfillments);
      return res.status(200).send(doc);
    } catch (error) {
      return res.status(400).send(error);
    }
  }
}
