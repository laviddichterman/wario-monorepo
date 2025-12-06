/**
 * Wario Query Provider
 * Combines TanStack Query and Socket.io providers into a single wrapper
 */

import { QueryClientProvider } from '@tanstack/react-query';
/**
 * Wario Query Provider props
 */
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { SocketProvider } from '../context/SocketContext';
import { createWarioQueryClient } from '../queryClient';

/**
 * Wario Query Provider props
 */
interface WarioQueryProviderProps {
  /** API host URL (e.g., "https://wario.windycitypie.com") */
  hostAPI: string;
  /** Socket.io namespace (e.g., "nsPOS", "nsRO") */
  namespace: string;
  /** Child components */
  children: ReactNode;
  /** Auto-connect socket on mount (default: true) */
  autoConnect?: boolean;
  /** show embedded devtools */
  showDevtools?: boolean;
}

/**
 * Combined provider for TanStack Query + Socket.io
 * Replaces Redux Provider + SocketIoMiddleware setup
 * 
 * Usage:
 * ```tsx
 * <WarioQueryProvider hostAPI="https://api.example.com" namespace="nsPOS">
 *   <App />
 * </WarioQueryProvider>
 * ```
 */
export function WarioQueryProvider({
  hostAPI,
  namespace,
  children,
  autoConnect = true,
  showDevtools = false
}: WarioQueryProviderProps) {
  // Create query client once and memoize it
  const queryClient = useMemo(() => createWarioQueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider hostAPI={hostAPI} namespace={namespace} autoConnect={autoConnect}>
        {children}
      </SocketProvider>
      {showDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
