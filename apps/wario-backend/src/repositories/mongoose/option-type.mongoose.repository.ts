import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { IOptionType } from '@wcp/wario-shared';

import type { IOptionTypeRepository } from '../interfaces/option-type.repository.interface';

@Injectable()
export class OptionTypeMongooseRepository implements IOptionTypeRepository {
  constructor(
    @InjectModel('WOptionTypeSchema')
    private readonly model: Model<IOptionType>,
  ) {}

  async findById(id: string): Promise<IOptionType | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findAll(): Promise<IOptionType[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async save(optionType: Omit<IOptionType, 'id'> & { id?: string }): Promise<IOptionType> {
    if (optionType.id) {
      const updated = await this.model.findByIdAndUpdate(
        optionType.id,
        { $set: optionType },
        { new: true },
      ).lean().exec();
      if (!updated) {
        throw new Error(`OptionType ${optionType.id} not found`);
      }
      return { ...updated, id: updated._id.toString() };
    }

    const created = await this.model.create(optionType);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
