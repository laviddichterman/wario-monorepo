/**
 * Mock FunctionDeps Factory
 *
 * Creates properly mocked `FunctionDeps` for testing catalog function operations.
 */

import type { PinoLogger } from 'nestjs-pino';

import type { FunctionDeps } from '../../src/modules/catalog-provider/catalog-function.functions';

import {
  createMockOptionRepository,
  createMockOrderInstanceFunctionRepository,
  createMockProductInstanceFunctionRepository,
  createMockProductRepository,
} from './mock-database';

export interface CreateMockFunctionDepsOptions {
  /** Pre-configured mock values or overrides */
  overrides?: Partial<FunctionDeps>;
}

const defaultLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as PinoLogger;

/**
 * Creates a mock FunctionDeps object for testing catalog function operations.
 */
export function createMockFunctionDeps(options: CreateMockFunctionDepsOptions = {}): FunctionDeps {
  const { overrides = {} } = options;

  return {
    productInstanceFunctionRepository: createMockProductInstanceFunctionRepository(),
    orderInstanceFunctionRepository: createMockOrderInstanceFunctionRepository(),
    optionRepository: createMockOptionRepository(),
    productRepository: createMockProductRepository(),
    logger: defaultLogger,
    ...overrides,
  };
}
