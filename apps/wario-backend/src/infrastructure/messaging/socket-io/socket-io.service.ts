import { Inject, Injectable } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { format } from 'date-fns';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Namespace, Server, Socket } from 'socket.io';

import {
  type FulfillmentConfig,
  type ICatalog,
  type IWSettings,
  type SeatingResource,
  WDateUtils,
} from '@wcp/wario-shared';

import { CatalogProviderService } from 'src/modules/catalog-provider/catalog-provider.service';
import { DataProviderService } from 'src/modules/data-provider/data-provider.service';

import { AppConfigService } from '../../../config/app-config.service';

@WebSocketGateway({
  namespace: 'nsRO',
})
@Injectable()
export class SocketIoService implements OnGatewayConnection, OnGatewayDisconnect {
  private clientCount = 0;

  @WebSocketServer()
  server!: Namespace; // This is the namespace 'nsRO' - injected by NestJS after gateway init

  constructor(
    @Inject(AppConfigService) private readonly appConfig: AppConfigService,
    @Inject(CatalogProviderService) private catalogProvider: CatalogProviderService,
    @Inject(DataProviderService) private dataProvider: DataProviderService,
    @InjectPinoLogger(SocketIoService.name)
    private readonly logger: PinoLogger,
  ) { }

  handleConnection(client: Socket) {
    ++this.clientCount;
    const connectTime = Date.now();

    this.logger.info(`WebSocket client connected. Total connections: ${String(this.clientCount)}`);

    // Emit initial state to newly connected client
    client.emit('WCP_SERVER_TIME', {
      time: format(connectTime, WDateUtils.ISODateTimeNoOffset),
      tz: this.appConfig.timezone,
    });

    // Emit current application state
    const fulfillmentCount = Object.keys(this.dataProvider.getFulfillments()).length;
    const seatingCount = Object.keys(this.dataProvider.getSeatingResources()).length;
    this.logger.trace({ fulfillmentCount, seatingCount }, 'Emitting initial data provider state');
    this.EmitFulfillmentsTo(client, this.dataProvider.getFulfillments());
    // incorrectly type cast to IWSettings so we can not worry about types during the migration
    // @TODO: fix this when we can remove the IWSettingsDto.config field
    this.EmitSettingsTo(client, this.dataProvider.getSettings() as IWSettings);
    this.EmitSeatingResourcesTo(client, this.dataProvider.getSeatingResources());

    const catalog = this.catalogProvider.getCatalog();
    const categoryCount = Object.keys(catalog.categories).length;
    const productCount = Object.keys(catalog.products).length;
    this.logger.trace({ categoryCount, productCount }, 'Emitting initial catalog');
    this.EmitCatalogTo(client, catalog);
  }

  handleDisconnect(_client: Socket) {
    --this.clientCount;
    this.logger.info(`WebSocket client disconnected. Total connections: ${String(this.clientCount)}`);
  }

  EmitFulfillmentsTo(dest: Socket | Namespace | Server, fulfillments: Record<string, FulfillmentConfig>) {
    return dest.emit('WCP_FULFILLMENTS', fulfillments);
  }

  EmitFulfillments(fulfillments: Record<string, FulfillmentConfig>) {
    return this.EmitFulfillmentsTo(this.server, fulfillments);
  }

  EmitSeatingResourcesTo(dest: Socket | Namespace | Server, seatingResources: Record<string, SeatingResource>) {
    return dest.emit('WCP_SEATING_RESOURCES', seatingResources);
  }

  EmitSeatingResources(seatingResources: Record<string, SeatingResource>) {
    return this.EmitSeatingResourcesTo(this.server, seatingResources);
  }

  EmitSettingsTo(dest: Socket | Namespace | Server, settings: IWSettings) {
    return dest.emit('WCP_SETTINGS', settings);
  }

  EmitSettings(settings: IWSettings) {
    return this.EmitSettingsTo(this.server, settings);
  }

  EmitCatalogTo(dest: Socket | Namespace | Server, catalog: ICatalog) {
    return dest.emit('WCP_CATALOG', catalog);
  }

  EmitCatalog(catalog: ICatalog) {
    return this.EmitCatalogTo(this.server, catalog);
  }
}
