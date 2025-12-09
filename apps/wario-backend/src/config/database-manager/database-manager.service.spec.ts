import { getConnectionToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { DataSource } from 'typeorm';

import { createMockModelProvider } from '../../../test/utils/mock-database';
import { MockDataSourceProvider, type MockType } from '../../../test/utils/mock-typeorm';
import { DB_VERSION_REPOSITORY, type IDBVersionRepository } from '../../repositories/interfaces/db-version.repository.interface';
import { AppConfigService } from '../app-config.service';

import { DatabaseManagerService } from './database-manager.service';

// Mock package.json version
jest.mock('../../../package.json', () => ({
  version: '1.0.1',
}));

// Accessor type for private properties
type DatabaseManagerServicePrivates = {
  POSTGRES_MIGRATIONS: Record<string, unknown>;
  LEGACY_MONGOOSE_MIGRATIONS: Record<string, unknown>;
};

describe('DatabaseManagerService', () => {
  let service: DatabaseManagerService;
  let mockDbVersionRepo: MockType<IDBVersionRepository>;
  let mockDataSource: MockType<DataSource>;
  let mockAppConfigService: { usePostgres: boolean };

  const mockDbVersionRepoProvider = {
    provide: DB_VERSION_REPOSITORY,
    useValue: {
      get: jest.fn(),
      set: jest.fn(),
    },
  };

  const mockLoggerProvider = {
    provide: getLoggerToken(DatabaseManagerService.name),
    useValue: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  };

  const mockAppConfigServiceProvider = {
    provide: AppConfigService,
    useValue: {
      usePostgres: true,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseManagerService,
        mockDbVersionRepoProvider,
        mockLoggerProvider,
        mockAppConfigServiceProvider,
        MockDataSourceProvider,
        // Legacy Mongoose dependencies
        createMockModelProvider('DBVersionSchema'), // Even though we use repo now, DI might strict check?
        {
          provide: getConnectionToken(),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<DatabaseManagerService>(DatabaseManagerService);
    mockDbVersionRepo = module.get(DB_VERSION_REPOSITORY);
    mockDataSource = module.get(DataSource);
    mockAppConfigService = module.get(AppConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('PostgreSQL Mode', () => {
    beforeEach(() => {
      mockAppConfigService.usePostgres = true;
    });

    it('should run migrations when versions differ', async () => {
      // Setup: Current DB version is 1.0.0, Target is 1.0.1 (from mocked package.json)
      mockDbVersionRepo.get?.mockResolvedValue({ major: 1, minor: 0, patch: 0 });

      // Inject a fake migration
      const migrationSpy = jest.fn();
      (service as unknown as DatabaseManagerServicePrivates).POSTGRES_MIGRATIONS = {
        '1.0.0': [{ major: 1, minor: 0, patch: 1 }, migrationSpy],
      };

      await service.Bootstrap();

      expect(migrationSpy).toHaveBeenCalledWith(mockDataSource);
      expect(mockDbVersionRepo.set).toHaveBeenCalledWith({ major: 1, minor: 0, patch: 1 });
    });

    it('should handle no-op migrations when no explicit path exists', async () => {
      // Setup: Current DB version 0.0.0, Target 1.0.1
      mockDbVersionRepo.get?.mockResolvedValue({ major: 0, minor: 0, patch: 0 });

      // No migrations defined
      (service as unknown as DatabaseManagerServicePrivates).POSTGRES_MIGRATIONS = {};

      await service.Bootstrap();

      // Should jump directly to package version
      expect(mockDbVersionRepo.set).toHaveBeenCalledWith({ major: 1, minor: 0, patch: 1 });
    });
  });

  describe('Legacy Mongoose Mode', () => {
    beforeEach(() => {
      mockAppConfigService.usePostgres = false;
    });

    it('should run legacy migrations', async () => {
      // Test legacy path logic
      mockDbVersionRepo.get?.mockResolvedValue({ major: 0, minor: 6, patch: 8 });

      const legacySpy = jest.fn();
      (service as unknown as DatabaseManagerServicePrivates).LEGACY_MONGOOSE_MIGRATIONS = {
        '0.6.8': [{ major: 0, minor: 6, patch: 9 }, legacySpy],
      };

      await service.Bootstrap();

      expect(legacySpy).toHaveBeenCalled();
      expect(mockDbVersionRepo.set).toHaveBeenCalledWith({ major: 0, minor: 6, patch: 9 });
    });
  });
});
