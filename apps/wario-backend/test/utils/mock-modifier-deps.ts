/**
 * Mock ModifierDeps Factory
 *
 * Creates properly mocked `ModifierDeps` for testing modifier type and option operations.
 */

import type { PinoLogger } from 'nestjs-pino';

import type { ICatalog } from '@wcp/wario-shared';
import { createMockCatalog, type CreateMockCatalogOptions } from '@wcp/wario-shared/testing';

import type { AppConfigService } from '../../src/config/app-config.service';
import type { ModifierDeps } from '../../src/modules/catalog-provider/catalog-modifier.functions';
import type { DataProviderService } from '../../src/modules/data-provider/data-provider.service';
import type { SquareService } from '../../src/modules/integrations/square/square.service';

import { createMockOptionRepository, createMockOptionTypeRepository } from './mock-database';
import { createSquareSuccessResponse } from './mock-square';

export interface CreateMockModifierDepsOptions {
  /** Options for creating the mock catalog */
  catalog?: CreateMockCatalogOptions;
  /** Overrides for any deps property */
  overrides?: Partial<ModifierDeps>;
}

const defaultLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as PinoLogger;

/**
 * Creates a mock ModifierDeps object for testing modifier operations.
 */
export function createMockModifierDeps(options: CreateMockModifierDepsOptions = {}): ModifierDeps {
  const { overrides = {} } = options;

  const catalog: ICatalog = options.catalog ? createMockCatalog(options.catalog) : ({} as ICatalog);

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
  } as unknown as jest.Mocked<SquareService>;

  const dataProviderService = {
    getKeyValueConfig: jest.fn().mockReturnValue({
      SQUARE_LOCATION: 'sq_loc_1',
      SQUARE_LOCATION_ALTERNATE: 'sq_loc_alt',
      SQUARE_LOCATION_3P: 'sq_loc_3p',
    }),
  } as unknown as jest.Mocked<DataProviderService>;

  const appConfig = {
    squareBatchChunkSize: 1000,
  } as unknown as jest.Mocked<AppConfigService>;

  // Callbacks - all default to no-op or success
  const syncModifierTypes = jest.fn().mockResolvedValue(true);
  const syncOptions = jest.fn().mockResolvedValue(true);
  const syncProductInstances = jest.fn().mockResolvedValue(true);
  const recomputeCatalog = jest.fn();
  const batchDeleteCatalogObjectsFromExternalIds = jest.fn().mockResolvedValue(true);
  const updateProductsReferencingModifierTypeId = jest.fn().mockResolvedValue(undefined);
  const updateProductInstancesForOptionChanges = jest.fn().mockResolvedValue(undefined);
  const removeModifierTypeFromProducts = jest.fn().mockResolvedValue(undefined);
  const removeModifierOptionFromProductInstances = jest.fn().mockResolvedValue(undefined);
  const deleteProductInstanceFunction = jest.fn().mockResolvedValue({
    deleted: null,
    optionsModified: 0,
    productsModified: 0,
  });

  return {
    optionTypeRepository: createMockOptionTypeRepository(),
    optionRepository: createMockOptionRepository(),
    logger: defaultLogger,
    squareService,
    dataProviderService,
    appConfig,
    catalog,
    syncModifierTypes,
    syncOptions,
    syncProductInstances,
    recomputeCatalog,
    batchDeleteCatalogObjectsFromExternalIds,
    updateProductsReferencingModifierTypeId,
    updateProductInstancesForOptionChanges,
    removeModifierTypeFromProducts,
    removeModifierOptionFromProductInstances,
    deleteProductInstanceFunction,
    ...overrides,
  };
}
