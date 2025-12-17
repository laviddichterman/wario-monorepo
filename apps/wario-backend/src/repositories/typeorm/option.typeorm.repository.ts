import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import type { IOption } from '@wcp/wario-shared';

import { OptionEntity } from 'src/entities/catalog/option.entity';
import type { IOptionRepository } from '../interfaces/option.repository.interface';

@Injectable()
export class OptionTypeOrmRepository implements IOptionRepository {
  constructor(
    @InjectRepository(OptionEntity)
    private readonly repo: Repository<OptionEntity>,
  ) {}

  async findById(id: string): Promise<IOption | null> {
    return this.repo.findOne({ where: { id, validTo: IsNull() } });
  }

  async findAll(): Promise<IOption[]> {
    return this.repo.find({ where: { validTo: IsNull() } });
  }

  async findByIds(ids: string[]): Promise<IOption[]> {
    if (!ids.length) return [];
    return this.repo.find({ where: { id: In(ids), validTo: IsNull() } });
  }

  async create(option: Omit<IOption, 'id'>): Promise<IOption> {
    const now = new Date();
    const entity = this.repo.create({
      ...option,
      id: crypto.randomUUID(),
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async update(id: string, partial: Partial<Omit<IOption, 'id'>>): Promise<IOption | null> {
    const now = new Date();
    const existing = await this.repo.findOne({ where: { id, validTo: IsNull() } });
    if (!existing) {
      return null;
    }

    // Close old version
    await this.repo.update({ id, validTo: IsNull() }, { validTo: now });

    // Create new version
    const entity = this.repo.create({
      ...(existing as IOption),
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

  async bulkCreate(options: Omit<IOption, 'id'>[]): Promise<IOption[]> {
    if (!options.length) {
      return [];
    }

    const now = new Date();
    const entities = options.map((option) =>
      this.repo.create({
        ...option,
        id: crypto.randomUUID(),
        validFrom: now,
        validTo: null,
      }),
    );

    await this.repo.insert(entities);
    return entities;
  }

  async bulkUpdate(updates: Array<{ id: string; data: Partial<Omit<IOption, 'id'>> }>): Promise<number> {
    if (!updates.length) {
      return 0;
    }

    const now = new Date();
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(OptionEntity);
      const ids = updates.map(({ id }) => id);
      const existing = await repo.find({ where: { id: In(ids), validTo: IsNull() } });

      if (!existing.length) {
        return 0;
      }

      const existingMap = new Map(existing.map((entity) => [entity.id, entity]));
      const newVersions = updates.reduce<OptionEntity[]>((acc, { id, data }) => {
        const current = existingMap.get(id);
        if (!current) return acc;

        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = current;
        acc.push(
          repo.create({
            ...(rest as IOption),
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
      await repo.createQueryBuilder().insert().into(OptionEntity).values(newVersions).execute();

      return newVersions.length;
    });
  }

  async bulkDelete(ids: string[]): Promise<number> {
    const now = new Date();
    if (!ids.length) {
      return 0;
    }

    const result = await this.repo.update({ id: In(ids), validTo: IsNull() }, { validTo: now });
    return result.affected ?? 0;
  }

  async clearEnableField(productInstanceFunctionId: string): Promise<number> {
    const now = new Date();
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(OptionEntity);
      const options = await repo.find({ where: { validTo: IsNull() } });

      // Filter to only options that have the enable field set to this function
      const affected = options.filter((opt) => opt.enable === productInstanceFunctionId);

      if (!affected.length) {
        return 0;
      }

      const newVersions = affected.map((opt) => {
        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = opt;
        return repo.create({
          ...(rest as IOption),
          enable: null,
          validFrom: now,
          validTo: null,
        });
      });

      const idsToClose = affected.map((opt) => opt.id);
      await repo.update({ id: In(idsToClose), validTo: IsNull() }, { validTo: now });
      await repo.createQueryBuilder().insert().into(OptionEntity).values(newVersions).execute();

      return affected.length;
    });
  }
}
