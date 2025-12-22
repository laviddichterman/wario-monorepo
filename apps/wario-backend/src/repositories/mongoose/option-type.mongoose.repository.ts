import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import type { IOptionType } from '@wcp/wario-shared';

import type { IOptionTypeRepository } from '../interfaces/option-type.repository.interface';

import { toEntity } from './mongoose-entity.utils';

@Injectable()
export class OptionTypeMongooseRepository implements IOptionTypeRepository {
  constructor(
    @InjectModel('WOptionTypeSchema')
    private readonly model: Model<IOptionType>,
  ) {}

  async findById(id: string): Promise<IOptionType | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? toEntity<IOptionType>(doc) : null;
  }

  async findAll(): Promise<IOptionType[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => toEntity<IOptionType>(doc));
  }

  async create(optionType: Omit<IOptionType, 'id'>): Promise<IOptionType> {
    const created = await this.model.create(optionType);
    return toEntity<IOptionType>(created.toObject());
  }

  async update(id: string, partial: Partial<Omit<IOptionType, 'id'>>): Promise<IOptionType | null> {
    const updated = await this.model.findByIdAndUpdate(id, { $set: partial }, { new: true }).lean().exec();
    if (!updated) {
      return null;
    }
    return toEntity<IOptionType>(updated);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  // Bulk operations
  async bulkCreate(optionTypes: Omit<IOptionType, 'id'>[]): Promise<IOptionType[]> {
    if (optionTypes.length === 0) return [];
    const docs = await this.model.insertMany(optionTypes);
    return docs.map((doc) => toEntity<IOptionType>(doc.toObject()));
  }

  async bulkUpdate(updates: Array<{ id: string; data: Partial<Omit<IOptionType, 'id'>> }>): Promise<number> {
    if (updates.length === 0) return 0;
    const bulkOps = updates.map(({ id, data }) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(id) },
        update: { $set: data },
      },
    }));
    const result = await this.model.bulkWrite(bulkOps);
    return result.matchedCount;
  }
}
