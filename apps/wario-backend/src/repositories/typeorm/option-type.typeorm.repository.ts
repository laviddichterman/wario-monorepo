import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import type { IOptionType } from '@wcp/wario-shared';

import { OptionTypeEntity } from '../../entities/catalog/option-type.entity';
import type { IOptionTypeRepository } from '../interfaces/option-type.repository.interface';

@Injectable()
export class OptionTypeTypeOrmRepository implements IOptionTypeRepository {
  constructor(
    @InjectRepository(OptionTypeEntity)
    private readonly repo: Repository<OptionTypeEntity>,
  ) {}

  async findById(id: string): Promise<IOptionType | null> {
    return this.repo.findOne({ where: { id, validTo: IsNull() } });
  }

  async findAll(): Promise<IOptionType[]> {
    return this.repo.find({ where: { validTo: IsNull() } });
  }

  async create(optionType: Omit<IOptionType, 'id'>): Promise<IOptionType> {
    const now = new Date();
    const entity = this.repo.create({
      ...optionType,
      id: crypto.randomUUID(),
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async update(id: string, partial: Partial<Omit<IOptionType, 'id'>>): Promise<IOptionType | null> {
    const now = new Date();
    const existing = await this.repo.findOne({ where: { id, validTo: IsNull() } });
    if (!existing) {
      return null;
    }

    // Close old version
    await this.repo.update({ id, validTo: IsNull() }, { validTo: now });

    // Create new version
    const entity = this.repo.create({
      ...(existing as IOptionType),
      ...partial,
      id,
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async delete(id: string): Promise<boolean> {
    const now = new Date();
    const result = await this.repo.update({ id, validTo: IsNull() }, { validTo: now });
    return (result.affected ?? 0) > 0;
  }

  async bulkCreate(optionTypes: Omit<IOptionType, 'id'>[]): Promise<IOptionType[]> {
    if (!optionTypes.length) {
      return [];
    }

    const now = new Date();
    const entities = optionTypes.map((optionType) =>
      this.repo.create({
        ...optionType,
        id: crypto.randomUUID(),
        validFrom: now,
        validTo: null,
      }),
    );

    await this.repo.insert(entities);
    return entities;
  }

  async bulkUpdate(updates: Array<{ id: string; data: Partial<Omit<IOptionType, 'id'>> }>): Promise<number> {
    if (!updates.length) {
      return 0;
    }

    const now = new Date();
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(OptionTypeEntity);
      const ids = updates.map(({ id }) => id);
      const existing = await repo.find({ where: { id: In(ids), validTo: IsNull() } });

      if (!existing.length) {
        return 0;
      }

      const existingMap = new Map(existing.map((entity) => [entity.id, entity]));
      const newVersions = updates.reduce<OptionTypeEntity[]>((acc, { id, data }) => {
        const current = existingMap.get(id);
        if (!current) return acc;

        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = current;
        acc.push(
          repo.create({
            ...(rest as IOptionType),
            ...data,
            id,
            validFrom: now,
            validTo: null,
          }),
        );
        return acc;
      }, []);

      if (!newVersions.length) {
        return 0;
      }

      const idsToClose = newVersions.map((entity) => entity.id);
      await repo.update({ id: In(idsToClose), validTo: IsNull() }, { validTo: now });
      await repo.createQueryBuilder().insert().into(OptionTypeEntity).values(newVersions).execute();

      return newVersions.length;
    });
  }
}
