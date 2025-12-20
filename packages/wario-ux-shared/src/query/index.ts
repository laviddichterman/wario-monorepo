/**
 * TanStack Query integration for Wario
 * Modern replacement for Redux-based state management
 */

// Context (export types and context, but not the hook - hook is in ./hooks)
export { SocketContext } from './context/socket-context-definition';
export type { SocketContextValue } from './context/socket-context-definition';

export { SocketProvider } from './context/SocketContext';

export { VisibilityMapProvider } from './context/VisibilityContext';

export * from './create-category-shopper';

// Hooks (queries)
export * from './hooks';

// Mutations
export * from './mutations';

// Provider
export * from './provider/WarioQueryProvider';
// Query client
export * from './queryClient';

// Types
export * from './types';
