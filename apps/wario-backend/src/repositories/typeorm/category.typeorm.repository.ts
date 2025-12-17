import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import type { ICategory } from '@wcp/wario-shared';

import { CategoryEntity } from 'src/infrastructure/database/typeorm/catalog/category.entity';

import type { ICategoryRepository } from '../interfaces/category.repository.interface';

@Injectable()
export class CategoryTypeOrmRepository implements ICategoryRepository {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly repo: Repository<CategoryEntity>,
  ) {}

  async findById(id: string): Promise<ICategory | null> {
    return this.repo.findOne({ where: { id, validTo: IsNull() } });
  }

  async findAll(): Promise<ICategory[]> {
    return this.repo.find({ where: { validTo: IsNull() } });
  }

  async findByIds(ids: string[]): Promise<ICategory[]> {
    if (!ids.length) return [];
    return this.repo.find({ where: { id: In(ids), validTo: IsNull() } });
  }

  async create(category: Omit<ICategory, 'id'>): Promise<ICategory> {
    const now = new Date();
    const entity = this.repo.create({
      ...category,
      id: crypto.randomUUID(),
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async update(id: string, partial: Partial<Omit<ICategory, 'id'>>): Promise<ICategory | null> {
    const now = new Date();
    const existing = await this.repo.findOne({ where: { id, validTo: IsNull() } });
    if (!existing) {
      return null;
    }

    // Close old version
    await this.repo.update({ id, validTo: IsNull() }, { validTo: now });

    // Create new version
    const entity = this.repo.create({
      ...(existing as ICategory),
      ...partial,
      id,
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async delete(id: string): Promise<boolean> {
    // Soft delete: set validTo on current version
    const result = await this.repo.update({ id, validTo: IsNull() }, { validTo: new Date() });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Removes a service ID from the serviceDisable array of all active categories.
   * Uses SCD2: closes affected rows and inserts new versions with the item removed.
   * Efficient: only fetches/updates rows that contain the serviceId.
   */
  async removeServiceDisableFromAll(serviceId: string): Promise<number> {
    const now = new Date();

    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(CategoryEntity);

      // Only fetch categories that contain this serviceId
      const affected = await repo
        .createQueryBuilder('cat')
        .where('cat.validTo IS NULL')
        .andWhere(':serviceId = ANY(cat.serviceDisable)')
        .setParameter('serviceId', serviceId)
        .getMany();

      if (!affected.length) return 0;

      // Close old versions
      const idsToClose = affected.map((c) => c.id);
      await repo.update({ id: In(idsToClose), validTo: IsNull() }, { validTo: now });

      // Create new versions with the serviceId removed
      const newVersions = affected.map((cat) => {
        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = cat;
        return repo.create({
          ...(rest as ICategory),
          serviceDisable: cat.serviceDisable.filter((s) => s !== serviceId),
          validFrom: now,
          validTo: null,
        });
      });

      await repo.createQueryBuilder().insert().into(CategoryEntity).values(newVersions).execute();
      return affected.length;
    });
  }

  /**
   * Removes product IDs from the products array of all active categories.
   * Uses SCD2: closes affected rows and inserts new versions with items removed.
   * Efficient: only fetches/updates rows that have overlap with productIds.
   */
  async removeProductFromAll(productIds: string[]): Promise<number> {
    if (!productIds.length) return 0;
    const now = new Date();

    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(CategoryEntity);

      // Only fetch categories that have overlap with the productIds
      const affected = await repo
        .createQueryBuilder('cat')
        .where('cat.validTo IS NULL')
        .andWhere('cat.products && :productIds::text[]')
        .setParameter('productIds', productIds)
        .getMany();

      if (!affected.length) return 0;

      // Close old versions
      const idsToClose = affected.map((c) => c.id);
      await repo.update({ id: In(idsToClose), validTo: IsNull() }, { validTo: now });

      // Create new versions with the productIds removed
      const productIdSet = new Set(productIds);
      const newVersions = affected.map((cat) => {
        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = cat;
        return repo.create({
          ...(rest as ICategory),
          products: cat.products.filter((p) => !productIdSet.has(p)),
          validFrom: now,
          validTo: null,
        });
      });

      await repo.createQueryBuilder().insert().into(CategoryEntity).values(newVersions).execute();
      return affected.length;
    });
  }
}
