/**
 * TanStack Query integration for Wario
 * Modern replacement for Redux-based state management
 */

// Context (export types and context, but not the hook - hook is in ./hooks)
export { SocketContext } from './context/socket-context-definition';
export { SocketProvider } from './context/SocketContext';
// Hooks
export * from './hooks';

// Provider
export * from './provider/WarioQueryProvider';

// Query client
export * from './queryClient';

// Types
export * from './types';

export type { SocketContextValue } from './context/socket-context-definition';
