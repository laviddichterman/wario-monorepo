/* eslint-disable @typescript-eslint/no-non-null-assertion */
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

import { createMockProductInstanceEntity } from '../../../test/utils/mock-entities';
import { createMockTypeOrmRepository, type MockType } from '../../../test/utils/mock-typeorm';
import { ProductInstanceEntity } from '../../entities/catalog/product-instance.entity';

import { ProductInstanceTypeOrmRepository } from './product-instance.typeorm.repository';

// Combine query builders for mocking
type MockQueryBuilder<T extends ObjectLiteral> = MockType<
  SelectQueryBuilder<T> & UpdateQueryBuilder<T> & InsertQueryBuilder<T>
>;

describe('ProductInstanceTypeOrmRepository', () => {
  let repository: ProductInstanceTypeOrmRepository;
  let mockRepo: MockType<Repository<ProductInstanceEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductInstanceTypeOrmRepository,
        {
          provide: getRepositoryToken(ProductInstanceEntity),
          useValue: createMockTypeOrmRepository<ProductInstanceEntity>(),
        },
      ],
    }).compile();

    repository = module.get<ProductInstanceTypeOrmRepository>(ProductInstanceTypeOrmRepository);
    mockRepo = module.get(getRepositoryToken(ProductInstanceEntity));
  });

  describe('finders', () => {
    it('findById, findAll, findByIds', async () => {
      await repository.findById('pi1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'pi1', validTo: IsNull() } });

      await repository.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { validTo: IsNull() } });

      // findByProductId replaced with findByIds in 2025 schema
      await repository.findByIds(['pi1', 'pi2']);
      expect(mockRepo.find).toHaveBeenCalled();
    });

    it('findAllWithModifierOptions should use jsonb query', async () => {
      const qb = mockRepo.createQueryBuilder!() as unknown as MockQueryBuilder<ProductInstanceEntity>;
      await repository.findAllWithModifierOptions(['opt1', 'opt2']);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('pi');
      expect(qb.where).toHaveBeenCalledWith('pi.validTo IS NULL');
      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('pi.modifiers @> ANY'), expect.any(Object));
      expect(qb.getMany).toHaveBeenCalled();
    });
  });

  describe('mutation', () => {
    it('create, update, delete (SCD2)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...data } = createMockProductInstanceEntity();

      await repository.create(data);
      expect(mockRepo.save).toHaveBeenCalled();

      mockRepo.findOne?.mockResolvedValue(createMockProductInstanceEntity({ id: 'pi1' }));

      await repository.update('pi1', {});
      expect(mockRepo.update).toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalled();

      await repository.delete('pi1');
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('bulkCreate', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...data } = createMockProductInstanceEntity();
      await repository.bulkCreate([data]);
      expect(mockRepo.insert).toHaveBeenCalled();
    });

    it('bulkUpdate should use transaction', async () => {
      const updates = [{ id: 'pi1', data: {} }];
      const existing = createMockProductInstanceEntity({ id: 'pi1' });

      const txRepo = createMockTypeOrmRepository<ProductInstanceEntity>();
      txRepo.find!.mockResolvedValue([existing]);
      (mockRepo.manager!.getRepository as jest.Mock).mockReturnValue(txRepo);

      await repository.bulkUpdate(updates);

      expect(txRepo.find).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(txRepo.createQueryBuilder!().insert).toHaveBeenCalled();
      expect(txRepo.update).toHaveBeenCalled();
    });
  });
});
