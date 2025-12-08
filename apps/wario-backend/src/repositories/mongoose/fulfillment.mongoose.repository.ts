import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { FulfillmentConfig } from '@wcp/wario-shared';

import type { IFulfillmentRepository } from '../interfaces/fulfillment.repository.interface';

@Injectable()
export class FulfillmentMongooseRepository implements IFulfillmentRepository {
  constructor(
    @InjectModel('FulfillmentSchema')
    private readonly model: Model<FulfillmentConfig>,
  ) {}

  async findById(id: string): Promise<FulfillmentConfig | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findAll(): Promise<FulfillmentConfig[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async findByService(service: string): Promise<FulfillmentConfig[]> {
    const docs = await this.model.find({ service }).lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async create(fulfillment: Omit<FulfillmentConfig, 'id'>): Promise<FulfillmentConfig> {
    const created = await this.model.create(fulfillment);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async update(id: string, partial: Partial<Omit<FulfillmentConfig, 'id'>>): Promise<FulfillmentConfig | null> {
    const updated = await this.model.findByIdAndUpdate(
      id,
      { $set: partial },
      { new: true },
    ).lean().exec();
    if (!updated) {
      return null;
    }
    return { ...updated, id: updated._id.toString() };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
