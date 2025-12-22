import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { OrderInstanceFunction } from '@wcp/wario-shared';

import { toPartialUpdateQuery } from '../../utils/partial-update';
import type { IOrderInstanceFunctionRepository } from '../interfaces/order-instance-function.repository.interface';

import { toEntity } from './mongoose-entity.utils';

@Injectable()
export class OrderInstanceFunctionMongooseRepository implements IOrderInstanceFunctionRepository {
  constructor(
    @InjectModel('WOrderInstanceFunction')
    private readonly model: Model<OrderInstanceFunction>,
  ) {}

  async findById(id: string): Promise<OrderInstanceFunction | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? toEntity<OrderInstanceFunction>(doc) : null;
  }

  async findAll(): Promise<OrderInstanceFunction[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => toEntity<OrderInstanceFunction>(doc));
  }

  async create(fn: Omit<OrderInstanceFunction, 'id'>): Promise<OrderInstanceFunction> {
    const created = await this.model.create(fn);
    return toEntity<OrderInstanceFunction>(created.toObject());
  }

  async update(id: string, partial: Partial<Omit<OrderInstanceFunction, 'id'>>): Promise<OrderInstanceFunction | null> {
    const updated = await this.model.findByIdAndUpdate(id, toPartialUpdateQuery(partial), { new: true }).lean().exec();
    return updated ? toEntity<OrderInstanceFunction>(updated) : null;
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
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
