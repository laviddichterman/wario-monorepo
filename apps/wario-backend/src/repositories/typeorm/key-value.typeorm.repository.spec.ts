import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { createMockKeyValueEntity } from '../../../test/utils/mock-entities';
import { createMockTypeOrmRepository, type MockType } from '../../../test/utils/mock-typeorm';
import { KeyValueEntity } from '../../entities/settings/key-value.entity';

import { KeyValueTypeOrmRepository } from './key-value.typeorm.repository';

describe('KeyValueTypeOrmRepository', () => {
  let repository: KeyValueTypeOrmRepository;
  let mockRepo: MockType<Repository<KeyValueEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeyValueTypeOrmRepository,
        {
          provide: getRepositoryToken(KeyValueEntity),
          useValue: createMockTypeOrmRepository(),
        },
      ],
    }).compile();

    repository = module.get<KeyValueTypeOrmRepository>(KeyValueTypeOrmRepository);
    mockRepo = module.get(getRepositoryToken(KeyValueEntity));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByKey', () => {
    it('should return value if key exists', async () => {
      mockRepo.findOne?.mockResolvedValue(createMockKeyValueEntity({ key: 'foo', value: 'bar' }));

      const result = await repository.findByKey('foo');

      expect(result).toBe('bar');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { key: 'foo' } });
    });

    it('should return null if key does not exist', async () => {
      mockRepo.findOne?.mockResolvedValue(null);

      const result = await repository.findByKey('foo');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all entries mapped', async () => {
      mockRepo.find?.mockResolvedValue([
        createMockKeyValueEntity({ key: 'k1', value: 'v1' }),
        createMockKeyValueEntity({ key: 'k2', value: 'v2' }),
      ]);

      const result = await repository.findAll();

      expect(result).toEqual([
        { key: 'k1', value: 'v1' },
        { key: 'k2', value: 'v2' },
      ]);
    });
  });

  describe('set', () => {
    it('should update if key exists', async () => {
      mockRepo.findOne?.mockResolvedValue(createMockKeyValueEntity({ key: 'foo', value: 'old' }));

      await repository.set('foo', 'new');

      expect(mockRepo.update).toHaveBeenCalledWith({ key: 'foo' }, { value: 'new' });
      expect(mockRepo.insert).not.toHaveBeenCalled();
    });

    it('should insert if key does not exist', async () => {
      mockRepo.findOne?.mockResolvedValue(null);

      await repository.set('foo', 'new');

      expect(mockRepo.insert).toHaveBeenCalledWith({ key: 'foo', value: 'new' });
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('setAll', () => {
    it('should clear and insert entries', async () => {
      const entries = [{ key: 'k1', value: 'v1' }];

      await repository.setAll(entries);

      expect(mockRepo.clear).toHaveBeenCalled();
      expect(mockRepo.insert).toHaveBeenCalledWith(entries);
    });

    it('should clear and do nothing if entries empty', async () => {
      await repository.setAll([]);

      expect(mockRepo.clear).toHaveBeenCalled();
      expect(mockRepo.insert).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should return true if affected > 0', async () => {
      mockRepo.delete?.mockResolvedValue({ affected: 1, raw: [] });

      const result = await repository.delete('foo');

      expect(result).toBe(true);
      expect(mockRepo.delete).toHaveBeenCalledWith({ key: 'foo' });
    });

    it('should return false if affected is 0', async () => {
      mockRepo.delete?.mockResolvedValue({ affected: 0, raw: [] });

      const result = await repository.delete('foo');

      expect(result).toBe(false);
    });
  });
});
