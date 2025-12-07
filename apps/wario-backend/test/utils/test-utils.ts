/**
 * Test Utilities for NestJS Service Mocking
 *
 * This module provides factory functions and utilities to simplify mocking
 * services, providers, and external dependencies in unit and integration tests.
 */

import { type ModuleMetadata, type Provider, type Type } from '@nestjs/common/interfaces';
import { Test, type TestingModule, type TestingModuleBuilder } from '@nestjs/testing';

/**
 * Creates a mock factory for any class type.
 * Returns an object with all methods as jest.fn() mocks.
 *
 * @example
 * ```ts
 * const mockService = createMock<CatalogProviderService>();
 * mockService.GetCategory.mockResolvedValue({ id: '123', name: 'Test' });
 * ```
 */
export function createMock<T>(overrides: Partial<Record<keyof T, unknown>> = {}): jest.Mocked<T> {
  const mock = new Proxy({} as jest.Mocked<T>, {
    get: (target, prop) => {
      // Special handling for Promise-like checks
      if (prop === 'then') {
        return undefined;
      }
      if (prop === 'constructor' || prop === 'prototype' || prop === Symbol.toStringTag) {
        return undefined;
      }

      if (prop in target) {
        return target[prop as keyof typeof target];
      }
      if (prop in overrides) {
        return overrides[prop as keyof T];
      }
      // Return a jest.fn() for any accessed property
      const mockFn = jest.fn();
      (target as Record<string | symbol, unknown>)[prop] = mockFn;
      return mockFn;
    },
  });
  return mock;
}

/**
 * Creates a mock provider using NestJS provider syntax.
 *
 * @example
 * ```ts
 * const providers = [
 *   createMockProvider(CatalogProviderService),
 *   createMockProvider(OrderManagerService, {
 *     GetOrder: jest.fn().mockResolvedValue({ id: '123' }),
 *   }),
 * ];
 * ```
 */
export function createMockProvider<T>(
  token: Type<T> | string | symbol,
  overrides: Partial<Record<keyof T, unknown>> = {},
): Provider {
  return {
    provide: token,
    useFactory: () => createMock<T>(overrides),
  };
}

/**
 * Creates a mock value provider (for simple values, not classes).
 *
 * @example
 * ```ts
 * const providers = [
 *   createValueProvider('CONFIG_TOKEN', { apiKey: 'test-key' }),
 * ];
 * ```
 */
export function createValueProvider(token: string | symbol, value: unknown): Provider {
  return {
    provide: token,
    useValue: value,
  };
}

/**
 * Helper to create a testing module with common patterns pre-configured.
 *
 * @example
 * ```ts
 * const module = await createTestingModuleWithMocks({
 *   controllers: [OrderController],
 *   mocks: [CatalogProviderService, OrderManagerService],
 * }).compile();
 * ```
 */
export interface TestModuleConfig extends ModuleMetadata {
  /** Services/providers to auto-mock */
  mocks?: Type<unknown>[];
  /** Mock overrides keyed by service type */
  mockOverrides?: Map<Type<unknown>, Partial<Record<string, unknown>>>;
}

export function createTestingModuleWithMocks(config: TestModuleConfig): TestingModuleBuilder {
  const { mocks = [], mockOverrides = new Map(), ...metadata } = config;

  const mockProviders: Provider[] = mocks.map((ServiceClass) => {
    const overrides = (mockOverrides.get(ServiceClass) ?? {}) as Partial<Record<string, unknown>>;
    return createMockProvider(ServiceClass, overrides);
  });

  return Test.createTestingModule({
    ...metadata,
    providers: [...(metadata.providers ?? []), ...mockProviders],
  });
}

/**
 * Type for accessing mocked services from a TestingModule.
 *
 * @example
 * ```ts
 * const mockCatalog = getMockedService<CatalogProviderService>(module, CatalogProviderService);
 * mockCatalog.GetCategory.mockResolvedValue({ id: '123' });
 * ```
 */
export function getMockedService<T>(module: TestingModule, token: Type<T> | string | symbol): jest.Mocked<T> {
  return module.get(token);
}

/**
 * Creates commonly used mock return values for testing.
 */
export const MockResponses = {
  success: <T>(result: T) => ({
    status: 200,
    success: true as const,
    result,
  }),
  notFound: (detail = 'Resource not found') => ({
    status: 404,
    success: false as const,
    error: [{ category: 'INVALID_REQUEST_ERROR', code: 'NOT_FOUND', detail }],
  }),
  serverError: (detail = 'Internal server error') => ({
    status: 500,
    success: false as const,
    error: [{ category: 'API_ERROR', code: 'INTERNAL_SERVER_ERROR', detail }],
  }),
  validationError: (detail = 'Validation failed') => ({
    status: 400,
    success: false as const,
    error: [{ category: 'INVALID_REQUEST_ERROR', code: 'VALIDATION_ERROR', detail }],
  }),
};
