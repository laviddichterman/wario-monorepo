/* eslint-disable @typescript-eslint/unbound-method */
import { createMockOrderEntity } from 'test/utils/mock-entities';
import { createMockTypeOrmRepository, type MockQueryBuilder, type MockType } from 'test/utils/mock-typeorm';

import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';

import { WFulfillmentStatus, WOrderStatus } from '@wcp/wario-shared';

import { OrderEntity } from 'src/infrastructure/database/typeorm/order/order.entity';

import { OrderTypeOrmRepository } from './order.typeorm.repository';

describe('OrderTypeOrmRepository', () => {
  let repository: OrderTypeOrmRepository;
  let mockRepo: MockType<Repository<OrderEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderTypeOrmRepository,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: createMockTypeOrmRepository<OrderEntity>(),
        },
      ],
    }).compile();

    repository = module.get<OrderTypeOrmRepository>(OrderTypeOrmRepository);
    mockRepo = module.get(getRepositoryToken(OrderEntity));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('finders', () => {
    it('should find by id', async () => {
      await repository.findById('o1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'o1' } });
    });

    it('should find by status', async () => {
      await repository.findByStatus(WOrderStatus.OPEN);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { status: WOrderStatus.OPEN },
      });
    });

    it('should find by date range', async () => {
      await repository.findByDateRange('2023-01-01', '2023-01-02');

      expect(mockRepo.find).toHaveBeenCalled();
    });

    it('findByThirdPartySquareIds should use query builder', async () => {
      if (mockRepo.createQueryBuilder === undefined) {
        throw new Error('createQueryBuilder is undefined');
      }
      const qb = mockRepo.createQueryBuilder();
      const ids = ['sq1'];
      await repository.findByThirdPartySquareIds(ids);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('order');

      expect(qb.where).toHaveBeenCalledWith(expect.stringContaining('thirdPartyInfo'), { squareIds: ids });

      expect(qb.getMany).toHaveBeenCalled();
    });

    it('findByThirdPartySquareIds should return empty if ids empty', async () => {
      const res = await repository.findByThirdPartySquareIds([]);
      expect(res).toEqual([]);
      expect(mockRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('locking', () => {
    it('acquireLock should update if null', async () => {
      mockRepo.update?.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      const mockOrder = createMockOrderEntity({ id: 'o1', locked: 'lock' });
      // We assume OrderEntity is compatible with WOrderInstance structure for this mock
      mockRepo.findOne?.mockResolvedValue(mockOrder);

      const res = await repository.acquireLock('o1', WOrderStatus.OPEN, 'lock');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'o1', status: WOrderStatus.OPEN, locked: IsNull() },
        { locked: 'lock' },
      );
      expect(res).toEqual(expect.objectContaining({ id: 'o1', locked: 'lock' }));
    });

    it('tryAcquireLock should update if null', async () => {
      mockRepo.update?.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      await repository.tryAcquireLock('o1', 'lock');
      expect(mockRepo.update).toHaveBeenCalledWith({ id: 'o1', locked: IsNull() }, { locked: 'lock' });
    });

    it('updateWithLock should use lock in where clause', async () => {
      mockRepo.update?.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      // With lock
      await repository.updateWithLock('o1', 'mylock', { status: WOrderStatus.COMPLETED });
      expect(mockRepo.update).toHaveBeenCalledWith({ id: 'o1', locked: 'mylock' }, { status: WOrderStatus.COMPLETED });

      // Without lock
      await repository.updateWithLock('o1', null, { status: WOrderStatus.COMPLETED });
      expect(mockRepo.update).toHaveBeenCalledWith({ id: 'o1', locked: IsNull() }, { status: WOrderStatus.COMPLETED });
    });

    it('lockReadyOrders', async () => {
      if (mockRepo.createQueryBuilder === undefined) {
        throw new Error('createQueryBuilder is undefined');
      }
      const qb = mockRepo.createQueryBuilder() as unknown as MockQueryBuilder<OrderEntity>;

      (qb.execute as jest.Mock).mockResolvedValue({ affected: 5, raw: [], generatedMaps: [] });

      const count = await repository.lockReadyOrders(
        WOrderStatus.OPEN,
        WFulfillmentStatus.CONFIRMED,
        '2023-01-01',
        1200,
        'mylock',
      );

      expect(count).toBe(5);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalled();

      expect(qb.update).toHaveBeenCalledWith(OrderEntity);

      expect(qb.set).toHaveBeenCalledWith({ locked: 'mylock' });

      expect(qb.where).toHaveBeenCalled();

      expect(qb.andWhere).toHaveBeenCalledTimes(4);

      expect(qb.execute).toHaveBeenCalled();
    });

    it('unlockAll', async () => {
      if (mockRepo.createQueryBuilder === undefined) {
        throw new Error('createQueryBuilder is undefined');
      }
      const qb = mockRepo.createQueryBuilder() as unknown as MockQueryBuilder<OrderEntity>;
      await repository.unlockAll();

      expect(qb.set).toHaveBeenCalledWith({ locked: null });

      expect(qb.where).toHaveBeenCalledWith('locked IS NOT NULL');
    });
  });

  describe('crud', () => {
    it('create, save, updateStatus, delete', async () => {
      // Use destructuring to remove 'id' for create payload
      const { id: _id, ...orderWithoutId } = createMockOrderEntity();

      await repository.create(orderWithoutId);
      expect(mockRepo.save).toHaveBeenCalled();

      const fullOrder = createMockOrderEntity();
      await repository.save(fullOrder);
      expect(mockRepo.save).toHaveBeenCalled();

      await repository.updateStatus('o1', WOrderStatus.COMPLETED);
      expect(mockRepo.update).toHaveBeenCalledWith({ id: 'o1' }, { status: WOrderStatus.COMPLETED });

      await repository.delete('o1');
      expect(mockRepo.delete).toHaveBeenCalledWith({ id: 'o1' });
    });
  });
});
