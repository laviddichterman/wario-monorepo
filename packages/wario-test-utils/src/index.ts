/**
 * Wario Test Utilities
 *
 * Shared React testing utilities for the Wario monorepo.
 * This package provides:
 * - Custom render functions with providers
 * - Mock TanStack Query client
 * - Mock context values (Socket, Auth)
 * - Re-exports from @wcp/wario-shared/testing
 */

// Query mocks
export {
  createMockQueryClient,
  createMockQueryClientProvider,
  type MockQueryClientOptions,
} from './mocks/query-client';

// Context mocks
export { createMockSocketContext, type MockSocketContextValue } from './mocks/socket-context';

// Custom render
export { renderWithProviders, type RenderWithProvidersOptions } from './render';

// Re-export all mock generators from wario-shared/testing
export * from '@wcp/wario-shared/testing';
