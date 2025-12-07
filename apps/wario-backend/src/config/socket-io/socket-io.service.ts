import { Injectable } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { format } from 'date-fns';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Namespace, Server, Socket } from 'socket.io';

import { type FulfillmentConfig, type ICatalog, type IWSettings, type SeatingResource, WDateUtils } from '@wcp/wario-shared';

import { AppConfigService } from '../app-config.service';
import { CatalogProviderService } from '../catalog-provider/catalog-provider.service';
import { DataProviderService } from '../data-provider/data-provider.service';

@WebSocketGateway({
  namespace: 'nsRO',
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      /https:\/\/.*\.windycitypie\.com$/,
      /https:\/\/windycitypie\.com$/,
      /https:\/\/.*\.breezytownpizza\.com$/,
      /https:\/\/breezytownpizza\.com$/,
    ],
    credentials: true,
  },
})
@Injectable()
export class SocketIoService implements OnGatewayConnection, OnGatewayDisconnect {
  private clientCount = 0;

  @WebSocketServer()
  server!: Namespace; // This is the namespace 'nsRO' - injected by NestJS after gateway init

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly catalogProvider: CatalogProviderService,
    private readonly dataProvider: DataProviderService,
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
    const fulfillmentCount = Object.keys(this.dataProvider.Fulfillments).length;
    const seatingCount = Object.keys(this.dataProvider.SeatingResources).length;
    this.logger.info({ fulfillmentCount, seatingCount }, 'Emitting initial data provider state');
    this.EmitFulfillmentsTo(client, this.dataProvider.Fulfillments);
    this.EmitSettingsTo(client, this.dataProvider.Settings);
    this.EmitSeatingResourcesTo(client, this.dataProvider.SeatingResources);

    const catalog = this.catalogProvider.Catalog;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (catalog) {
      const categoryCount = Object.keys(catalog.categories).length;
      const productCount = Object.keys(catalog.products).length;
      this.logger.info({ categoryCount, productCount }, 'Emitting initial catalog');
      this.EmitCatalogTo(client, catalog);
    } else {
      this.logger.warn({ productsLength: this.catalogProvider.Products.length }, 'CatalogProvider registered but Catalog not yet computed - skipping initial catalog emit');
    }
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
