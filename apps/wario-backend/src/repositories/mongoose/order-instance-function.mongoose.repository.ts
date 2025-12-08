import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { OrderInstanceFunction } from '@wcp/wario-shared';

import type { IOrderInstanceFunctionRepository } from '../interfaces/order-instance-function.repository.interface';

@Injectable()
export class OrderInstanceFunctionMongooseRepository implements IOrderInstanceFunctionRepository {
  constructor(
    @InjectModel('WOrderInstanceFunction')
    private readonly model: Model<OrderInstanceFunction>,
  ) {}

  async findById(id: string): Promise<OrderInstanceFunction | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findAll(): Promise<OrderInstanceFunction[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async save(fn: Omit<OrderInstanceFunction, 'id'> & { id?: string }): Promise<OrderInstanceFunction> {
    if (fn.id) {
      const updated = await this.model.findByIdAndUpdate(
        fn.id,
        { $set: fn },
        { new: true },
      ).lean().exec();
      if (!updated) {
        throw new Error(`OrderInstanceFunction ${fn.id} not found`);
      }
      return { ...updated, id: updated._id.toString() };
    }

    const created = await this.model.create(fn);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
