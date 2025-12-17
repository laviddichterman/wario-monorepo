/**
 * Mock ProductDeps Factory
 *
 * Creates properly mocked `ProductDeps` for testing product catalog functions.
 */

import type { PinoLogger } from 'nestjs-pino';

import type { ICatalogSelectors, IOption, IOptionType } from '@wcp/wario-shared';
import {
  createMockCatalog,
  type CreateMockCatalogOptions,
  createMockCatalogSelectorsFromArrays,
  MOCK_CATALOG,
} from '@wcp/wario-shared/testing';

import { type AppConfigService } from 'src/config/app-config.service';
import { type SquareService } from 'src/modules/integrations/square/square.service';

import type { DataProviderService } from '../../src/config/data-provider/data-provider.service';
import type { ProductDeps } from '../../src/modules/catalog-provider/catalog-product.functions';
import type { IProductInstanceRepository } from '../../src/repositories/interfaces/product-instance.repository.interface';
import type { IProductRepository } from '../../src/repositories/interfaces/product.repository.interface';

export interface CreateMockProductDepsOptions {
  catalog?: CreateMockCatalogOptions;
  modifierTypes?: IOptionType[];
  categories?: Record<string, unknown>;
  printerGroups?: Record<string, unknown>;
}

const squareBatchChunkSize = 1000;
const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as PinoLogger;

/**
 * Creates a mock ProductDeps object for testing batchUpsertProduct.
 * Uses createMockCatalog for proper catalog object creation.
 */
export function createMockProductDeps(options: CreateMockProductDepsOptions = {}): ProductDeps {
  // Use createMockCatalog to generate a proper catalog structure
  const catalog = options.catalog ? createMockCatalog(options.catalog) : MOCK_CATALOG;

  // Extract modifier types and options from the catalog's modifiers object
  const modifierTypes: IOptionType[] =
    options.modifierTypes ?? Object.values(catalog.modifiers).filter((m): m is IOptionType => 'options' in m);

  const modifierOptions: IOption[] = Object.values(catalog.options).filter((m): m is IOption => 'metadata' in m);

  const catalogSelectors: ICatalogSelectors = createMockCatalogSelectorsFromArrays({
    modifierTypes,
    options: modifierOptions,
  });

  // Extract categories and printer groups from options or use empty objects
  const categories = options.categories ?? {};
  const printerGroups = options.printerGroups ?? {};

  // Product instance functions map (empty by default)
  const productInstanceFunctions = {};

  // Mock dependencies using standard Jest mocks
  const productRepository = {
    bulkCreate: jest.fn(),
    bulkUpdate: jest.fn(),
  } as unknown as jest.Mocked<IProductRepository>;

  const productInstanceRepository = {
    bulkCreate: jest.fn(),
    bulkUpdate: jest.fn(),
  } as unknown as jest.Mocked<IProductInstanceRepository>;

  const squareService = {
    BatchUpsertCatalogObjects: jest.fn(),
    BatchRetrieveCatalogObjects: jest.fn(),
  } as unknown as jest.Mocked<SquareService>;

  const dataProviderService = {
    KeyValueConfig: {
      SQUARE_LOCATION: 'sq_loc_1',
      SQUARE_LOCATION_ALTERNATE: 'sq_loc_alt',
      SQUARE_LOCATION_3P: 'sq_loc_3p',
    },
    getKeyValueConfig: jest.fn().mockReturnValue({
      SQUARE_LOCATION: 'sq_loc_1',
      SQUARE_LOCATION_ALTERNATE: 'sq_loc_alt',
      SQUARE_LOCATION_3P: 'sq_loc_3p',
    }),
  } as unknown as jest.Mocked<DataProviderService>;

  const appConfig = {
    squareBatchChunkSize,
  } as unknown as jest.Mocked<AppConfigService>;

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
