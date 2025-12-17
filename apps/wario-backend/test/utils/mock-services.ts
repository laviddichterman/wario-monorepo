import { DataProviderService } from '../../src/config/data-provider/data-provider.service';
import { StoreCreditProviderService } from '../../src/config/store-credit-provider/store-credit-provider.service';
import { OrderManagerService } from '../../src/domain/order/order-manager/order-manager.service';
import { SocketIoService } from '../../src/infrastructure/messaging/socket-io/socket-io.service';
import { CatalogProviderService } from '../../src/modules/catalog-provider/catalog-provider.service';
import { GoogleService } from '../../src/modules/integrations/google/google.service';
import { SquareService } from '../../src/modules/integrations/square/square.service';

import { createMock, MockResponses } from './test-utils';

/**
 * Creates a mock CatalogProviderService with optional overrides.
 */
export function mockCatalogProviderService(
  overrides: Partial<CatalogProviderService> = {},
): jest.Mocked<CatalogProviderService> {
  const catalogSelectorsValue = {
    productEntry: jest.fn(),
    productInstanceEntry: jest.fn(),
    category: jest.fn(),
    option: jest.fn(),
    options: jest.fn(),
    optionType: jest.fn(),
    optionTypes: jest.fn(),
    printerGroup: jest.fn(),
    printerGroups: jest.fn(),
    productInstanceFunction: jest.fn(),
    orderInstanceFunction: jest.fn(),
    settings: jest.fn(),
    catalog: jest.fn(),
  };

  const mock = createMock<CatalogProviderService>({
    // Method that OrderValidationService uses to access selectors
    getCatalogSelectors: jest.fn().mockReturnValue(catalogSelectorsValue),
    ...overrides,
  } as Parameters<typeof createMock<CatalogProviderService>>[0]);
  // Set CatalogSelectors as a property for tests that access it directly
  (mock as unknown as { CatalogSelectors: typeof catalogSelectorsValue }).CatalogSelectors = catalogSelectorsValue;
  return mock;
}

/**
 * Creates a mock OrderManagerService with optional overrides.
 */
export function mockOrderManagerService(
  overrides: Partial<OrderManagerService> = {},
): jest.Mocked<OrderManagerService> {
  return createMock<OrderManagerService>(overrides);
}

/**
 * Creates a mock SquareService with optional overrides.
 */
export function mockSquareService(overrides: Partial<SquareService> = {}): jest.Mocked<SquareService> {
  return createMock<SquareService>(overrides);
}

/**
 * Creates a mock DataProviderService with optional overrides.
 */
export function mockDataProviderService(
  overrides: Partial<DataProviderService> = {},
): jest.Mocked<DataProviderService> {
  return createMock<DataProviderService>(overrides);
}

/**
 * Creates a mock SocketIoService with optional overrides.
 */
export function mockSocketIoService(overrides: Partial<SocketIoService> = {}): jest.Mocked<SocketIoService> {
  return createMock<SocketIoService>({
    EmitFulfillments: jest.fn(),
    EmitSettings: jest.fn(),
    EmitCatalog: jest.fn(),
    // EmitOrders: jest.fn(),
    // EmitOrder: jest.fn(),
    ...overrides,
  });
}

/**
 * Creates a mock GoogleService with optional overrides.
 */
export function mockGoogleService(overrides: Partial<GoogleService> = {}): jest.Mocked<GoogleService> {
  return createMock<GoogleService>(overrides);
}

/**
 * Creates a mock StoreCreditProviderService with optional overrides.
 */
export function mockStoreCreditProviderService(
  overrides: Partial<StoreCreditProviderService> = {},
): jest.Mocked<StoreCreditProviderService> {
  return createMock<StoreCreditProviderService>(overrides);
}

/**
 * Provider factories for use in Test.createTestingModule().
 * Returns a Provider object that can be spread into the providers array.
 */
export const MockProviders = {
  CatalogProviderService: (overrides: Partial<CatalogProviderService> = {}) => ({
    provide: CatalogProviderService,
    useValue: mockCatalogProviderService(overrides),
  }),

  OrderManagerService: (overrides: Partial<OrderManagerService> = {}) => ({
    provide: OrderManagerService,
    useValue: mockOrderManagerService(overrides),
  }),

  SquareService: (overrides: Partial<SquareService> = {}) => ({
    provide: SquareService,
    useValue: mockSquareService(overrides),
  }),

  DataProviderService: (overrides: Partial<DataProviderService> = {}) => ({
    provide: DataProviderService,
    useValue: mockDataProviderService(overrides),
  }),

  SocketIoService: (overrides: Partial<SocketIoService> = {}) => ({
    provide: SocketIoService,
    useValue: mockSocketIoService(overrides),
  }),

  GoogleService: (overrides: Partial<GoogleService> = {}) => ({
    provide: GoogleService,
    useValue: mockGoogleService(overrides),
  }),

  StoreCreditProviderService: (overrides: Partial<StoreCreditProviderService> = {}) => ({
    provide: StoreCreditProviderService,
    useValue: mockStoreCreditProviderService(overrides),
  }),
};

// Re-export MockResponses for convenience
export { MockResponses };
