/**
 * Mock CategoryDeps Factory
 *
 * Creates properly mocked `CategoryDeps` for testing catalog category operations.
 */

import type { PinoLogger } from 'nestjs-pino';

import type { FulfillmentConfig, ICatalog } from '@wcp/wario-shared';
import { createMockCatalog, type CreateMockCatalogOptions } from '@wcp/wario-shared/testing';

import type { CategoryDeps } from '../../src/modules/catalog-provider/catalog-category.functions';

import { createMockCategoryRepository, createMockProductRepository } from './mock-database';

export interface CreateMockCategoryDepsOptions {
  /** Options for creating the mock catalog */
  catalog?: CreateMockCatalogOptions;
  /** Pre-populated fulfillments for validation tests */
  fulfillments?: Record<string, FulfillmentConfig>;
  /** Overrides for any deps property */
  overrides?: Partial<CategoryDeps>;
}

const defaultLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as PinoLogger;

/**
 * Creates a mock CategoryDeps object for testing category operations.
 */
export function createMockCategoryDeps(options: CreateMockCategoryDepsOptions = {}): CategoryDeps {
  const { overrides = {} } = options;

  const catalog: ICatalog = options.catalog ? createMockCatalog(options.catalog) : ({} as ICatalog);

  // Default empty fulfillments
  const fulfillments: Record<string, FulfillmentConfig> = options.fulfillments ?? {};

  const batchDeleteProducts = jest.fn().mockResolvedValue(undefined);

  return {
    categoryRepository: createMockCategoryRepository(),
    productRepository: createMockProductRepository(),
    logger: defaultLogger,
    fulfillments,
    catalog,
    batchDeleteProducts,
    ...overrides,
  };
}
