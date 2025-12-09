import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { createMockDbVersionEntity } from '../../../test/utils/mock-entities';
import { createMockTypeOrmRepository, type MockType } from '../../../test/utils/mock-typeorm';
import { DBVersionEntity } from '../../entities/settings/db-version.entity';

import { DBVersionTypeOrmRepository } from './db-version.typeorm.repository';

describe('DBVersionTypeOrmRepository', () => {
  let repository: DBVersionTypeOrmRepository;
  let mockRepo: MockType<Repository<DBVersionEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DBVersionTypeOrmRepository,
        {
          provide: getRepositoryToken(DBVersionEntity),
          useValue: createMockTypeOrmRepository(),
        },
      ],
    }).compile();

    repository = module.get<DBVersionTypeOrmRepository>(DBVersionTypeOrmRepository);
    mockRepo = module.get(getRepositoryToken(DBVersionEntity));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('get', () => {
    it('should return null if no version exists', async () => {
      mockRepo.findOne?.mockResolvedValue(null);

      const result = await repository.get();

      expect(result).toBeNull();
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: {} });
    });

    it('should return the version if it exists', async () => {
      const mockVersion = createMockDbVersionEntity({ major: 1, minor: 2, patch: 3 });
      mockRepo.findOne?.mockResolvedValue(mockVersion);

      const result = await repository.get();

      expect(result).toEqual({ major: 1, minor: 2, patch: 3 });
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: {} });
    });
  });

  describe('set', () => {
    it('should clear existing version and save new one', async () => {
      const newVersion = { major: 2, minor: 0, patch: 0 };

      await repository.set(newVersion);

      expect(mockRepo.clear).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalledWith(newVersion);
    });
  });
});
