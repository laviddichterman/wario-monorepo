import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { FulfillmentConfig } from '@wcp/wario-shared';

import type { IFulfillmentRepository } from '../interfaces/fulfillment.repository.interface';

import { toEntity } from './mongoose-entity.utils';

@Injectable()
export class FulfillmentMongooseRepository implements IFulfillmentRepository {
  constructor(
    @InjectModel('FulfillmentSchema')
    private readonly model: Model<FulfillmentConfig>,
  ) {}

  async findById(id: string): Promise<FulfillmentConfig | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? toEntity<FulfillmentConfig>(doc) : null;
  }

  async findAll(): Promise<FulfillmentConfig[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => toEntity<FulfillmentConfig>(doc));
  }

  async findByService(service: string): Promise<FulfillmentConfig[]> {
    const docs = await this.model.find({ service }).lean().exec();
    return docs.map((doc) => toEntity<FulfillmentConfig>(doc));
  }

  async create(fulfillment: Omit<FulfillmentConfig, 'id'>): Promise<FulfillmentConfig> {
    const created = await this.model.create(fulfillment);
    return toEntity<FulfillmentConfig>(created.toObject());
  }

  async update(id: string, partial: Partial<Omit<FulfillmentConfig, 'id'>>): Promise<FulfillmentConfig | null> {
    const updated = await this.model.findByIdAndUpdate(id, { $set: partial }, { new: true }).lean().exec();
    if (!updated) {
      return null;
    }
    return toEntity<FulfillmentConfig>(updated);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
