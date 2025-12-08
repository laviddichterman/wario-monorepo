import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { IProductInstance } from '@wcp/wario-shared';

import type { IProductInstanceRepository } from '../interfaces/product-instance.repository.interface';

@Injectable()
export class ProductInstanceMongooseRepository implements IProductInstanceRepository {
  constructor(
    @InjectModel('WProductInstanceSchema')
    private readonly model: Model<IProductInstance>,
  ) {}

  async findById(id: string): Promise<IProductInstance | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findAll(): Promise<IProductInstance[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async findByProductId(productId: string): Promise<IProductInstance[]> {
    const docs = await this.model.find({ productId }).lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async save(instance: Omit<IProductInstance, 'id'> & { id?: string }): Promise<IProductInstance> {
    if (instance.id) {
      const updated = await this.model.findByIdAndUpdate(
        instance.id,
        { $set: instance },
        { new: true },
      ).lean().exec();
      if (!updated) {
        throw new Error(`ProductInstance ${instance.id} not found`);
      }
      return { ...updated, id: updated._id.toString() };
    }

    const created = await this.model.create(instance);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
