/* eslint-disable @typescript-eslint/unbound-method */
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  type InsertQueryBuilder,
  IsNull,
  type ObjectLiteral,
  type Repository,
  type SelectQueryBuilder,
  type UpdateQueryBuilder,
} from 'typeorm';

import { createMockProductEntity } from '../../../test/utils/mock-entities';
import { createMockTypeOrmRepository, type MockType } from '../../../test/utils/mock-typeorm';
import { ProductEntity } from '../../entities/catalog/product.entity';

import { ProductTypeOrmRepository } from './product.typeorm.repository';

// Combine query builders for mocking
type MockQueryBuilder<T extends ObjectLiteral> = MockType<
  SelectQueryBuilder<T> & UpdateQueryBuilder<T> & InsertQueryBuilder<T>
>;

describe('ProductTypeOrmRepository', () => {
  let repository: ProductTypeOrmRepository;
  let mockRepo: MockType<Repository<ProductEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductTypeOrmRepository,
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: createMockTypeOrmRepository<ProductEntity>(),
        },
      ],
    }).compile();

    repository = module.get<ProductTypeOrmRepository>(ProductTypeOrmRepository);
    mockRepo = module.get(getRepositoryToken(ProductEntity));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById/findAll', () => {
    it('should find active', async () => {
      await repository.findById('p1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'p1', validTo: IsNull() } });

      await repository.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { validTo: IsNull() } });
    });
  });

  // findByCategoryId removed in 2025 schema - category_ids no longer on product

  describe('crud', () => {
    it('should create', async () => {
      // Create mock product data
      const { id: _id, ...prodData } = createMockProductEntity({ printerGroup: 'group1' });

      await repository.create(prodData);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should update (SCD2)', async () => {
      const existing = createMockProductEntity({ id: 'p1' });
      // Return as Entity (structure matches)
      mockRepo.findOne?.mockResolvedValue(existing);

      const updateData = { printerGroup: 'groupNew' }; // Partial update
      await repository.update('p1', updateData);

      expect(mockRepo.update).toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalled(); // Creates the new version
    });

    it('should delete', async () => {
      await repository.delete('p1');
      expect(mockRepo.update).toHaveBeenCalled(); // Soft delete via SCD2 likely updates validTo
    });
  });


  describe('bulk operations', () => {
    it('bulkUpdate', async () => {
      const updates = [{ id: '1', data: { printerGroup: 'groupBulk' } }];
      const existing = createMockProductEntity({ id: '1', printerGroup: 'groupOld' });

      const txRepo = createMockTypeOrmRepository<ProductEntity>();
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
      expect(txRepo.update).toHaveBeenCalled();
    });
  });
});
