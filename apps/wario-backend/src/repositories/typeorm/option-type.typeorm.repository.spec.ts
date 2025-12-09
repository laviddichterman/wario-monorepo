/* eslint-disable @typescript-eslint/unbound-method */
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';

import { createMockOptionTypeEntity } from '../../../test/utils/mock-entities';
import { createMockTypeOrmRepository, type MockType } from '../../../test/utils/mock-typeorm';
import { OptionTypeEntity } from '../../entities/catalog/option-type.entity';

import { OptionTypeTypeOrmRepository } from './option-type.typeorm.repository';

// Combine query builders for mocking
// type MockQueryBuilder<T extends ObjectLiteral> = MockType<SelectQueryBuilder<T> & UpdateQueryBuilder<T> & InsertQueryBuilder<T>>;

describe('OptionTypeOrmRepository', () => {
  let repository: OptionTypeTypeOrmRepository;
  let mockRepo: MockType<Repository<OptionTypeEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptionTypeTypeOrmRepository,
        {
          provide: getRepositoryToken(OptionTypeEntity),
          useValue: createMockTypeOrmRepository<OptionTypeEntity>(),
        },
      ],
    }).compile();

    repository = module.get<OptionTypeTypeOrmRepository>(OptionTypeTypeOrmRepository);
    mockRepo = module.get(getRepositoryToken(OptionTypeEntity));
  });

  describe('finders', () => {
    it('findById, findAll', async () => {
      await repository.findById('ot1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'ot1', validTo: IsNull() } });

      await repository.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { validTo: IsNull() } });
    });
  });

  describe('mutation', () => {
    it('create, update, delete (SCD2)', async () => {
      const { id: _id, ...data } = createMockOptionTypeEntity({ name: 'A' });
      await repository.create(data);
      expect(mockRepo.save).toHaveBeenCalled();

      mockRepo.findOne?.mockResolvedValue(createMockOptionTypeEntity({ id: 'ot1' }));

      await repository.update('ot1', { name: 'B' });
      expect(mockRepo.update).toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalled();

      await repository.delete('ot1');
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('bulkCreate', async () => {
      const { id: _id, ...data } = createMockOptionTypeEntity();
      await repository.bulkCreate([data]);
      expect(mockRepo.insert).toHaveBeenCalled();
    });

    it('bulkUpdate shoud use transaction (update older + insert new)', async () => {
      const updates = [
        { id: 'ot1', data: { name: 'A2' } },
        { id: 'ot2', data: { name: 'B2' } },
      ];

      const existing1 = createMockOptionTypeEntity({ id: 'ot1', name: 'A' });
      const existing2 = createMockOptionTypeEntity({ id: 'ot2', name: 'B' });

      // Create a specific mock repo for the transaction scope
      const txRepo = createMockTypeOrmRepository<OptionTypeEntity>();
      if (!txRepo.find) {
        throw new Error('find is not defined');
      }
      txRepo.find.mockResolvedValue([existing1, existing2]);

      // Force getRepository to return our txRepo
      if (!mockRepo.manager) {
        throw new Error('manager is not defined');
      }
      (mockRepo.manager.getRepository as jest.Mock).mockReturnValue(txRepo);

      const count = await repository.bulkUpdate(updates);
      expect(mockRepo.manager.transaction).toHaveBeenCalled();
      // Verify repos used inside transaction
      expect(mockRepo.manager.getRepository).toHaveBeenCalledWith(OptionTypeEntity);

      // We expect find, update (close old), and insert (create new) on the transactional repo
      expect(txRepo.find).toHaveBeenCalled();
      expect(txRepo.update).toHaveBeenCalled(); // Close
      // insert new handled by queryBuilder
      if (!txRepo.createQueryBuilder) {
        throw new Error('createQueryBuilder is not defined');
      }
      const insertMock = txRepo.createQueryBuilder().insert;

      expect(insertMock).toHaveBeenCalled();

      expect(count).toBe(2);
    });
  });
});
