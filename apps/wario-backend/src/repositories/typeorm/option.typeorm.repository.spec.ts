/* eslint-disable @typescript-eslint/unbound-method */
import { createMockOptionEntity } from 'test/utils/mock-entities';
import { createMockTypeOrmRepository, type MockType } from 'test/utils/mock-typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';

import { OptionEntity } from 'src/infrastructure/database/typeorm/catalog/option.entity';

import { OptionTypeOrmRepository } from './option.typeorm.repository';

// Combine query builders for mocking
// type MockQueryBuilder<T extends ObjectLiteral> = MockType<SelectQueryBuilder<T> & UpdateQueryBuilder<T> & InsertQueryBuilder<T>>;

describe('OptionTypeOrmRepository', () => {
  let repository: OptionTypeOrmRepository;
  let mockRepo: MockType<Repository<OptionEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptionTypeOrmRepository,
        {
          provide: getRepositoryToken(OptionEntity),
          useValue: createMockTypeOrmRepository<OptionEntity>(),
        },
      ],
    }).compile();

    repository = module.get<OptionTypeOrmRepository>(OptionTypeOrmRepository);
    mockRepo = module.get(getRepositoryToken(OptionEntity));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById/findAll/findByIds', () => {
    it('should find active', async () => {
      await repository.findById('o1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'o1', validTo: IsNull() } });

      await repository.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { validTo: IsNull() } });

      // findByModifierTypeId replaced with findByIds in 2025 schema
      await repository.findByIds(['o1', 'o2']);
      expect(mockRepo.find).toHaveBeenCalled();
    });
  });

  describe('crud', () => {
    it('create, update, delete', async () => {
      const { id: _id, ...data } = createMockOptionEntity({ displayName: 'Opt1' });
      await repository.create(data);
      expect(mockRepo.save).toHaveBeenCalled();

      mockRepo.findOne?.mockResolvedValue(createMockOptionEntity({ id: '1' }));

      await repository.update('1', { displayName: 'Opt2' });
      expect(mockRepo.update).toHaveBeenCalled();

      await repository.delete('1');
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('bulkCreate', async () => {
      const { id: _id, ...data } = createMockOptionEntity();
      await repository.bulkCreate([data]);
      expect(mockRepo.insert).toHaveBeenCalled();
    });

    it('bulkUpdate', async () => {
      const updates = [{ id: '1', data: { displayName: 'U' } }];
      const existing = createMockOptionEntity({ id: '1', displayName: 'Old' });

      const txRepo = createMockTypeOrmRepository<OptionEntity>();
      if (!txRepo.find) {
        throw new Error('find is not defined');
      }
      txRepo.find.mockResolvedValue([existing]);
      if (!mockRepo.manager) {
        throw new Error('manager is not defined');
      }
      (mockRepo.manager.getRepository as jest.Mock).mockReturnValue(txRepo);

      await repository.bulkUpdate(updates);
      if (!txRepo.createQueryBuilder) {
        throw new Error('createQueryBuilder is not defined');
      }
      expect(txRepo.createQueryBuilder().insert).toHaveBeenCalled();
      expect(txRepo.update).toHaveBeenCalled(); // Close
      // insert new handled by queryBuilder
      expect(txRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('bulk operations', () => {
    it('bulkDelete should update validTo', async () => {
      await repository.bulkDelete(['o1']);
      expect(mockRepo.update).toHaveBeenCalled();
    });
  });
});
