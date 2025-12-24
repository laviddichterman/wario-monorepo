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
  createCatalogWithModifiers,
  createMinimalCatalogOptions,
  createMockCatalog,
  type CreateMockCatalogOptions,
  createMockCatalogSelectorsFromArrays,
  createMockCategory,
  createMockCreateOptionRequest,
  createMockCreateOptionTypeRequest,
  createMockCreateProductInstanceRequest,
  createMockCreateProductRequest,
  createMockOption,
  createMockOptionType,
  createMockProduct,
  createMockProductInstance,
  createMockUpdateProductInstanceRequest,
  createMockUpdateProductRequest,
  setupMockCatalog,
} from './catalog-test-helpers';

// CreateOrder request mocks (for OrderManagerService.CreateOrder tests)
export {
  createMockCreateOrderRequest,
  type CreateMockCreateOrderRequestOptions,
  createMockCreditCodeAmountDiscount,
  type CreateMockCreditCodeAmountDiscountOptions,
  createMockCreditPaymentProposed,
  type CreateMockCreditPaymentProposedOptions,
  createMockFulfillmentConfig,
  createMockFulfillmentConfigMap,
  type CreateMockFulfillmentConfigOptions,
  createMockKeyValueConfig,
  createMockSettings,
  createMockSquareErrorResponse,
  createMockSquareOrderSuccessResponse,
  createMockSquarePaymentSuccessResponse,
  createMockStoreCreditPaymentProposed,
  type CreateMockStoreCreditPaymentProposedOptions,
  createMockValidateLockAndSpendFailure,
  createMockValidateLockAndSpendSuccess,
  createOpenAllDayHours,
  type FulfillmentConfigMap,
  type SquareErrorMock,
} from './create-order-mocks';

// E2E test helpers
export { createE2EClient, type E2EClient, expectError, expectSuccess, overrideE2EAuth } from './e2e-helpers';

// Google mocks
export * from './google-mocks';

// Auth mocks
export {
  createDenyingAuthGuard,
  createMockAuthGuard,
  createMockRequest,
  MockJwtStrategy,
  type TestUser,
  TestUsers,
} from './mock-auth';

// Deps mock factories
export { createMockCategoryDeps, type CreateMockCategoryDepsOptions } from './mock-category-deps';
// Database mocks
export {
  createAllMockModelProviders,
  createMockCategoryRepository,
  createMockModel,
  createMockModelProvider,
  createMockOptionRepository,
  createMockOptionTypeRepository,
  createMockOrderInstanceFunctionRepository,
  createMockPrinterGroupRepository,
  createMockProductInstanceFunctionRepository,
  createMockProductInstanceRepository,
  createMockProductRepository,
  ModelNames,
} from './mock-database';
export { createMockFunctionDeps, type CreateMockFunctionDepsOptions } from './mock-function-deps';
export { createMockModifierDeps, type CreateMockModifierDepsOptions } from './mock-modifier-deps';
export { createMockPrinterGroupDeps, type CreateMockPrinterGroupDepsOptions } from './mock-printer-group-deps';
export { createMockProductDeps, type CreateMockProductDepsOptions } from './mock-product-deps';

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

// Square API mocks
export {
  createMockBatchDeleteResponse,
  createMockBatchRetrieveResponse,
  createMockBatchUpsertResponse,
  createMockCatalogIdMapping,
  createMockIdMappingGenerator,
  createMockSquareCatalogObject,
  createMockSquareCategory,
  createMockSquareItem,
  createMockSquareItemVariation,
  createMockSquareModifier,
  createMockSquareModifierList,
  createSquareFailureResponse,
  createSquareSuccessResponse,
  SquareIdMappingTracker,
} from './mock-square';

export { createMockSquareSyncDeps, type CreateMockSquareSyncDepsOptions } from './mock-square-sync-deps';

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
