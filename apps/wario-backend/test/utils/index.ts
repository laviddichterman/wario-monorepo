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
 *   createMockWOrderInstance,
 * } from '../test/utils';
 * ```
 */

// Catalog test helpers (wraps @wcp/wario-shared/testing)
export {
  asUncommittedOption,
  asUncommittedOptionType,
  asUncommittedProduct,
  asUncommittedProductInstance,
  createCatalogWithModifiers,
  createMinimalCatalogOptions,
  createMockCatalog,
  type CreateMockCatalogOptions,
  createMockCatalogSelectorsFromArrays,
  createMockCategory,
  createMockOption,
  createMockOptionType,
  createMockProduct,
  createMockProductInstance,
  setupMockCatalog,
} from './catalog-test-helpers';

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
export { createAllMockModelProviders, createMockModel, createMockModelProvider, ModelNames } from './mock-database';

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

// Order mocks
export {
  createMockCancelledOrder,
  createMockCart,
  createMockCartEntry,
  type CreateMockCartEntryOptions,
  createMockCashPayment,
  createMockCompletedOrder,
  createMockConfirmedOrder,
  createMockCreditPayment,
  createMockCustomerInfo,
  type CreateMockCustomerInfoOptions,
  type CreateMockDiscountOptions,
  createMockFulfillmentData,
  type CreateMockFulfillmentOptions,
  createMockManualDiscount,
  createMockMetrics,
  createMockMoneyBackend,
  createMockOrderTax,
  type CreateMockPaymentOptions,
  createMockStoreCreditPayment,
  type CreateMockStoreCreditPaymentOptions,
  createMockTipAmount,
  createMockTipPercentage,
  createMockWOrderInstance,
  type CreateMockWOrderInstanceOptions,
  resetOrderIdCounter,
} from './order-mocks';

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
