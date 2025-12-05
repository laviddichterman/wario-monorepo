import { Injectable, Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { format } from 'date-fns';
import type { Namespace, Server, Socket } from 'socket.io';

import { type FulfillmentConfig, type ICatalog, type IWSettings, type SeatingResource, WDateUtils } from '@wcp/wario-shared';

import { AppConfigService } from '../app-config.service';
import type { CatalogProviderService } from '../catalog-provider/catalog-provider.service';
import type { DataProviderService } from '../data-provider/data-provider.service';

@WebSocketGateway({ namespace: 'nsRO', cors: { origin: '*' } })
@Injectable()
export class SocketIoService implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SocketIoService.name);
  private clientCount = 0;

  // Lazy injection to avoid circular dependencies
  private dataProvider!: DataProviderService;
  private catalogProvider!: CatalogProviderService;

  @WebSocketServer()
  server: Namespace; // This is the namespace 'nsRO'

  constructor(private readonly appConfig: AppConfigService) { }

  // Setter for lazy injection from DataProviderService
  setDataProvider(dataProvider: DataProviderService) {
    this.dataProvider = dataProvider;
  }

  // Setter for lazy injection from CatalogProviderService
  setCatalogProvider(catalogProvider: CatalogProviderService) {
    this.catalogProvider = catalogProvider;
  }

  handleConnection(client: Socket) {
    ++this.clientCount;
    const connectTime = Date.now();

    this.logger.log(`WebSocket client connected. Total connections: ${String(this.clientCount)}`);

    // Emit initial state to newly connected client
    client.emit('WCP_SERVER_TIME', {
      time: format(connectTime, WDateUtils.ISODateTimeNoOffset),
      tz: this.appConfig.timezone,
    });

    // Emit current application state
    if (this.dataProvider) {
      this.EmitFulfillmentsTo(client, this.dataProvider.Fulfillments);
      this.EmitSettingsTo(client, this.dataProvider.Settings);
      this.EmitSeatingResourcesTo(client, this.dataProvider.SeatingResources);
    }

    if (this.catalogProvider) {
      this.EmitCatalogTo(client, this.catalogProvider.Catalog);
    }
  }

  handleDisconnect(_client: Socket) {
    --this.clientCount;
    this.logger.log(`WebSocket client disconnected. Total connections: ${String(this.clientCount)}`);
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
