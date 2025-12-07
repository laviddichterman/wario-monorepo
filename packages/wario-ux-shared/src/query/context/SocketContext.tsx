/**
 * Socket.io context for managing WebSocket connection and real-time data
 * Integrates with TanStack Query to update cache on socket events
 */

import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import type { FulfillmentConfig, ICatalog, IWSettings } from '@wcp/wario-shared';

import type { ServerTimeData, SocketStatus } from '../types';
import { QUERY_KEYS, SOCKET_EVENTS } from '../types';

import { SocketContext } from './socket-context-definition';
import type { SocketContextValue } from './socket-context-definition';

/**
 * Socket.io provider props
 */
interface SocketProviderProps {
  /** API host URL (e.g., "https://wario.windycitypie.com") */
  hostAPI: string;
  /** Socket.io namespace (e.g., "nsPOS", "nsRO") */
  namespace: string;
  /** Child components */
  children: ReactNode;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
}

/**
 * Socket.io provider that manages WebSocket connection and syncs with TanStack Query
 * Replaces Redux SocketIoMiddleware with modern React Query integration
 */
export function SocketProvider({ hostAPI, namespace, children, autoConnect = true }: SocketProviderProps) {
  const [status, setStatus] = useState<SocketStatus>('NONE');
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (socketRef.current) {
      return; // Already connected
    }

    setStatus('CONNECTING');

    const socket = io(`${hostAPI}/${namespace}`, {
      autoConnect: true,
      secure: true,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setStatus('CONNECTED');
    });

    socket.on('disconnect', () => {
      setStatus('DISCONNECTED');
    });

    socket.on('connect_error', () => {
      setStatus('FAILED');
    });

    // Data events - update TanStack Query cache
    socket.on(SOCKET_EVENTS.CATALOG, (data: ICatalog) => {
      queryClient.setQueryData(QUERY_KEYS.catalog, data);
    });

    socket.on(SOCKET_EVENTS.FULFILLMENTS, (data: Record<string, FulfillmentConfig>) => {
      queryClient.setQueryData(QUERY_KEYS.fulfillments, Object.values(data));
    });

    socket.on(SOCKET_EVENTS.SERVER_TIME, (data: ServerTimeData) => {
      queryClient.setQueryData(QUERY_KEYS.serverTime, data);
    });

    socket.on(SOCKET_EVENTS.SETTINGS, (data: IWSettings) => {
      queryClient.setQueryData(QUERY_KEYS.settings, data);
    });
  }, [hostAPI, namespace, queryClient]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setStatus('DISCONNECTED');
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (autoConnect) {
      // Debounce connection to handle React Strict Mode double-mount
      timeoutId = setTimeout(() => {
        connect();
      }, 0);
    }

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  const value: SocketContextValue = {
    status,
    socket: socketRef.current,
    connect,
    disconnect,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
