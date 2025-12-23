/**
 * Database Test Utilities
 *
 * Provides utilities for mocking Mongoose models and MongoDB operations.
 */

import type { Provider } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';

/**
 * Creates a mock Mongoose model for testing.
 * Includes common query methods that return chainable promises.
 *
 * @example
 * ```ts
 * const mockOrderModel = createMockModel();
 * mockOrderModel.findById.mockReturnValue({
 *   exec: jest.fn().mockResolvedValue({ _id: '123', status: 'PENDING' }),
 * });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function createMockModel<T = unknown>() {
  const mockQuery = () => ({
    exec: jest.fn().mockResolvedValue(null),
    lean: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  });

  return {
    // Query methods
    find: jest.fn().mockReturnValue(mockQuery()),
    findOne: jest.fn().mockReturnValue(mockQuery()),
    findById: jest.fn().mockReturnValue(mockQuery()),
    findByIdAndUpdate: jest.fn().mockReturnValue(mockQuery()),
    findByIdAndDelete: jest.fn().mockReturnValue(mockQuery()),
    findOneAndUpdate: jest.fn().mockReturnValue(mockQuery()),
    findOneAndDelete: jest.fn().mockReturnValue(mockQuery()),
    updateOne: jest.fn().mockReturnValue(mockQuery()),
    updateMany: jest.fn().mockReturnValue(mockQuery()),
    deleteOne: jest.fn().mockReturnValue(mockQuery()),
    deleteMany: jest.fn().mockReturnValue(mockQuery()),
    countDocuments: jest.fn().mockReturnValue(mockQuery()),
    exists: jest.fn().mockReturnValue(mockQuery()),
    aggregate: jest.fn().mockReturnValue(mockQuery()),

    // Instance creation
    create: jest.fn().mockImplementation((doc: T) => Promise.resolve({ _id: 'mock-id', ...doc })),
    insertMany: jest
      .fn()
      .mockImplementation((docs: T[]) =>
        Promise.resolve(docs.map((doc: T, i: number) => ({ _id: `mock-id-${i.toString()}`, ...doc }))),
      ),

    // Constructor for new Model(doc)
    new: jest.fn().mockImplementation((doc: T) => ({
      ...doc,
      _id: 'mock-id',
      save: jest.fn().mockResolvedValue({ _id: 'mock-id', ...doc }),
      toObject: jest.fn().mockReturnValue({ _id: 'mock-id', ...doc }),
    })),
  };
}

/**
 * Creates a mock Mongoose model provider for NestJS testing module.
 *
 * @example
 * ```ts
 * const module = await Test.createTestingModule({
 *   providers: [
 *     OrderService,
 *     createMockModelProvider('WOrder'),
 *   ],
 * }).compile();
 * ```
 */
export function createMockModelProvider(modelName: string): Provider {
  return {
    provide: getModelToken(modelName),
    useFactory: () => createMockModel(),
  };
}

/**
 * Common model names used in wario-backend.
 */
export const ModelNames = {
  WOrder: 'WOrder',
  WCategory: 'WCategory',
  WProduct: 'WProduct',
  WProductInstance: 'WProductInstance',
  WOption: 'WOption',
  WOptionType: 'WOptionType',
  WModifierType: 'WModifierType',
  WPrinterGroup: 'WPrinterGroup',
  WSettings: 'WSettings',
  WStoreCredit: 'WStoreCredit',
  WStoreCreditTransaction: 'WStoreCreditTransaction',
  WFulfillment: 'WFulfillment',
  WProductInstanceFunction: 'WProductInstanceFunction',
  WOrderInstanceFunction: 'WOrderInstanceFunction',
  WQuery: 'WQuery',
} as const;

/**
 * Creates mock providers for all common models.
 *
 * @example
 * ```ts
 * const module = await Test.createTestingModule({
 *   providers: [
 *     SomeService,
 *     ...createAllMockModelProviders(),
 *   ],
 * }).compile();
 * ```
 */
export function createAllMockModelProviders(): Provider[] {
  return Object.values(ModelNames).map((name) => createMockModelProvider(name));
}

// ============================================================================
// Repository Mock Factories
// ============================================================================

