import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { IProduct } from '@wcp/wario-shared';

import { ProductEntity } from '../../entities/catalog/product.entity';
import type { IProductRepository } from '../interfaces/product.repository.interface';

@Injectable()
export class ProductTypeOrmRepository implements IProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
  ) {}

  async findById(id: string): Promise<IProduct | null> {
    return this.repo.findOne({ where: { id, validTo: IsNull() } });
  }

  async findAll(): Promise<IProduct[]> {
    return this.repo.find({ where: { validTo: IsNull() } });
  }

  async findByCategoryId(categoryId: string): Promise<IProduct[]> {
    // category_ids is a text array, use array contains
    return this.repo
      .createQueryBuilder('product')
      .where('product.validTo IS NULL')
      .andWhere(':categoryId = ANY(product.category_ids)', { categoryId })
      .getMany();
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
    const result = await this.repo.update(
      { id, validTo: IsNull() },
      { validTo: new Date() },
    );
    return (result.affected ?? 0) > 0;
  }

  async removeCategoryFromAll(categoryId: string): Promise<number> {
    // For TypeORM with SCD2, we need to update all active products
    const products = await this.repo.find({ where: { validTo: IsNull() } });
    let count = 0;
    for (const prod of products) {
      if (prod.category_ids.includes(categoryId)) {
        await this.update(prod.id, {
          category_ids: prod.category_ids.filter((c) => c !== categoryId),
        });
        count++;
      }
    }
    return count;
  }
}
