/**
 * Mock PrinterGroupDeps Factory
 *
 * Creates properly mocked `PrinterGroupDeps` for testing printer group operations.
 */

import type { PinoLogger } from 'nestjs-pino';

import type { PrinterGroup } from '@wcp/wario-shared';

import type { PrinterGroupDeps } from '../../src/modules/catalog-provider/catalog-printer-group.functions';
import type { DataProviderService } from '../../src/modules/data-provider/data-provider.service';
import type { SquareService } from '../../src/modules/integrations/square/square.service';

import { createMockPrinterGroupRepository } from './mock-database';
import { createSquareSuccessResponse } from './mock-square';

export interface CreateMockPrinterGroupDepsOptions {
  /** Pre-populated printer groups state */
  printerGroups?: Record<string, PrinterGroup>;
  /** Overrides for any deps property */
  overrides?: Partial<PrinterGroupDeps>;
}

const defaultLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as PinoLogger;

/**
 * Creates a mock PrinterGroupDeps object for testing printer group operations.
 */
export function createMockPrinterGroupDeps(options: CreateMockPrinterGroupDepsOptions = {}): PrinterGroupDeps {
  const { overrides = {} } = options;

  const printerGroups: Record<string, PrinterGroup> = options.printerGroups ?? {};

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
  } as unknown as jest.Mocked<SquareService>;

  const dataProviderService = {
    getKeyValueConfig: jest.fn().mockReturnValue({
      SQUARE_LOCATION: 'sq_loc_1',
      SQUARE_LOCATION_ALTERNATE: 'sq_loc_alt',
      SQUARE_LOCATION_3P: 'sq_loc_3p',
    }),
  } as unknown as jest.Mocked<DataProviderService>;

  const syncPrinterGroups = jest.fn().mockResolvedValue(true);
  const batchDeleteCatalogObjectsFromExternalIds = jest.fn().mockResolvedValue(true);
  const reassignPrinterGroupForAllProducts = jest.fn().mockResolvedValue(0);

  return {
    printerGroupRepository: createMockPrinterGroupRepository(),
    logger: defaultLogger,
    squareService,
    dataProviderService,
    printerGroups,
    syncPrinterGroups,
    batchDeleteCatalogObjectsFromExternalIds,
    reassignPrinterGroupForAllProducts,
    ...overrides,
  };
}
