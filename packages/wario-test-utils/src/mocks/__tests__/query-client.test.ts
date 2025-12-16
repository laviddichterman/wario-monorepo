/**
 * Query Client Mock Tests
 *
 * Tests for the mock TanStack Query client utilities.
 */
import { describe, expect, it } from 'vitest';

import { createMockQueryClient, createMockQueryClientProvider } from '../query-client';

describe('createMockQueryClient', () => {
  it('creates a QueryClient instance', () => {
    const client = createMockQueryClient();

    expect(client).toBeDefined();
    expect(typeof client.getQueryCache).toBe('function');
    expect(typeof client.getMutationCache).toBe('function');
  });

  it('configures retry to false by default', () => {
    const client = createMockQueryClient();
    const defaults = client.getDefaultOptions();

    expect(defaults.queries?.retry).toBe(false);
    expect(defaults.mutations?.retry).toBe(false);
  });

  it('allows setting query data', () => {
    const client = createMockQueryClient();
    const testData = { id: 1, name: 'test' };

    client.setQueryData(['test-key'], testData);

    expect(client.getQueryData(['test-key'])).toEqual(testData);
  });

  it('accepts custom options', () => {
    const client = createMockQueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5000,
        },
      },
    });

    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(5000);
  });
});

describe('createMockQueryClientProvider', () => {
  it('returns a wrapper function', () => {
    const wrapper = createMockQueryClientProvider();

    expect(typeof wrapper).toBe('function');
  });

  it('accepts a custom QueryClient', () => {
    const customClient = createMockQueryClient();
    const wrapper = createMockQueryClientProvider(customClient);

    expect(typeof wrapper).toBe('function');
  });
});
