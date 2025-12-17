import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';

import { createMockProductInstanceFunctionEntity } from 'test/utils/mock-entities';
import { createMockTypeOrmRepository, type MockType } from 'test/utils/mock-typeorm';
import { ProductInstanceFunctionEntity } from 'src/entities/catalog/product-instance-function.entity';

import { ProductInstanceFunctionTypeOrmRepository } from './product-instance-function.typeorm.repository';

describe('ProductInstanceFunctionTypeOrmRepository', () => {
  let repository: ProductInstanceFunctionTypeOrmRepository;
  let mockRepo: MockType<Repository<ProductInstanceFunctionEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductInstanceFunctionTypeOrmRepository,
        {
          provide: getRepositoryToken(ProductInstanceFunctionEntity),
          useValue: createMockTypeOrmRepository(),
        },
      ],
    }).compile();

    repository = module.get<ProductInstanceFunctionTypeOrmRepository>(ProductInstanceFunctionTypeOrmRepository);
    mockRepo = module.get(getRepositoryToken(ProductInstanceFunctionEntity));
  });

  describe('crud', () => {
    it('findById, findAll', async () => {
      await repository.findById('f1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'f1', validTo: IsNull() } });
      await repository.findAll();
      expect(mockRepo.find).toHaveBeenCalled();
    });

    it('create, update, delete', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...data } = createMockProductInstanceFunctionEntity();

      await repository.create(data);
      expect(mockRepo.save).toHaveBeenCalled();

      mockRepo.findOne?.mockResolvedValue(createMockProductInstanceFunctionEntity({ id: 'f1' }));

      await repository.update('f1', { name: 'Updated' });
      expect(mockRepo.update).toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalled();

      await repository.delete('f1');
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('save should route to create or update', async () => {
      // Create path
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...createData } = createMockProductInstanceFunctionEntity({ name: 'New' });
      await repository.save(createData);
      expect(mockRepo.save).toHaveBeenCalled();

      // Update path
      mockRepo.findOne?.mockResolvedValue(createMockProductInstanceFunctionEntity({ id: 'f1' }));
      mockRepo.create?.mockReturnValue(createMockProductInstanceFunctionEntity({ id: 'f1' })); // for update flow

      const spy = jest.spyOn(repository, 'update');

      const updatePayload = createMockProductInstanceFunctionEntity({ id: 'f1', name: 'Updated' });
      await repository.save(updatePayload);
      expect(spy).toHaveBeenCalled();
    });
  });
});
