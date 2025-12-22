import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import type { IOption } from '@wcp/wario-shared';

import type { IOptionRepository } from '../interfaces/option.repository.interface';

import { toEntity } from './mongoose-entity.utils';

@Injectable()
export class OptionMongooseRepository implements IOptionRepository {
  constructor(
    @InjectModel('WOptionSchema')
    private readonly model: Model<IOption>,
  ) {}

  async findById(id: string): Promise<IOption | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? toEntity<IOption>(doc) : null;
  }

  async findByIds(ids: string[]): Promise<IOption[]> {
    if (!ids.length) return [];
    const found = await this.model
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return found.map((doc) => toEntity<IOption>(doc));
  }

  async findAll(): Promise<IOption[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => toEntity<IOption>(doc));
  }

  async create(option: Omit<IOption, 'id'>): Promise<IOption> {
    const created = await this.model.create(option);
    return toEntity<IOption>(created.toObject());
  }

  async update(id: string, partial: Partial<Omit<IOption, 'id'>>): Promise<IOption | null> {
    const updated = await this.model.findByIdAndUpdate(id, { $set: partial }, { new: true }).lean().exec();
    if (!updated) {
      return null;
    }
    return toEntity<IOption>(updated);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  // Bulk operations
  async bulkCreate(options: Omit<IOption, 'id'>[]): Promise<IOption[]> {
    if (options.length === 0) return [];
    const docs = await this.model.insertMany(options);
    return docs.map((doc) => toEntity<IOption>(doc.toObject()));
  }

  async bulkUpdate(updates: Array<{ id: string; data: Partial<Omit<IOption, 'id'>> }>): Promise<number> {
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

  async bulkDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.model.deleteMany({ _id: { $in: ids } }).exec();
    return result.deletedCount;
  }

  async deleteByModifierTypeId(modifierTypeId: string): Promise<number> {
    const result = await this.model.deleteMany({ modifierTypeId }).exec();
    return result.deletedCount;
  }

  async clearEnableField(productInstanceFunctionId: string): Promise<number> {
    const result = await this.model
      .updateMany({ enable: productInstanceFunctionId }, { $set: { enable: null } })
      .exec();
    return result.modifiedCount;
  }
}
