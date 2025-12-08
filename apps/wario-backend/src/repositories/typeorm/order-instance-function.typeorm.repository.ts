import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { OrderInstanceFunction } from '@wcp/wario-shared';

import { OrderInstanceFunctionEntity } from '../../entities/catalog/order-instance-function.entity';
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

  async save(fn: Omit<OrderInstanceFunction, 'id'> & { id?: string }): Promise<OrderInstanceFunction> {
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
