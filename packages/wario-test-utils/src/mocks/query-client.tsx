/**
 * Mock TanStack Query Client for testing
 *
 * Provides a pre-configured QueryClient with sensible test defaults:
 * - No retries (fail fast)
 * - No garbage collection time (predictable cache behavior)
 * - Error logging disabled
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export interface MockQueryClientOptions {
  /** Default data to pre-populate in the cache */
  defaultOptions?: {
    queries?: {
      staleTime?: number;
      gcTime?: number;
      retry?: boolean | number;
    };
  };
}

/**
 * Creates a QueryClient configured for testing.
 *
 * @example
 * ```typescript
 * const queryClient = createMockQueryClient();
 *
 * // Pre-populate cache with data
 * queryClient.setQueryData(['catalog'], mockCatalog);
 * ```
 */
export function createMockQueryClient(options: MockQueryClientOptions = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
        ...options.defaultOptions?.queries,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Creates a QueryClientProvider wrapper for testing.
 *
 * @example
 * ```typescript
 * const wrapper = createMockQueryClientProvider();
 * render(<MyComponent />, { wrapper });
 * ```
 */
export function createMockQueryClientProvider(
  queryClient?: QueryClient,
): ({ children }: { children: ReactNode }) => ReactNode {
  const client = queryClient ?? createMockQueryClient();

  return function MockQueryClientWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