import type { ICategoryRepository } from '../../src/repositories/interfaces/category.repository.interface';
import type { IOptionTypeRepository } from '../../src/repositories/interfaces/option-type.repository.interface';
import type { IOptionRepository } from '../../src/repositories/interfaces/option.repository.interface';
import type { IOrderInstanceFunctionRepository } from '../../src/repositories/interfaces/order-instance-function.repository.interface';
import type { IPrinterGroupRepository } from '../../src/repositories/interfaces/printer-group.repository.interface';
import type { IProductInstanceFunctionRepository } from '../../src/repositories/interfaces/product-instance-function.repository.interface';
import type { IProductInstanceRepository } from '../../src/repositories/interfaces/product-instance.repository.interface';
import type { IProductRepository } from '../../src/repositories/interfaces/product.repository.interface';

/**
 * Creates a mock ICategoryRepository with all methods stubbed.
 */
export function createMockCategoryRepository(): jest.Mocked<ICategoryRepository> {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    findByIds: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((cat) => Promise.resolve({ id: 'mock-cat-id', ...cat })),
    update: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(true),
    removeProductFromAll: jest.fn().mockResolvedValue(0),
    removeServiceDisableFromAll: jest.fn().mockResolvedValue(0),
  };
}

/**
 * Creates a mock IOptionTypeRepository with all methods stubbed.
 */
export function createMockOptionTypeRepository(): jest.Mocked<IOptionTypeRepository> {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((mt) => Promise.resolve({ id: 'mock-mt-id', ...mt })),
    update: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(true),
    bulkCreate: jest.fn().mockResolvedValue([]),
    bulkUpdate: jest.fn().mockResolvedValue(0),
  };
}

/**
 * Creates a mock IOptionRepository with all methods stubbed.
 */
export function createMockOptionRepository(): jest.Mocked<IOptionRepository> {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    findByIds: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((opt) => Promise.resolve({ id: 'mock-opt-id', ...opt })),
    update: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(true),
    bulkCreate: jest.fn().mockResolvedValue([]),
    bulkUpdate: jest.fn().mockResolvedValue(0),
    bulkDelete: jest.fn().mockResolvedValue(0),
    clearEnableField: jest.fn().mockResolvedValue(0),
  };
}

/**
 * Creates a mock IPrinterGroupRepository with all methods stubbed.
 */
export function createMockPrinterGroupRepository(): jest.Mocked<IPrinterGroupRepository> {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((pg) => Promise.resolve({ id: 'mock-pg-id', ...pg })),
    update: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Creates a mock IProductInstanceFunctionRepository with all methods stubbed.
 */
export function createMockProductInstanceFunctionRepository(): jest.Mocked<IProductInstanceFunctionRepository> {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((fn) => Promise.resolve({ id: 'mock-pif-id', ...fn })),
    update: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((fn: { id?: string }) => Promise.resolve({ id: fn.id ?? 'mock-pif-id', ...fn })),
    delete: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Creates a mock IOrderInstanceFunctionRepository with all methods stubbed.
 */
export function createMockOrderInstanceFunctionRepository(): jest.Mocked<IOrderInstanceFunctionRepository> {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((fn) => Promise.resolve({ id: 'mock-oif-id', ...fn })),
    update: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((fn: { id?: string }) => Promise.resolve({ id: fn.id ?? 'mock-oif-id', ...fn })),
    delete: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Creates a mock IProductRepository with all methods stubbed.
 */
export function createMockProductRepository(): jest.Mocked<IProductRepository> {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    findByQuery: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((prod) => Promise.resolve({ id: 'mock-prod-id', ...prod })),
    update: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(true),
    bulkCreate: jest.fn().mockResolvedValue([]),
    bulkUpdate: jest.fn().mockResolvedValue(0),
    bulkDelete: jest.fn().mockResolvedValue(0),
    removeModifierTypeFromAll: jest.fn().mockResolvedValue(0),
    clearModifierEnableField: jest.fn().mockResolvedValue(0),
    removeServiceDisableFromAll: jest.fn().mockResolvedValue(0),
    migratePrinterGroupForAllProducts: jest.fn().mockResolvedValue(0),
  };
}

/**
 * Creates a mock IProductInstanceRepository with all methods stubbed.
 */
export function createMockProductInstanceRepository(): jest.Mocked<IProductInstanceRepository> {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    findAllWithModifierOptions: jest.fn().mockResolvedValue([]),
    findByIds: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((pi) => Promise.resolve({ id: 'mock-pi-id', ...pi })),
    update: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(true),
    bulkCreate: jest.fn().mockResolvedValue([]),
    bulkUpdate: jest.fn().mockResolvedValue(0),
    bulkDelete: jest.fn().mockResolvedValue(0),
    removeModifierTypeSelectionsFromAll: jest.fn().mockResolvedValue(0),
    removeModifierOptionsFromAll: jest.fn().mockResolvedValue(0),
  };
}
