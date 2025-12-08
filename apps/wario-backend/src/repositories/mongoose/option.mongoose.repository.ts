import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import type { IOption } from '@wcp/wario-shared';

import type { IOptionRepository } from '../interfaces/option.repository.interface';

@Injectable()
export class OptionMongooseRepository implements IOptionRepository {
  constructor(
    @InjectModel('WOptionSchema')
    private readonly model: Model<IOption>,
  ) {}

  async findById(id: string): Promise<IOption | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findAll(): Promise<IOption[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async findByModifierTypeId(modifierTypeId: string): Promise<IOption[]> {
    const docs = await this.model.find({ modifierTypeId }).lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async create(option: Omit<IOption, 'id'>): Promise<IOption> {
    const created = await this.model.create(option);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async update(id: string, partial: Partial<Omit<IOption, 'id'>>): Promise<IOption | null> {
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

  // Bulk operations
  async bulkCreate(options: Omit<IOption, 'id'>[]): Promise<IOption[]> {
    if (options.length === 0) return [];
    const docs = await this.model.insertMany(options);
    return docs.map((doc) => {
      const obj = doc.toObject();
      return { ...obj, id: obj._id.toString() };
    });
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
    return result.modifiedCount;
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
    const result = await this.model.updateMany(
      { enable: productInstanceFunctionId },
      { $set: { enable: null } },
    ).exec();
    return result.modifiedCount;
  }
}

