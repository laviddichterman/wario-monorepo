/**
 * TanStack Query client factory
 * Creates configured QueryClient instances for Wario apps
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Default query client options for Wario apps
 */
const defaultOptions = {
  queries: {
    staleTime: 1000 * 60 * 5, // 5 minutes (overridden by socket queries)
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false, // Most data comes from sockets
    refetchOnReconnect: false, // Socket will re-push data on reconnect
  },
  mutations: {
    retry: 0, // Don't retry mutations by default
  },
};

/**
 * Create a pre-configured QueryClient for Wario apps
 * @returns Configured QueryClient instance
 */
export function createWarioQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions,
  });
}
