import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Namespace, Server, Socket } from 'socket.io';

import { FulfillmentConfig, ICatalog, IWSettings, SeatingResource } from '@wcp/wario-shared';

@WebSocketGateway({ namespace: 'nsRO', cors: { origin: '*' } })
@Injectable()
export class SocketIoService {
  private readonly logger = new Logger(SocketIoService.name);

  @WebSocketServer()
  server: Server; // This will be the namespace 'nsRO'

  EmitFulfillmentsTo(dest: Socket | Namespace | Server, fulfillments: Record<string, FulfillmentConfig>) {
    return dest.emit('WCP_FULFILLMENTS', fulfillments);
  }

  EmitFulfillments(fulfillments: Record<string, FulfillmentConfig>) {
    if (this.server) {
      return this.EmitFulfillmentsTo(this.server, fulfillments);
    }
  }

  EmitSeatingResourcesTo(dest: Socket | Namespace | Server, seatingResources: Record<string, SeatingResource>) {
    return dest.emit('WCP_SEATING_RESOURCES', seatingResources);
  }

  EmitSeatingResources(seatingResources: Record<string, SeatingResource>) {
    if (this.server) {
      return this.EmitSeatingResourcesTo(this.server, seatingResources);
    }
  }

  EmitSettingsTo(dest: Socket | Namespace | Server, settings: IWSettings) {
    return dest.emit('WCP_SETTINGS', settings);
  }

  EmitSettings(settings: IWSettings) {
    if (this.server) {
      return this.EmitSettingsTo(this.server, settings);
    }
  }

  EmitCatalogTo(dest: Socket | Namespace | Server, catalog: ICatalog) {
    return dest.emit('WCP_CATALOG', catalog);
  }

  EmitCatalog(catalog: ICatalog) {
    if (this.server) {
      return this.EmitCatalogTo(this.server, catalog);
    }
  }
}
