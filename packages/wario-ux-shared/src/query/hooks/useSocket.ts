/**
 * Hook to access socket context
 * Separated from SocketContext.tsx for React Fast Refresh compatibility
 */

import { useContext } from 'react';

import { SocketContext } from '../context/socket-context-definition';
import type { SocketContextValue } from '../context/socket-context-definition';

/**
 * Hook to access socket context
 * @throws Error if used outside SocketProvider
 */
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
