import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

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

  async save(option: Omit<IOption, 'id'> & { id?: string }): Promise<IOption> {
    if (option.id) {
      const updated = await this.model.findByIdAndUpdate(
        option.id,
        { $set: option },
        { new: true },
      ).lean().exec();
      if (!updated) {
        throw new Error(`Option ${option.id} not found`);
      }
      return { ...updated, id: updated._id.toString() };
    }

    const created = await this.model.create(option);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
