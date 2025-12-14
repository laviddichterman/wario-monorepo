/**
 * Mock ProductDeps Factory
 *
 * Creates properly mocked `ProductDeps` for testing product catalog functions.
 */

import type { PinoLogger } from 'nestjs-pino';

import type { ICatalog, ICatalogSelectors, ICategory, IOption, IOptionType, IProduct, IProductInstance, PrinterGroup } from '@wcp/wario-shared';
import { createMockCatalogSelectorsFromArrays, MOCK_CATALOG } from '@wcp/wario-shared/testing';

import type { AppConfigService } from '../../src/config/app-config.service';
import type { ProductDeps } from '../../src/config/catalog-provider/catalog-product.functions';
import type { DataProviderService } from '../../src/config/data-provider/data-provider.service';
import type { SquareService } from '../../src/config/square/square.service';
import type { IProductInstanceRepository } from '../../src/repositories/interfaces/product-instance.repository.interface';
import type { IProductRepository } from '../../src/repositories/interfaces/product.repository.interface';

import { createMock } from './test-utils';

export interface CreateMockProductDepsOptions {
  catalog?: ICatalog;
  catalogSelectors?: ICatalogSelectors;
  modifierTypes?: IOptionType[];
  categories?: Record<string, ICategory>;
  printerGroups?: Record<string, PrinterGroup>;
  productInstanceFunctions?: Record<string, unknown>;
  squareBatchChunkSize?: number;
}

/**
 * Creates a mock ProductDeps with all dependencies properly mocked.
 *
 * @example
 * ```typescript
 * const deps = createMockProductDeps({
 *   catalog: MOCK_CATALOG,
 *   modifierTypes: [SIZE_MODIFIER_TYPE, TOPPINGS_MODIFIER_TYPE],
 * });
 *
 * // Mock repository responses
 * (deps.productRepository.bulkCreate as jest.Mock).mockResolvedValue([...]);
 * ```
 */
export function createMockProductDeps(options: CreateMockProductDepsOptions = {}): jest.Mocked<ProductDeps> {
  const {
    catalog = MOCK_CATALOG,
    catalogSelectors = createMockCatalogSelectorsFromArrays({
      products: Object.values(MOCK_CATALOG.products) as IProduct[],
      productInstances: Object.values(MOCK_CATALOG.productInstances) as IProductInstance[],
      categories: Object.values(MOCK_CATALOG.categories),
      modifierTypes: Object.values(MOCK_CATALOG.modifiers).filter((m) => {
        // Filter to only get IOptionType objects (those with 'options' property)
        return 'options' in m && Array.isArray(m.options);
      }) as IOptionType[],
      options: Object.values(MOCK_CATALOG.modifiers).filter((m) => {
        // Filter to only get IOption objects (those without 'options' property)
        return !('options' in m);
      }) as IOption[],
    }),
    modifierTypes = Object.values(MOCK_CATALOG.modifiers).filter((m) => 'options' in m && Array.isArray(m.options)) as IOptionType[],
    categories = MOCK_CATALOG.categories,
    printerGroups = {},
    productInstanceFunctions = {},
    squareBatchChunkSize = 1000,
  } = options;

  // Create mocked repositories
  const productRepository = createMock<IProductRepository>();
  const productInstanceRepository = createMock<IProductInstanceRepository>();

  // Create mocked services
  const squareService = createMock<SquareService>();
  const dataProviderService = createMock<DataProviderService>();
  const appConfig = createMock<AppConfigService>();
  const logger = createMock<PinoLogger>();

  // Mock appConfig.squareBatchChunkSize
  Object.defineProperty(appConfig, 'squareBatchChunkSize', {
    get: () => squareBatchChunkSize,
    configurable: true,
  });

  // Mock DataProviderService.KeyValueConfig
  Object.defineProperty(dataProviderService, 'KeyValueConfig', {
    get: () => ({
      SQUARE_LOCATION: 'sq_loc_1',
      SQUARE_LOCATION_ALTERNATE: 'sq_loc_alt',
      SQUARE_LOCATION_3P: 'sq_loc_3p',
    }),
    configurable: true,
  });

  // Create mock callbacks
  const syncProducts = jest.fn().mockResolvedValue(true);
  const syncProductInstances = jest.fn().mockResolvedValue(true);
  const recomputeCatalog = jest.fn();
  const batchDeleteCatalogObjectsFromExternalIds = jest.fn().mockResolvedValue({});

  return {
    productRepository,
    productInstanceRepository,
    logger,
    squareService,
    dataProviderService,
    appConfig,
    catalog,
    catalogSelectors,
    modifierTypes,
    categories,
    printerGroups,
    productInstanceFunctions,
    syncProducts,
    syncProductInstances,
    recomputeCatalog,
    batchDeleteCatalogObjectsFromExternalIds,
  } as unknown as jest.Mocked<ProductDeps>;
}
