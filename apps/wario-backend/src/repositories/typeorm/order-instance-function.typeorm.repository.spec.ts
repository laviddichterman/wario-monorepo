import { createMockOrderInstanceFunctionEntity } from 'test/utils/mock-entities';
import { createMockTypeOrmRepository, type MockType } from 'test/utils/mock-typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';

import { OrderInstanceFunctionEntity } from 'src/infrastructure/database/typeorm/catalog/order-instance-function.entity';

import { OrderInstanceFunctionTypeOrmRepository } from './order-instance-function.typeorm.repository';

describe('OrderInstanceFunctionTypeOrmRepository', () => {
  let repository: OrderInstanceFunctionTypeOrmRepository;
  let mockRepo: MockType<Repository<OrderInstanceFunctionEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderInstanceFunctionTypeOrmRepository,
        {
          provide: getRepositoryToken(OrderInstanceFunctionEntity),
          useValue: createMockTypeOrmRepository(),
        },
      ],
    }).compile();

    repository = module.get<OrderInstanceFunctionTypeOrmRepository>(OrderInstanceFunctionTypeOrmRepository);
    mockRepo = module.get(getRepositoryToken(OrderInstanceFunctionEntity));
  });

  describe('crud', () => {
    it('findById, findAll', async () => {
      await repository.findById('f1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'f1', validTo: IsNull() } });
      await repository.findAll();
      expect(mockRepo.find).toHaveBeenCalled();
    });

    it('create, update, delete', async () => {
      // Create mock data
      const { id: _id, ...data } = createMockOrderInstanceFunctionEntity();

      await repository.create(data);
      expect(mockRepo.save).toHaveBeenCalled();

      mockRepo.findOne?.mockResolvedValue(createMockOrderInstanceFunctionEntity({ id: 'f1' }));

      await repository.update('f1', { name: 'Updated' });
      expect(mockRepo.update).toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalled();

      await repository.delete('f1');
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('save should route to create or update', async () => {
      // Create path
      const { id: _id, ...createData } = createMockOrderInstanceFunctionEntity({ name: 'New' });
      await repository.save(createData);
      expect(mockRepo.save).toHaveBeenCalled();

      // Update path
      mockRepo.findOne?.mockResolvedValue(createMockOrderInstanceFunctionEntity({ id: 'f1' }));
      mockRepo.create?.mockReturnValue(createMockOrderInstanceFunctionEntity({ id: 'f1' }));

      const spy = jest.spyOn(repository, 'update');

      const updatePayload = createMockOrderInstanceFunctionEntity({ id: 'f1', name: 'Updated' });
      await repository.save(updatePayload);
      expect(spy).toHaveBeenCalled();
    });
  });
});
