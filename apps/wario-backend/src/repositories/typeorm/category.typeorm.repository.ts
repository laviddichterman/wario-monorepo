import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { ICategory } from '@wcp/wario-shared';

import { CategoryEntity } from '../../entities/catalog/category.entity';
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

  async findByParentId(parentId: string | null): Promise<ICategory[]> {
    if (parentId === null) {
      return this.repo.find({ where: { parent_id: IsNull(), validTo: IsNull() } });
    }
    return this.repo.find({ where: { parent_id: parentId, validTo: IsNull() } });
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
    const result = await this.repo.update(
      { id, validTo: IsNull() },
      { validTo: new Date() },
    );
    return (result.affected ?? 0) > 0;
  }

  async removeServiceDisableFromAll(serviceId: string): Promise<number> {
    // For TypeORM with SCD2, we need to update all active categories
    const categories = await this.repo.find({ where: { validTo: IsNull() } });
    let count = 0;
    for (const cat of categories) {
      if (cat.serviceDisable.includes(serviceId)) {
        await this.update(cat.id, {
          serviceDisable: cat.serviceDisable.filter((s) => s !== serviceId),
        });
        count++;
      }
    }
    return count;
  }
}
