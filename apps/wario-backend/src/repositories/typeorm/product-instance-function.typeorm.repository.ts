import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { IProductInstanceFunction } from '@wcp/wario-shared';

import { ProductInstanceFunctionEntity } from 'src/entities/catalog/product-instance-function.entity';
import type { IProductInstanceFunctionRepository } from '../interfaces/product-instance-function.repository.interface';

@Injectable()
export class ProductInstanceFunctionTypeOrmRepository implements IProductInstanceFunctionRepository {
  constructor(
    @InjectRepository(ProductInstanceFunctionEntity)
    private readonly repo: Repository<ProductInstanceFunctionEntity>,
  ) {}

  async findById(id: string): Promise<IProductInstanceFunction | null> {
    return this.repo.findOne({ where: { id, validTo: IsNull() } });
  }

  async findAll(): Promise<IProductInstanceFunction[]> {
    return this.repo.find({ where: { validTo: IsNull() } });
  }

  async create(fn: Omit<IProductInstanceFunction, 'id'>): Promise<IProductInstanceFunction> {
    const now = new Date();
    const entity = this.repo.create({
      ...fn,
      id: crypto.randomUUID(),
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    partial: Partial<Omit<IProductInstanceFunction, 'id'>>,
  ): Promise<IProductInstanceFunction | null> {
    const now = new Date();
    const existing = await this.repo.findOne({ where: { id, validTo: IsNull() } });
    if (!existing) {
      return null;
    }

    // Close old version
    await this.repo.update({ id, validTo: IsNull() }, { validTo: now });

    // Create new version
    const entity = this.repo.create({
      ...(existing as IProductInstanceFunction),
      ...partial,
      id,
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async save(fn: Omit<IProductInstanceFunction, 'id'> & { id?: string }): Promise<IProductInstanceFunction> {
    if (fn.id) {
      const result = await this.update(fn.id, fn);
      if (!result) {
        throw new Error(`ProductInstanceFunction ${fn.id} not found`);
      }
      return result;
    }
    return this.create(fn);
  }

  async delete(id: string): Promise<boolean> {
    const now = new Date();
    const result = await this.repo.update({ id, validTo: IsNull() }, { validTo: now });
    return (result.affected ?? 0) > 0;
  }
}
