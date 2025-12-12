import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';

import { createMockCategoryEntity } from '../../../test/utils/mock-entities';
import { createMockTypeOrmRepository, type MockType } from '../../../test/utils/mock-typeorm';
import { CategoryEntity } from '../../entities/catalog/category.entity';

import { CategoryTypeOrmRepository } from './category.typeorm.repository';

describe('CategoryTypeOrmRepository', () => {
  let repository: CategoryTypeOrmRepository;
  let mockRepo: MockType<Repository<CategoryEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryTypeOrmRepository,
        {
          provide: getRepositoryToken(CategoryEntity),
          useValue: createMockTypeOrmRepository(),
        },
      ],
    }).compile();

    repository = module.get<CategoryTypeOrmRepository>(CategoryTypeOrmRepository);
    mockRepo = module.get(getRepositoryToken(CategoryEntity));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('should find active category', async () => {
      const entity = createMockCategoryEntity({ id: 'c1', name: 'Cat 1' });
      mockRepo.findOne?.mockResolvedValue(entity);

      const result = await repository.findById('c1');

      expect(result).toEqual(entity);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'c1', validTo: IsNull() } });
    });
  });

  describe('findAll', () => {
    it('should find all active categories', async () => {
      mockRepo.find?.mockResolvedValue([]);
      await repository.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { validTo: IsNull() } });
    });
  });

  describe('findByIds', () => {
    it('should find by multiple ids', async () => {
      mockRepo.find?.mockResolvedValue([]);
      await repository.findByIds(['p1', 'p2']);
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { id: expect.anything(), validTo: IsNull() } });
    });

    it('should return empty array when ids is empty', async () => {
      const result = await repository.findByIds([]);
      expect(result).toEqual([]);
      expect(mockRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('create, update, delete', async () => {
      const { id: _id, ...data } = createMockCategoryEntity({ name: 'Cat1' });
      await repository.create(data);
      expect(mockRepo.save).toHaveBeenCalled();

      mockRepo.findOne?.mockResolvedValue(createMockCategoryEntity({ id: '1' }));

      // update logic - mocking SCD2 behavior manually in update test below, here just verifying call arguments
      mockRepo.save?.mockResolvedValue(createMockCategoryEntity({ id: '1', name: 'Cat2' }));
      mockRepo.create?.mockReturnValue(createMockCategoryEntity({ id: '1', name: 'Cat2' }));

      await repository.update('1', { name: 'Cat2' });
      expect(mockRepo.update).toHaveBeenCalled();

      await repository.delete('1');
      expect(mockRepo.update).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should implement SCD2 update', async () => {
      const id = 'c1';
      const existing = createMockCategoryEntity({ id, name: 'Old' });
      mockRepo.findOne?.mockResolvedValue(existing);

      await repository.update(id, { name: 'New' });

      // Close old
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id, validTo: IsNull() },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ validTo: expect.any(Date) }),
      );

      // Create new
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id,
          name: 'New',
          validTo: null,
        }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should return null if not found', async () => {
      mockRepo.findOne?.mockResolvedValue(null);
      const result = await repository.update('c1', {});
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft delete', async () => {
      mockRepo.update?.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      const result = await repository.delete('c1');
      expect(result).toBe(true);
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'c1', validTo: IsNull() },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ validTo: expect.any(Date) }),
      );
    });
  });

  describe('removeServiceDisableFromAll', () => {
    it('should remove service id from active categories using transaction', async () => {
      const cat1 = createMockCategoryEntity({ id: 'c1', serviceDisable: ['s1', 's2'] });

      // The new implementation uses a transaction with:
      // 1. createQueryBuilder().where().andWhere().setParameter().getMany() to find affected
      // 2. repo.update() to close old versions
      // 3. createQueryBuilder().insert().into().values().execute() to insert new versions

      // Mock the transaction to capture the nested repo calls
      const mockNestedQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([cat1]),
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ identifiers: [], raw: [], generatedMaps: [] }),
      };

      const mockNestedRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(mockNestedQueryBuilder),
        update: jest.fn().mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] }),
        create: jest.fn().mockImplementation((data: unknown) => data),
      };

      // Override the manager.transaction mock to use our nested repo
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      mockRepo.manager!.transaction = jest.fn().mockImplementation(
        async (cb: (em: { getRepository: () => typeof mockNestedRepo }) => Promise<unknown>) => {
          return cb({ getRepository: () => mockNestedRepo });
        },
      );

      const count = await repository.removeServiceDisableFromAll('s1');

      expect(count).toBe(1);
      // Verify the query builder was used to find affected categories
      expect(mockNestedQueryBuilder.setParameter).toHaveBeenCalledWith('serviceId', 's1');
      expect(mockNestedQueryBuilder.getMany).toHaveBeenCalled();
      // Verify old version was closed
      expect(mockNestedRepo.update).toHaveBeenCalled();
      // Verify new version was inserted
      expect(mockNestedQueryBuilder.insert).toHaveBeenCalled();
      expect(mockNestedQueryBuilder.execute).toHaveBeenCalled();
    });

    it('should return 0 when no categories contain the serviceId', async () => {
      const mockNestedQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // No affected categories
      };

      const mockNestedRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(mockNestedQueryBuilder),
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      mockRepo.manager!.transaction = jest.fn().mockImplementation(
        async (cb: (em: { getRepository: () => typeof mockNestedRepo }) => Promise<unknown>) => {
          return cb({ getRepository: () => mockNestedRepo });
        },
      );

      const count = await repository.removeServiceDisableFromAll('nonexistent');

      expect(count).toBe(0);
    });
  });
});
