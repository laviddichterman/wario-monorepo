/**
 * Mock SquareSyncDeps Factory
 *
 * Creates properly mocked `SquareSyncDeps` for testing Square synchronization operations.
 */

import type { PinoLogger } from 'nestjs-pino';

import type { ICatalog, IProduct, PrinterGroup } from '@wcp/wario-shared';
import { createMockCatalog, type CreateMockCatalogOptions } from '@wcp/wario-shared/testing';

import type { SquareSyncDeps } from '../../src/modules/catalog-provider/catalog-square-sync.functions';
import type { SquareService } from '../../src/modules/integrations/square/square.service';

import {
  createMockOptionRepository,
  createMockOptionTypeRepository,
  createMockProductInstanceRepository,
  createMockProductRepository,
} from './mock-database';
import { createSquareSuccessResponse } from './mock-square';

export interface CreateMockSquareSyncDepsOptions {
  /** Options for creating the mock catalog */
  catalog?: CreateMockCatalogOptions;
  /** Pre-populated printer groups state */
  printerGroups?: Record<string, PrinterGroup>;
  /** Pre-populated products for findAllProducts callback */
  products?: IProduct[];
  /** Overrides for any deps property */
  overrides?: Partial<SquareSyncDeps>;
}

const defaultLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as PinoLogger;

/**
 * Creates a mock SquareSyncDeps object for testing Square sync operations.
 */
export function createMockSquareSyncDeps(options: CreateMockSquareSyncDepsOptions = {}): SquareSyncDeps {
  const { overrides = {} } = options;

  const catalog: ICatalog = options.catalog ? createMockCatalog(options.catalog) : ({} as ICatalog);
  const printerGroups: Record<string, PrinterGroup> = options.printerGroups ?? {};
  const products: IProduct[] = options.products ?? [];

  const squareService = {
    BatchUpsertCatalogObjects: jest.fn().mockResolvedValue(
      createSquareSuccessResponse({
        objects: [],
        idMappings: [],
      }),
    ),
    BatchRetrieveCatalogObjects: jest.fn().mockResolvedValue(
      createSquareSuccessResponse({
        objects: [],
        relatedObjects: [],
      }),
    ),
    BatchDeleteCatalogObjects: jest.fn().mockResolvedValue(
      createSquareSuccessResponse({
        deletedObjectIds: [],
        deletedAt: new Date().toISOString(),
      }),
    ),
    ListCatalog: jest.fn().mockResolvedValue(
      createSquareSuccessResponse({
        objects: [],
        cursor: undefined,
      }),
    ),
  } as unknown as jest.Mocked<SquareService>;

  // Batch update callbacks
  const batchUpdatePrinterGroup = jest.fn().mockResolvedValue([]);
  const batchUpdateModifierType = jest.fn().mockResolvedValue([]);
  const batchUpdateModifierOption = jest.fn().mockResolvedValue([]);
  const batchUpdateProductInstance = jest.fn().mockResolvedValue([]);
  const batchUpsertProduct = jest.fn().mockResolvedValue([]);
  const findAllProducts = jest.fn().mockResolvedValue(products);

  // Sync callbacks
  const syncModifierTypes = jest.fn().mockResolvedValue(true);
  const syncOptions = jest.fn().mockResolvedValue(true);
  const syncProductInstances = jest.fn().mockResolvedValue(true);
  const syncProducts = jest.fn().mockResolvedValue(true);
  const recomputeCatalog = jest.fn();

  return {
    logger: defaultLogger,
    squareService,
    printerGroups,
    catalog,
    optionRepository: createMockOptionRepository(),
    optionTypeRepository: createMockOptionTypeRepository(),
    productRepository: createMockProductRepository(),
    productInstanceRepository: createMockProductInstanceRepository(),
    batchUpdatePrinterGroup,
    batchUpdateModifierType,
    batchUpdateModifierOption,
    batchUpdateProductInstance,
    batchUpsertProduct,
    findAllProducts,
    syncModifierTypes,
    syncOptions,
    syncProductInstances,
    syncProducts,
    recomputeCatalog,
    ...overrides,
  };
}
