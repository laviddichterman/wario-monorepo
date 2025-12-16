/**
 * Custom render function with providers
 *
 * Wraps components with necessary context providers for testing:
 * - TanStack Query QueryClientProvider
 * - Optional theme provider
 */

import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { createMockQueryClient } from './mocks/query-client';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Pre-configured QueryClient to use.
   * If not provided, a new mock client will be created.
   */
  queryClient?: QueryClient;

  /**
   * Initial query data to pre-populate in the cache.
   * Keys are query keys, values are the data to cache.
   *
   * @example
   * ```typescript
   * renderWithProviders(<MyComponent />, {
   *   initialQueryData: {
   *     ['catalog']: mockCatalog,
   *     ['settings']: mockSettings,
   *   }
   * });
   * ```
   */
  initialQueryData?: Record<string, unknown>;
}

export interface RenderWithProvidersResult extends RenderResult {
  /** The QueryClient instance used in the render */
  queryClient: QueryClient;
}

/**
 * Custom render function that wraps components with providers.
 *
 * @example
 * ```typescript
 * import { renderWithProviders, createMockCatalog } from '@wcp/wario-test-utils';
 *
 * const { getByText, queryClient } = renderWithProviders(
 *   <ProductList />,
 *   {
 *     initialQueryData: {
 *       ['catalog']: createMockCatalog(),
 *     },
 *   }
 * );
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const { queryClient: providedClient, initialQueryData, ...renderOptions } = options;

  const queryClient = providedClient ?? createMockQueryClient();

  // Pre-populate cache if initialQueryData is provided
  if (initialQueryData) {
    Object.entries(initialQueryData).forEach(([key, data]) => {
      // Support both string keys and array keys
      const queryKey = Array.isArray(key) ? key : [key];
      queryClient.setQueryData(queryKey, data);
    });
  }

  function AllProviders({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  const result = render(ui, { wrapper: AllProviders, ...renderOptions });

  return {
    ...result,
    queryClient,
  };
}
