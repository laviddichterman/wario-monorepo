/**
 * Bridge Message Types
 *
 * These types define the message protocol for communication between
 * wario-bridge, ticket printers, KDS tablets, and wario-pos clients.
 */

/** Base message type for all bridge communications */
export interface BridgeMessage {
  /** Unique message identifier */
  id: string;
  /** Message type discriminator */
  type: string;
  /** Timestamp when message was created */
  timestamp: number;
  /** Optional correlation ID for request-response patterns */
  correlationId?: string;
}

/** Message types for ticket printer communication */
export enum PrinterMessageType {
  PRINT_TICKET = 'PRINT_TICKET',
  PRINTER_STATUS = 'PRINTER_STATUS',
  PRINT_RESULT = 'PRINT_RESULT',
}

/** Message sent to printer to print a ticket */
export interface PrinterMessage extends BridgeMessage {
  type: PrinterMessageType;
  /** Target printer identifier */
  printerId: string;
}

/** Print ticket request */
export interface PrintTicketMessage extends PrinterMessage {
  type: PrinterMessageType.PRINT_TICKET;
  /** Order ID to print */
  orderId: string;
  /** Number of copies to print */
  copies: number;
}

/** Printer status update */
export interface PrinterStatusMessage extends PrinterMessage {
  type: PrinterMessageType.PRINTER_STATUS;
  /** Whether printer is online */
  online: boolean;
  /** Optional error message */
  error?: string;
}

/** Message types for KDS tablet communication */
export enum KdsMessageType {
  ORDER_DISPLAY = 'ORDER_DISPLAY',
  ORDER_BUMP = 'ORDER_BUMP',
  STATION_STATUS = 'STATION_STATUS',
}

/** Message sent to KDS tablets */
export interface KdsMessage extends BridgeMessage {
  type: KdsMessageType;
  /** Target KDS station identifier */
  stationId: string;
}

/** Display order on KDS */
export interface OrderDisplayMessage extends KdsMessage {
  type: KdsMessageType.ORDER_DISPLAY;
  /** Order ID to display */
  orderId: string;
  /** Display priority (lower = higher priority) */
  priority: number;
}

/** Bump (complete) order on KDS */
export interface OrderBumpMessage extends KdsMessage {
  type: KdsMessageType.ORDER_BUMP;
  /** Order ID being bumped */
  orderId: string;
}

/** Message types for POS client communication */
export enum PosMessageType {
  ORDER_UPDATE = 'ORDER_UPDATE',
  PRINTER_UPDATE = 'PRINTER_UPDATE',
  KDS_UPDATE = 'KDS_UPDATE',
}

/** Message sent to POS clients */
export interface PosMessage extends BridgeMessage {
  type: PosMessageType;
  /** Target client identifier (or 'broadcast' for all) */
  targetClient: string | 'broadcast';
}

/** Order status update for POS */
export interface OrderUpdateMessage extends PosMessage {
  type: PosMessageType.ORDER_UPDATE;
  orderId: string;
  status: string;
}
