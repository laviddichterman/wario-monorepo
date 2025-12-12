import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import type { IProduct } from '@wcp/wario-shared';

import { ProductEntity } from '../../entities/catalog/product.entity';
import type { IProductRepository } from '../interfaces/product.repository.interface';

@Injectable()
export class ProductTypeOrmRepository implements IProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
  ) { }

  async findById(id: string): Promise<IProduct | null> {
    return this.repo.findOne({ where: { id, validTo: IsNull() } });
  }

  async findAll(): Promise<IProduct[]> {
    return this.repo.find({ where: { validTo: IsNull() } });
  }

  async create(product: Omit<IProduct, 'id'>): Promise<IProduct> {
    const now = new Date();
    const entity = this.repo.create({
      ...product,
      id: crypto.randomUUID(),
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async update(id: string, partial: Partial<Omit<IProduct, 'id'>>): Promise<IProduct | null> {
    const now = new Date();
    const existing = await this.repo.findOne({ where: { id, validTo: IsNull() } });
    if (!existing) {
      return null;
    }

    // Close old version
    await this.repo.update({ id, validTo: IsNull() }, { validTo: now });

    // Create new version
    const entity = this.repo.create({
      ...(existing as IProduct),
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

  async findByQuery(filter: Partial<IProduct>): Promise<IProduct[]> {
    return this.repo.find({ where: { ...filter, validTo: IsNull() } as unknown as Record<string, unknown> });
  }

  async bulkCreate(products: Omit<IProduct, 'id'>[]): Promise<IProduct[]> {
    if (!products.length) {
      return [];
    }

    const now = new Date();
    const entities = products.map((product) =>
      this.repo.create({
        ...product,
        id: crypto.randomUUID(),
        validFrom: now,
        validTo: null,
      }),
    );

    await this.repo.insert(entities);
    return entities;
  }

  async bulkUpdate(updates: Array<{ id: string; data: Partial<Omit<IProduct, 'id'>> }>): Promise<number> {
    if (!updates.length) {
      return 0;
    }

    const now = new Date();
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ProductEntity);
      const ids = updates.map(({ id }) => id);
      const existing = await repo.find({ where: { id: In(ids), validTo: IsNull() } });

      if (!existing.length) {
        return 0;
      }

      const existingMap = new Map(existing.map((entity) => [entity.id, entity]));
      const newVersions = updates.reduce<ProductEntity[]>((acc, { id, data }) => {
        const current = existingMap.get(id);
        if (!current) return acc;

        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = current;
        acc.push(
          repo.create({
            ...(rest as IProduct),
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
      await repo.createQueryBuilder().insert().into(ProductEntity).values(newVersions).execute();

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
   * Removes a modifier type from all active products.
   * Uses SCD2: closes affected rows and inserts new versions.
   * Efficient: only fetches/updates rows that contain the modifier type.
   */
  async removeModifierTypeFromAll(mtId: string): Promise<number> {
    const now = new Date();
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ProductEntity);

      // Only fetch products that contain this modifier type
      const affected = await repo
        .createQueryBuilder('prod')
        .where('prod.validTo IS NULL')
        .andWhere(`prod.modifiers @> :pattern::jsonb`)
        .setParameter('pattern', JSON.stringify([{ mtid: mtId }]))
        .getMany();

      if (!affected.length) {
        return 0;
      }

      // Close old versions
      const idsToClose = affected.map((prod) => prod.id);
      await repo.update({ id: In(idsToClose), validTo: IsNull() }, { validTo: now });

      // Create new versions with the modifier type removed
      const newVersions = affected.map((prod) => {
        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = prod;
        return repo.create({
          ...(rest as IProduct),
          modifiers: prod.modifiers.filter((m) => m.mtid !== mtId),
          validFrom: now,
          validTo: null,
        });
      });

      await repo.createQueryBuilder().insert().into(ProductEntity).values(newVersions).execute();
      return affected.length;
    });
  }

  async migratePrinterGroupForAllProducts(oldId: string, newId: string | null): Promise<number> {
    const now = new Date();
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ProductEntity);
      const products = await repo.find({ where: { validTo: IsNull(), printerGroup: oldId } });

      if (!products.length) {
        return 0;
      }

      const newVersions = products.map((prod) => {
        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = prod;
        return repo.create({
          ...(rest as IProduct),
          printerGroup: newId,
          validFrom: now,
          validTo: null,
        });
      });

      const idsToClose = products.map((prod) => prod.id);
      await repo.update({ id: In(idsToClose), validTo: IsNull() }, { validTo: now });
      await repo.createQueryBuilder().insert().into(ProductEntity).values(newVersions).execute();

      return products.length;
    });
  }

  /**
   * Clears the enable field from modifiers referencing a product instance function.
   * Uses SCD2: closes affected rows and inserts new versions.
   * Efficient: only fetches/updates rows that have a modifier with this enable field.
   */
  async clearModifierEnableField(productInstanceFunctionId: string): Promise<number> {
    const now = new Date();
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ProductEntity);

      // Only fetch products that have a modifier with this enable field
      const affected = await repo
        .createQueryBuilder('prod')
        .where('prod.validTo IS NULL')
        .andWhere(`prod.modifiers @> :pattern::jsonb`)
        .setParameter('pattern', JSON.stringify([{ enable: productInstanceFunctionId }]))
        .getMany();

      if (!affected.length) {
        return 0;
      }

      // Close old versions
      const idsToClose = affected.map((prod) => prod.id);
      await repo.update({ id: In(idsToClose), validTo: IsNull() }, { validTo: now });

      // Create new versions with the enable field cleared
      const newVersions = affected.map((prod) => {
        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = prod;
        return repo.create({
          ...(rest as IProduct),
          modifiers: prod.modifiers.map((m) => (m.enable === productInstanceFunctionId ? { ...m, enable: null } : m)),
          validFrom: now,
          validTo: null,
        });
      });

      await repo.createQueryBuilder().insert().into(ProductEntity).values(newVersions).execute();
      return affected.length;
    });
  }

  /**
   * Removes a service ID from serviceDisable arrays in all active products.
   * Checks both top-level serviceDisable and modifier-level serviceDisable.
   * Uses SCD2: closes affected rows and inserts new versions.
   * Efficient: only fetches/updates rows that contain the serviceId.
   */
  async removeServiceDisableFromAll(serviceId: string): Promise<number> {
    const now = new Date();
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ProductEntity);

      // Only fetch products that have the serviceId in:
      // 1. Top-level serviceDisable array, OR
      // 2. Any modifier's serviceDisable array
      const affected = await repo
        .createQueryBuilder('prod')
        .where('prod.validTo IS NULL')
        .andWhere(
          `(:serviceId = ANY(prod.serviceDisable) OR prod.modifiers @> :pattern::jsonb)`,
        )
        .setParameter('serviceId', serviceId)
        .setParameter('pattern', JSON.stringify([{ serviceDisable: [serviceId] }]))
        .getMany();

      if (!affected.length) {
        return 0;
      }

      // Close old versions
      const idsToClose = affected.map((prod) => prod.id);
      await repo.update({ id: In(idsToClose), validTo: IsNull() }, { validTo: now });

      // Create new versions with the serviceId removed from both places
      const newVersions = affected.map((prod) => {
        const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _createdAt, ...rest } = prod;
        return repo.create({
          ...(rest as IProduct),
          serviceDisable: prod.serviceDisable.filter((s) => s !== serviceId),
          modifiers: prod.modifiers.map((m) => ({
            ...m,
            serviceDisable: m.serviceDisable.filter((s) => s !== serviceId),
          })),
          validFrom: now,
          validTo: null,
        });
      });

      await repo.createQueryBuilder().insert().into(ProductEntity).values(newVersions).execute();
      return affected.length;
    });
  }
}
