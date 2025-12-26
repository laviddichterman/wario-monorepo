/**
 * Socket.io React context
 * Separated from SocketContext.tsx for React Fast Refresh compatibility
 */

import { createContext } from 'react';
import type { Socket } from 'socket.io-client';

import type { SocketStatus } from '../types';

/**
 * Socket context value
 */
export interface SocketContextValue {
  /** Current socket connection status */
  status: SocketStatus;
  /** Socket.io instance (null until connected) */
  socket: Socket | null;
  /** Connect function */
  connect: () => void;
  /** Disconnect function */
  disconnect: () => void;
  /** API host URL */
  hostAPI: string;
}

export const SocketContext = createContext<SocketContextValue | null>(null);
