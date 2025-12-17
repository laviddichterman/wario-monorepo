import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { OrderInstanceFunction } from '@wcp/wario-shared';

import { OrderInstanceFunctionEntity } from 'src/entities/catalog/order-instance-function.entity';
import type { IOrderInstanceFunctionRepository } from '../interfaces/order-instance-function.repository.interface';

@Injectable()
export class OrderInstanceFunctionTypeOrmRepository implements IOrderInstanceFunctionRepository {
  constructor(
    @InjectRepository(OrderInstanceFunctionEntity)
    private readonly repo: Repository<OrderInstanceFunctionEntity>,
  ) {}

  async findById(id: string): Promise<OrderInstanceFunction | null> {
    return this.repo.findOne({ where: { id, validTo: IsNull() } });
  }

  async findAll(): Promise<OrderInstanceFunction[]> {
    return this.repo.find({ where: { validTo: IsNull() } });
  }

  async create(fn: Omit<OrderInstanceFunction, 'id'>): Promise<OrderInstanceFunction> {
    const now = new Date();
    const entity = this.repo.create({
      ...fn,
      id: crypto.randomUUID(),
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async update(id: string, partial: Partial<Omit<OrderInstanceFunction, 'id'>>): Promise<OrderInstanceFunction | null> {
    const now = new Date();
    const existing = await this.repo.findOne({ where: { id, validTo: IsNull() } });
    if (!existing) {
      return null;
    }

    // Close old version
    await this.repo.update({ id, validTo: IsNull() }, { validTo: now });

    // Create new version
    const entity = this.repo.create({
      ...(existing as OrderInstanceFunction),
      ...partial,
      id,
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async save(fn: Omit<OrderInstanceFunction, 'id'> & { id?: string }): Promise<OrderInstanceFunction> {
    if (fn.id) {
      const result = await this.update(fn.id, fn);
      if (!result) {
        throw new Error(`OrderInstanceFunction ${fn.id} not found`);
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
