/**
 * Test Utilities Index
 *
 * Re-exports all test utilities for convenient imports.
 *
 * @example
 * ```ts
 * import {
 *   createMock,
 *   mockCatalogProviderService,
 *   createMockModel,
 *   TestUsers,
 * } from '../test/utils';
 * ```
 */

// Auth mocks
export {
  createDenyingAuthGuard,
  createMockAuthGuard,
  createMockRequest,
  MockJwtStrategy,
  type TestUser,
  TestUsers,
} from './mock-auth';

// Database mocks
export {
  createAllMockModelProviders,
  createMockModel,
  createMockModelProvider,
  ModelNames,
} from './mock-database';

// Service mocks
export {
  mockCatalogProviderService,
  mockDataProviderService,
  mockGoogleService,
  mockOrderManagerService,
  MockProviders,
  mockSocketIoService,
  mockSquareService,
  mockStoreCreditProviderService,
} from './mock-services';

// Core utilities
export {
  createMock,
  createMockProvider,
  createTestingModuleWithMocks,
  createValueProvider,
  getMockedService,
  MockResponses,
  type TestModuleConfig,
} from './test-utils';
