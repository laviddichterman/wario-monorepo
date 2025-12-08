import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import type { IProductInstance } from '@wcp/wario-shared';

import { ProductInstanceEntity } from '../../entities/catalog/product-instance.entity';
import type { IProductInstanceRepository } from '../interfaces/product-instance.repository.interface';

@Injectable()
export class ProductInstanceTypeOrmRepository implements IProductInstanceRepository {
  constructor(
    @InjectRepository(ProductInstanceEntity)
    private readonly repo: Repository<ProductInstanceEntity>,
  ) {}

  async findById(id: string): Promise<IProductInstance | null> {
    return this.repo.findOne({ where: { id, validTo: IsNull() } });
  }

  async findAll(): Promise<IProductInstance[]> {
    return this.repo.find({ where: { validTo: IsNull() } });
  }

  async findByProductId(productId: string): Promise<IProductInstance[]> {
    return this.repo.find({ where: { productId, validTo: IsNull() } });
  }

  async findAllWithModifierOptions(optionIds: string[]): Promise<IProductInstance[]> {
    return this.repo
      .createQueryBuilder('pi')
      .where('pi.validTo IS NULL')
      .andWhere(`pi.modifiers @> ANY(ARRAY[:...optionIds]::jsonb[])`, {
        optionIds: optionIds.map(id => JSON.stringify([{ options: [{ optionId: id }] }]))
      })
      .getMany();
  }

  async create(instance: Omit<IProductInstance, 'id'>): Promise<IProductInstance> {
    const now = new Date();
    const entity = this.repo.create({
      ...instance,
      id: crypto.randomUUID(),
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async update(id: string, partial: Partial<Omit<IProductInstance, 'id'>>): Promise<IProductInstance | null> {
    const now = new Date();
    const existing = await this.repo.findOne({ where: { id, validTo: IsNull() } });
    if (!existing) {
      return null;
    }

    // Close old version
    await this.repo.update({ id, validTo: IsNull() }, { validTo: now });

    // Create new version
    const entity = this.repo.create({
      ...(existing as IProductInstance),
      ...partial,
      id,
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async delete(id: string): Promise<boolean> {
    const now = new Date();
    const result = await this.repo.update(
      { id, validTo: IsNull() },
      { validTo: now },
    );
    return (result.affected ?? 0) > 0;
  }

  async bulkCreate(instances: Omit<IProductInstance, 'id'>[]): Promise<IProductInstance[]> {
    if (!instances.length) {
      return [];
    }

    const now = new Date();
    const entities = instances.map((instance) =>
      this.repo.create({
        ...instance,
        id: crypto.randomUUID(),
        validFrom: now,
        validTo: null,
      }),
    );

    await this.repo.insert(entities);
    return entities;
  }

  async bulkUpdate(updates: Array<{ id: string; data: Partial<Omit<IProductInstance, 'id'>> }>): Promise<number> {
    if (!updates.length) {
      return 0;
    }

    const now = new Date();
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ProductInstanceEntity);
      const ids = updates.map(({ id }) => id);
      const existing = await repo.find({ where: { id: In(ids), validTo: IsNull() } });

      if (!existing.length) {
        return 0;
      }

      const existingMap = new Map(existing.map((entity) => [entity.id, entity]));
      const newVersions = updates.reduce<ProductInstanceEntity[]>((acc, { id, data }) => {
        const current = existingMap.get(id);
        if (!current) return acc;

        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = current;
        acc.push(
          repo.create({
            ...(rest as IProductInstance),
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
      await repo.createQueryBuilder().insert().into(ProductInstanceEntity).values(newVersions).execute();

      return newVersions.length;
    });
  }

  async bulkDelete(ids: string[]): Promise<number> {
    if (!ids.length) {
      return 0;
    }

    const now = new Date();
    const result = await this.repo.update(
      { id: In(ids), validTo: IsNull() },
      { validTo: now },
    );
    return result.affected ?? 0;
  }

  async deleteByProductIds(productIds: string[]): Promise<number> {
    if (!productIds.length) {
      return 0;
    }

    const now = new Date();
    const result = await this.repo.update(
      { productId: In(productIds), validTo: IsNull() },
      { validTo: now },
    );
    return result.affected ?? 0;
  }

  async removeModifierTypeSelectionsFromAll(mtId: string): Promise<number> {
    const now = new Date();
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ProductInstanceEntity);
      const instances = await repo.find({ where: { validTo: IsNull() } });

      // Filter to only instances that have the modifier type
      const affected = instances.filter((inst) =>
        inst.modifiers.some((m) => m.modifierTypeId === mtId),
      );

      if (!affected.length) {
        return 0;
      }

      const newVersions = affected.map((inst) => {
        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = inst;
        return repo.create({
          ...(rest as IProductInstance),
          modifiers: inst.modifiers.filter((m) => m.modifierTypeId !== mtId),
          validFrom: now,
          validTo: null,
        });
      });

      const idsToClose = affected.map((inst) => inst.id);
      await repo.update({ id: In(idsToClose), validTo: IsNull() }, { validTo: now });
      await repo.createQueryBuilder().insert().into(ProductInstanceEntity).values(newVersions).execute();

      return affected.length;
    });
  }

  async removeModifierOptionsFromAll(mtId: string, options: string[]): Promise<number> {
    const now = new Date();
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ProductInstanceEntity);
      const instances = await repo.find({ where: { validTo: IsNull() } });

      // Filter to only instances that have the modifier type
      const affected = instances.filter((inst) =>
        inst.modifiers.some((m) => m.modifierTypeId === mtId && m.options.some((o) => options.includes(o.optionId))),
      );

      if (!affected.length) {
        return 0;
      }

      const newVersions = affected.map((inst) => {
        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = inst;
        return repo.create({
          ...(rest as IProductInstance),
          modifiers: inst.modifiers.map((m) => m.modifierTypeId === mtId ? { ...m, options: m.options.filter((o) => !options.includes(o.optionId)) } : m),
          validFrom: now,
          validTo: null,
        });
      });

      const idsToClose = affected.map((inst) => inst.id);
      await repo.update({ id: In(idsToClose), validTo: IsNull() }, { validTo: now });
      await repo.createQueryBuilder().insert().into(ProductInstanceEntity).values(newVersions).execute();

      return affected.length;
    });
  }
}
