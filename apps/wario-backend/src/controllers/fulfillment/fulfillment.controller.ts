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

import { AuthScopes } from '@wcp/wario-shared-private';

import { CreateFulfillmentDto, UpdateFulfillmentDto } from 'src/dtos/fulfillment.dto';
import { SocketIoService } from 'src/infrastructure/messaging/socket-io/socket-io.service';
import { CatalogProviderService } from 'src/modules/catalog-provider/catalog-provider.service';
import { DataProviderService } from 'src/modules/data-provider/data-provider.service';

import { Scopes } from '../../auth/decorators/scopes.decorator';

@Controller('api/v1/config/fulfillment')
export class FulfillmentController {
  constructor(
    private readonly dataProvider: DataProviderService,
    private readonly catalogProvider: CatalogProviderService,
    private readonly socketIoService: SocketIoService,
  ) {}

  @Post()
  @Scopes(AuthScopes.WRITE_CONFIG)
  @HttpCode(201)
  async postFulfillment(@Body() body: CreateFulfillmentDto) {
    try {
      const newFulfillment = await this.dataProvider.setFulfillment(body);
      await this.dataProvider.syncFulfillments();
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.getFulfillments());
      return newFulfillment;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Patch(':fid')
  @Scopes(AuthScopes.WRITE_CONFIG)
  async patchFulfillment(@Param('fid') fulfillmentId: string, @Body() body: UpdateFulfillmentDto) {
    try {
      // TODO: FIX!
      // Note: UpdateFulfillmentDto is partial, but the code constructs a full object.
      const updatedFulfillment = await this.dataProvider.updateFulfillment(fulfillmentId, body);
      await this.dataProvider.syncFulfillments();
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.getFulfillments());
      return updatedFulfillment;
    } catch (error) {
      throw new NotFoundException(error);
    }
  }

  @Delete(':fid')
  @Scopes(AuthScopes.DELETE_CONFIG)
  async deleteFulfillment(@Param('fid') fulfillmentId: string) {
    try {
      await this.catalogProvider.BackfillRemoveFulfillment(fulfillmentId);
      const doc = await this.dataProvider.deleteFulfillment(fulfillmentId);
      await this.dataProvider.syncFulfillments();
      // emit the catalog as we removed its dependencies earlier and we want to avoid having the catalogProvider need to have socketio as a dependency
      this.socketIoService.EmitCatalogTo(this.socketIoService.server, this.catalogProvider.getCatalog());
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.getFulfillments());
      return doc;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
