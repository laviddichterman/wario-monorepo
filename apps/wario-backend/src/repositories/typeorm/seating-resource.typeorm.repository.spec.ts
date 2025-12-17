import { createMockSeatingResourceEntity } from 'test/utils/mock-entities';
import { createMockTypeOrmRepository, type MockType } from 'test/utils/mock-typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { SeatingResourceEntity } from 'src/infrastructure/database/typeorm/settings/seating-resource.entity';

import { SeatingResourceTypeOrmRepository } from './seating-resource.typeorm.repository';

describe('SeatingResourceTypeOrmRepository', () => {
  let repository: SeatingResourceTypeOrmRepository;
  let mockRepo: MockType<Repository<SeatingResourceEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatingResourceTypeOrmRepository,
        {
          provide: getRepositoryToken(SeatingResourceEntity),
          useValue: createMockTypeOrmRepository(),
        },
      ],
    }).compile();

    repository = module.get<SeatingResourceTypeOrmRepository>(SeatingResourceTypeOrmRepository);
    mockRepo = module.get(getRepositoryToken(SeatingResourceEntity));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('should find by id', async () => {
      const entity = createMockSeatingResourceEntity({ id: 'sr1', name: 'Table 1' });
      mockRepo.findOne?.mockResolvedValue(entity);

      const result = await repository.findById('sr1');

      expect(result).toEqual(entity);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'sr1' } });
    });
  });

  describe('findAll', () => {
    it('should return all', async () => {
      mockRepo.find?.mockResolvedValue([]);
      await repository.findAll();
      expect(mockRepo.find).toHaveBeenCalled();
    });
  });

  describe('findBySectionId', () => {
    it('should find by sectionId', async () => {
      mockRepo.find?.mockResolvedValue([]);
      await repository.findBySectionId('sec1');
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { sectionId: 'sec1' } });
    });
  });

  describe('create', () => {
    it('should create and save with generated uuid', async () => {
      const { id: _id, ...input } = createMockSeatingResourceEntity({ name: 'Table 1', sectionId: 'sec1' });
      const saved = createMockSeatingResourceEntity({ ...input, id: 'uuid' });

      mockRepo.create?.mockReturnValue(saved);
      mockRepo.save?.mockResolvedValue(saved);

      const result = await repository.create(input);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining(input));
      expect(mockRepo.save).toHaveBeenCalledWith(saved);
      expect(result).toEqual(saved);
    });
  });

  describe('update', () => {
    it('should update if exists', async () => {
      mockRepo.findOne?.mockResolvedValue(createMockSeatingResourceEntity({ id: 'sr1' }));
      mockRepo.update?.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      await repository.update('sr1', { name: 'New Name' });

      expect(mockRepo.update).toHaveBeenCalledWith({ id: 'sr1' }, { name: 'New Name' });
    });

    it('should return null if not exists', async () => {
      mockRepo.findOne?.mockResolvedValue(null);
      const result = await repository.update('sr1', {});
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true if deleted', async () => {
      mockRepo.delete?.mockResolvedValue({ affected: 1, raw: [] });
      const result = await repository.delete('sr1');
      expect(result).toBe(true);
    });
  });
});
