import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { IProductInstanceFunction } from '@wcp/wario-shared';

import { ProductInstanceFunctionEntity } from '../../entities/catalog/product-instance-function.entity';
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

  async save(fn: Omit<IProductInstanceFunction, 'id'> & { id?: string }): Promise<IProductInstanceFunction> {
    const now = new Date();

    if (fn.id) {
      await this.repo.update(
        { id: fn.id, validTo: IsNull() },
        { validTo: now },
      );
    }

    const entity = this.repo.create({
      ...fn,
      id: fn.id || crypto.randomUUID(),
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
}
