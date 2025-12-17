import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import type { IProductInstance } from '@wcp/wario-shared';

import { ProductInstanceEntity } from 'src/entities/catalog/product-instance.entity';
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

  // findByProductId removed - productId no longer exists in 2025 schema
  // Use instances array on IProduct instead
  async findByIds(ids: string[]): Promise<IProductInstance[]> {
    if (!ids.length) return [];
    return this.repo.find({ where: { id: In(ids), validTo: IsNull() } });
  }

  async findAllWithModifierOptions(optionIds: string[]): Promise<IProductInstance[]> {
    return this.repo
      .createQueryBuilder('pi')
      .where('pi.validTo IS NULL')
      .andWhere(`pi.modifiers @> ANY(ARRAY[:...optionIds]::jsonb[])`, {
        optionIds: optionIds.map((id) => JSON.stringify([{ options: [{ optionId: id }] }])),
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
    const result = await this.repo.update({ id, validTo: IsNull() }, { validTo: now });
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
    const result = await this.repo.update({ id: In(ids), validTo: IsNull() }, { validTo: now });
    return result.affected ?? 0;
  }

  /**
   * Removes all modifier selections for a given modifier type from all active product instances.
   * Uses SCD2: closes affected rows and inserts new versions with the modifier type removed.
   * Efficient: only fetches/updates rows that contain the modifierTypeId.
   */
  async removeModifierTypeSelectionsFromAll(mtId: string): Promise<number> {
    const now = new Date();
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ProductInstanceEntity);

      // Only fetch instances that contain this modifier type
      // Uses JSONB containment to check if any modifier entry has matching modifierTypeId
      const affected = await repo
        .createQueryBuilder('pi')
        .where('pi.validTo IS NULL')
        .andWhere(`pi.modifiers @> :pattern::jsonb`)
        .setParameter('pattern', JSON.stringify([{ modifierTypeId: mtId }]))
        .getMany();

      if (!affected.length) {
        return 0;
      }

      // Close old versions
      const idsToClose = affected.map((inst) => inst.id);
      await repo.update({ id: In(idsToClose), validTo: IsNull() }, { validTo: now });

      // Create new versions with the modifier type removed
      const newVersions = affected.map((inst) => {
        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = inst;
        return repo.create({
          ...(rest as IProductInstance),
          modifiers: inst.modifiers.filter((m) => m.modifierTypeId !== mtId),
          validFrom: now,
          validTo: null,
        });
      });

      await repo.createQueryBuilder().insert().into(ProductInstanceEntity).values(newVersions).execute();
      return affected.length;
    });
  }

  /**
   * Removes specific modifier options from all active product instances that use them.
   * Uses SCD2: closes affected rows and inserts new versions with the options removed.
   * Efficient: only fetches/updates rows that contain any of the specified optionIds.
   */
  async removeModifierOptionsFromAll(mtId: string, optionIds: string[]): Promise<number> {
    if (!optionIds.length) return 0;

    const now = new Date();
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ProductInstanceEntity);

      // Only fetch instances that contain any of the specified option IDs
      // Uses JSONB containment to check if any modifier entry has matching options
      const affected = await repo
        .createQueryBuilder('pi')
        .where('pi.validTo IS NULL')
        .andWhere(`pi.modifiers @> ANY(ARRAY[:...patterns]::jsonb[])`)
        .setParameter(
          'patterns',
          optionIds.map((optId) => JSON.stringify([{ modifierTypeId: mtId, options: [{ optionId: optId }] }])),
        )
        .getMany();

      if (!affected.length) {
        return 0;
      }

      // Close old versions
      const idsToClose = affected.map((inst) => inst.id);
      await repo.update({ id: In(idsToClose), validTo: IsNull() }, { validTo: now });

      // Create new versions with the specified options removed
      const optionIdSet = new Set(optionIds);
      const newVersions = affected.map((inst) => {
        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = inst;
        return repo.create({
          ...(rest as IProductInstance),
          modifiers: inst.modifiers.map((m) =>
            m.modifierTypeId === mtId ? { ...m, options: m.options.filter((o) => !optionIdSet.has(o.optionId)) } : m,
          ),
          validFrom: now,
          validTo: null,
        });
      });

      await repo.createQueryBuilder().insert().into(ProductInstanceEntity).values(newVersions).execute();
      return affected.length;
    });
  }
}
