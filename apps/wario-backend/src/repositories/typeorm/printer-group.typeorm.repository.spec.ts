import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';

import { type PrinterGroup } from '@wcp/wario-shared';

import { createMockPrinterGroupEntity } from 'test/utils/mock-entities';
import { createMockTypeOrmRepository, type MockType } from 'test/utils/mock-typeorm';
import { PrinterGroupEntity } from 'src/entities/settings/printer-group.entity';

import { PrinterGroupTypeOrmRepository } from './printer-group.typeorm.repository';

describe('PrinterGroupTypeOrmRepository', () => {
  let repository: PrinterGroupTypeOrmRepository;
  let mockRepo: MockType<Repository<PrinterGroupEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrinterGroupTypeOrmRepository,
        {
          provide: getRepositoryToken(PrinterGroupEntity),
          useValue: createMockTypeOrmRepository(),
        },
      ],
    }).compile();

    repository = module.get<PrinterGroupTypeOrmRepository>(PrinterGroupTypeOrmRepository);
    mockRepo = module.get(getRepositoryToken(PrinterGroupEntity));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('should find active version (validTo: IsNull)', async () => {
      const mockEntity = createMockPrinterGroupEntity({ id: 'pg1', name: 'Bar' });
      mockRepo.findOne?.mockResolvedValue(mockEntity);

      const result = await repository.findById('pg1');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'pg1', validTo: IsNull() },
      });
      expect(result).toEqual(mockEntity);
    });
  });

  describe('create', () => {
    it('should create new temporal entity', async () => {
      const input = { name: 'Kitchen', isExpo: false, singleItemPerTicket: false, externalIDs: [] };
      mockRepo.save?.mockImplementation((ent: PrinterGroupEntity) => {
        const saved = createMockPrinterGroupEntity({ ...(ent as PrinterGroup), rowId: 'row1' });
        return Promise.resolve(saved);
      });
      mockRepo.create?.mockImplementation((ent: PrinterGroupEntity) => ent);

      await repository.create(input);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...input,
          validTo: null,
        }),
      );
      const createdEntity = mockRepo.create?.mock.calls[0][0] as PrinterGroupEntity;
      expect(createdEntity.validFrom).toBeInstanceOf(Date);
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should implement SCD2: close old version and create new one', async () => {
      const id = 'pg1';
      const updateData = { name: 'Kitchen V2' };

      const existingEntity = createMockPrinterGroupEntity({
        id,
        name: 'Kitchen',
        rowId: 'row1',
        validFrom: new Date(),
        validTo: null,
        createdAt: new Date(),
        singleItemPerTicket: false,
        isExpo: false,
        externalIDs: [],
      });

      // Mock finding the existing active record
      mockRepo.findOne?.mockResolvedValue(existingEntity);

      // Mock save to return the new entity
      mockRepo.save?.mockImplementation((ent: PrinterGroupEntity) => {
        const saved = createMockPrinterGroupEntity({ ...(ent as PrinterGroup), rowId: 'row2' });
        return Promise.resolve(saved);
      });
      mockRepo.create?.mockImplementation((ent: PrinterGroupEntity) => ent);

      await repository.update(id, updateData);

      // Verify old version is closed
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id, validTo: IsNull() },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ validTo: expect.any(Date) }),
      );

      // Verify new version is created
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id,
          name: 'Kitchen V2', // Updated field
          validTo: null,
          // validFrom should be new Date()
        }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should return null if no active record found', async () => {
      mockRepo.findOne?.mockResolvedValue(null);
      const result = await repository.update('non-existent', {});
      expect(result).toBeNull();
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete by setting validTo', async () => {
      mockRepo.update?.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      const result = await repository.delete('pg1');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'pg1', validTo: IsNull() },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ validTo: expect.any(Date) }),
      );
      expect(result).toBe(true);
    });
  });
});
