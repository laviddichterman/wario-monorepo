import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

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

  async save(instance: Omit<IProductInstance, 'id'> & { id?: string }): Promise<IProductInstance> {
    const now = new Date();

    if (instance.id) {
      await this.repo.update(
        { id: instance.id, validTo: IsNull() },
        { validTo: now },
      );
    }

    const entity = this.repo.create({
      ...instance,
      id: instance.id || crypto.randomUUID(),
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
