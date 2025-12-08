import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { ICategory } from '@wcp/wario-shared';

import type { ICategoryRepository } from '../interfaces/category.repository.interface';

@Injectable()
export class CategoryMongooseRepository implements ICategoryRepository {
  constructor(
    @InjectModel('WCategorySchema')
    private readonly model: Model<ICategory>,
  ) {}

  async findById(id: string): Promise<ICategory | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findAll(): Promise<ICategory[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async findByParentId(parentId: string | null): Promise<ICategory[]> {
    const docs = await this.model.find({ parent_id: parentId }).lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async create(category: Omit<ICategory, 'id'>): Promise<ICategory> {
    const created = await this.model.create(category);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async update(id: string, partial: Partial<Omit<ICategory, 'id'>>): Promise<ICategory | null> {
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

  async removeServiceDisableFromAll(serviceId: string): Promise<number> {
    const result = await this.model.updateMany({}, { $pull: { serviceDisable: serviceId } }).exec();
    return result.modifiedCount;
  }
}
