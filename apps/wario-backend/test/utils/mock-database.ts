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
    insertMany: jest.fn().mockImplementation((docs: T[]) =>
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
