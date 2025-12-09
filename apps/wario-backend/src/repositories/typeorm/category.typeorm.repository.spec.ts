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

  describe('findByParentId', () => {
    it('should find by parent id', async () => {
      mockRepo.find?.mockResolvedValue([]);
      await repository.findByParentId('p1');
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { parent_id: 'p1', validTo: IsNull() } });
    });

    it('should find roots when parent id is null', async () => {
      mockRepo.find?.mockResolvedValue([]);
      await repository.findByParentId(null);
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { parent_id: IsNull(), validTo: IsNull() } });
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
        expect.objectContaining({ validTo: expect.any(Date) })
      );

      // Create new
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        id,
        name: 'New',
        validTo: null
      }));
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
        expect.objectContaining({ validTo: expect.any(Date) })
      );
    });
  });

  describe('removeServiceDisableFromAll', () => {
    it('should remove service id from active categories', async () => {
      const cat1 = createMockCategoryEntity({ id: 'c1', serviceDisable: ['s1', 's2'] });
      const cat2 = createMockCategoryEntity({ id: 'c2', serviceDisable: ['s2'] });

      mockRepo.find?.mockResolvedValue([cat1, cat2]);
      mockRepo.findOne?.mockResolvedValue(cat1); // For the update call internal lookup

      // We spy on update to verify calls
      const updateSpy = jest.spyOn(repository, 'update').mockResolvedValue(cat1);

      const count = await repository.removeServiceDisableFromAll('s1');

      expect(count).toBe(1);
      expect(updateSpy).toHaveBeenCalledWith('c1', {
        serviceDisable: ['s2']
      });
      // cat2 does not contain s1, so no update called for it
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });
  });
});
