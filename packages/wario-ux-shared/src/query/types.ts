/**
 * TanStack Query-based state management types
 * Replaces Redux-based SocketIoSlice types for modern state management
 */

/**
 * Server time synchronization data
 * Received from socket.io WCP_SERVER_TIME event
 */
export interface ServerTimeData {
  /** ISO formatted server time string */
  time: string;
  /** Server timezone identifier */
  tz: string;
}

/**
 * Time synchronization state
 * Computed client-side to maintain accurate current time
 */
export interface TimeSyncState {
  /** Server time when page loaded (milliseconds since epoch) */
  pageLoadTime: number;
  /** Client local time when page loaded (milliseconds since epoch) */
  pageLoadTimeLocal: number;
  /** Estimated ticks elapsed since page load */
  roughTicksSinceLoad: number;
  /** Current server time estimate (milliseconds since epoch) */
  currentTime: number;
  /** Current client local time (milliseconds since epoch) */
  currentLocalTime: number;
  /** Original server time data */
  serverTime: ServerTimeData | null;
}

/**
 * Socket connection status
 */
export type SocketStatus = 'NONE' | 'CONNECTING' | 'CONNECTED' | 'FAILED' | 'DISCONNECTED';

/**
 * Query keys for TanStack Query
 */
export const QUERY_KEYS = {
  catalog: ['catalog'] as const,
  fulfillments: ['fulfillments'] as const,
  settings: ['settings'] as const,
  serverTime: ['serverTime'] as const,
} as const;

/**
 * Socket.io event names
 */
export const SOCKET_EVENTS = {
  CATALOG: 'WCP_CATALOG',
  FULFILLMENTS: 'WCP_FULFILLMENTS',
  SERVER_TIME: 'WCP_SERVER_TIME',
  SETTINGS: 'WCP_SETTINGS',
} as const;

/**
 * Time polling interval (30 seconds)
 */
export const TIME_POLLING_INTERVAL = 30000;
