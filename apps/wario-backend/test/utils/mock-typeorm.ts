/**
 * TypeORM Test Utilities
 *
 * Provides utilities for mocking TypeORM repositories, DataSources, and QueryRunners.
 */

import type { Provider } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { DataSource, type EntityManager, type QueryRunner, type Repository, type SelectQueryBuilder, type UpdateQueryBuilder } from 'typeorm';

export type MockType<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [P in keyof T]?: T[P] extends (...args: any[]) => any
  ? jest.Mock<ReturnType<T[P]>, Parameters<T[P]>>
  : T[P];
};

export type MockQueryBuilder<T extends object> = MockType<SelectQueryBuilder<T> & UpdateQueryBuilder<T>>;

/**
 * Creates a mock TypeORM Repository.
 */
export function createMockTypeOrmRepository<T extends object = object>(): MockType<Repository<T>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryBuilderMock: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    execute: jest.fn().mockResolvedValue({ identifiers: [], raw: [], generatedMaps: [] }),
    delete: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(), // For update queries
  };

  const mockManager = {
    transaction: jest.fn().mockImplementation((cb: (em: unknown) => Promise<unknown>) => cb(mockManager)),
    getRepository: jest.fn().mockImplementation(() => createMockTypeOrmRepository()),
    save: jest.fn().mockImplementation((entity: unknown) => Promise.resolve(entity)),
    create: jest.fn().mockImplementation((entityOrClass: unknown, data?: unknown) => data || entityOrClass),
    update: jest.fn().mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] }),
    delete: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
    clear: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
  };

  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    save: jest.fn().mockImplementation((entity: T) => Promise.resolve({ id: 'mock-id', ...entity })),
    create: jest.fn().mockImplementation((entity: T) => entity),
    update: jest.fn().mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] }),
    delete: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
    softDelete: jest.fn().mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] }),
    restore: jest.fn().mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] }),
    count: jest.fn().mockResolvedValue(0),
    clear: jest.fn().mockResolvedValue(undefined),
    insert: jest.fn().mockResolvedValue({ identifiers: [{ id: 'mock-id' }], raw: [], generatedMaps: [] }),
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock as unknown as SelectQueryBuilder<T>),
    manager: mockManager as unknown as EntityManager,
  };
}

/**
 * Creates a mock TypeORM DataSource.
 */
export function createMockDataSource(): MockType<DataSource> {
  const queryRunnerMock: Partial<QueryRunner> = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: createMockTypeOrmRepository() as unknown as EntityManager, // Mock manager as a repo for simple calls
    query: jest.fn().mockResolvedValue([]),
  };

  return {
    isInitialized: true,
    initialize: jest.fn().mockResolvedValue(this),
    destroy: jest.fn().mockResolvedValue(this),
    createQueryRunner: jest.fn().mockReturnValue(queryRunnerMock),
    transaction: jest.fn().mockImplementation(async (cb: (em: unknown) => Promise<unknown>) => {
      // Create a mock entityManager that is passed to the callback
      const mockManager = {
        save: jest.fn().mockImplementation((entity: unknown) => Promise.resolve(entity)),
        update: jest.fn().mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] }),
        remove: jest.fn().mockResolvedValue(undefined),
        count: jest.fn().mockResolvedValue(0),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        query: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation((entityOrClass: unknown, data?: unknown) => data || entityOrClass),
        insert: jest.fn().mockResolvedValue({ identifiers: [], raw: [], generatedMaps: [] }),
        getRepository: jest.fn().mockImplementation(() => createMockTypeOrmRepository()),
        clear: jest.fn().mockResolvedValue(undefined),
      };
      return cb(mockManager);
    }),
    getRepository: jest.fn().mockImplementation(() => createMockTypeOrmRepository()),
  };
}

/**
 * Creates a mock TypeORM Repository provider.
 */
export function createMockRepositoryProvider(entity: EntityClassOrSchema): Provider {
  return {
    provide: getRepositoryToken(entity),
    useValue: createMockTypeOrmRepository(),
  };
}

/**
 * Mock provider for DataSource
 */
export const MockDataSourceProvider: Provider = {
  provide: DataSource,
  useFactory: createMockDataSource,
};
