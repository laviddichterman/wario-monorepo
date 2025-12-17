import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';

import { FulfillmentType } from '@wcp/wario-shared';

import { createMockFulfillmentEntity } from 'test/utils/mock-entities';
import { createMockTypeOrmRepository, type MockType } from 'test/utils/mock-typeorm';
import { FulfillmentEntity } from 'src/entities/settings/fulfillment.entity';

import { FulfillmentTypeOrmRepository } from './fulfillment.typeorm.repository';

describe('FulfillmentTypeOrmRepository', () => {
  let repository: FulfillmentTypeOrmRepository;
  let mockRepo: MockType<Repository<FulfillmentEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FulfillmentTypeOrmRepository,
        {
          provide: getRepositoryToken(FulfillmentEntity),
          useValue: createMockTypeOrmRepository(),
        },
      ],
    }).compile();

    repository = module.get<FulfillmentTypeOrmRepository>(FulfillmentTypeOrmRepository);
    mockRepo = module.get(getRepositoryToken(FulfillmentEntity));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('should find active fulfillment', async () => {
      const entity = createMockFulfillmentEntity({ id: 'f1' });
      mockRepo.findOne?.mockResolvedValue(entity);

      const result = await repository.findById('f1');
      expect(result).toEqual(entity);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'f1', validTo: IsNull() } });
    });
  });

  describe('findAll', () => {
    it('should find all active', async () => {
      await repository.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { validTo: IsNull() } });
    });
  });

  describe('findByService', () => {
    it('should find by service', async () => {
      await repository.findByService('pickup');
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { service: 'pickup', validTo: IsNull() } });
    });
  });

  describe('create', () => {
    it('should create new temporal entity', async () => {
      const { id: _id, ...input } = createMockFulfillmentEntity({ service: FulfillmentType.PickUp });
      const saved = createMockFulfillmentEntity({ ...input, id: 'uuid' });

      mockRepo.create?.mockReturnValue(saved);
      mockRepo.save?.mockResolvedValue(saved);

      const result = await repository.create(input);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ ...input, validTo: null }));
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });

  describe('update', () => {
    it('create, update, delete', async () => {
      const { id: _id, ...data } = createMockFulfillmentEntity({ service: FulfillmentType.PickUp });
      await repository.create(data);
      expect(mockRepo.save).toHaveBeenCalled();

      mockRepo.findOne?.mockResolvedValue(createMockFulfillmentEntity({ id: '1', service: FulfillmentType.PickUp }));

      // We manually mock the behavior for SCD2 inside repository.update
      // The implementation usually finds, then updates old validTo, then creates new.
      // We rely on the call checks.

      // Mock create/save for the new entity
      mockRepo.create?.mockReturnValue(createMockFulfillmentEntity({ id: '1', service: FulfillmentType.Delivery }));
      mockRepo.save?.mockResolvedValue(createMockFulfillmentEntity({ id: '1', service: FulfillmentType.Delivery }));

      await repository.update('1', { service: FulfillmentType.Delivery });
      expect(mockRepo.update).toHaveBeenCalled();

      await repository.delete('1');
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('should return null if not found', async () => {
      mockRepo.findOne?.mockResolvedValue(null);

      const result = await repository.update('f1', {});
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft delete', async () => {
      mockRepo.update?.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      const result = await repository.delete('f1');
      expect(result).toBe(true);
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'f1', validTo: IsNull() },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ validTo: expect.any(Date) }),
      );
    });
  });
});
