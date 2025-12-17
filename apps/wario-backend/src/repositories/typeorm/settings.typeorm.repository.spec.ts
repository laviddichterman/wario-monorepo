/* eslint-disable @typescript-eslint/unbound-method */
import { createMockSettingsEntity } from 'test/utils/mock-entities';
import { createMockTypeOrmRepository, MockDataSourceProvider, type MockType } from 'test/utils/mock-typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, type EntityManager, type Repository } from 'typeorm';

import { SettingsEntity } from 'src/entities/settings/settings.entity';

import { SettingsTypeOrmRepository } from './settings.typeorm.repository';

describe('SettingsTypeOrmRepository', () => {
  let repository: SettingsTypeOrmRepository;
  let mockRepo: MockType<Repository<SettingsEntity>>;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        SettingsTypeOrmRepository,
        {
          provide: getRepositoryToken(SettingsEntity),
          useValue: createMockTypeOrmRepository(),
        },
        MockDataSourceProvider,
      ],
    }).compile();

    repository = moduleRef.get<SettingsTypeOrmRepository>(SettingsTypeOrmRepository);
    mockRepo = moduleRef.get(getRepositoryToken(SettingsEntity));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('get', () => {
    it('should return the first settings row', async () => {
      const mockSettings = createMockSettingsEntity({ LOCATION_NAME: 'Test' });
      mockRepo.find?.mockResolvedValue([mockSettings]);

      const result = await repository.get();

      expect(result).toEqual(mockSettings);
      expect(mockRepo.find).toHaveBeenCalledWith({ take: 1 });
    });

    it('should return null if no settings exist', async () => {
      mockRepo.find?.mockResolvedValue([]);

      const result = await repository.get();

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should use transaction to clear and save', async () => {
      const settings = createMockSettingsEntity({ LOCATION_NAME: 'Test' });
      const { rowId: _rowId, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = settings; // Simulate input without auto-generated fields

      const dataSource = moduleRef.get(DataSource);
      const mockDataSource = dataSource as unknown as MockType<DataSource>;

      // Mock transaction execution
      (mockDataSource.transaction as jest.Mock).mockImplementation((cb: (em: EntityManager) => Promise<unknown>) => {
        return cb(mockRepo.manager as EntityManager);
      });

      // We don't need getRepository logic because implementation uses manager directly
      // (mockRepo.manager!.getRepository as jest.Mock).mockReturnValue(txRepo);

      await repository.save(input);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      if (!mockRepo.manager) {
        throw new Error('Manager is not defined');
      }

      // Implementation uses manager.clear(SettingsEntity)
      expect(mockRepo.manager.clear).toHaveBeenCalledWith(SettingsEntity);

      // Implementation uses manager.save(entity)
      expect(mockRepo.manager.save).toHaveBeenCalledWith(expect.objectContaining(input));
    });
  });
});
