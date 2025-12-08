import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { IProduct } from '@wcp/wario-shared';

import type { IProductRepository } from '../interfaces/product.repository.interface';

@Injectable()
export class ProductMongooseRepository implements IProductRepository {
  constructor(
    @InjectModel('WProductSchema')
    private readonly model: Model<IProduct>,
  ) {}

  async findById(id: string): Promise<IProduct | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findAll(): Promise<IProduct[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async findByCategoryId(categoryId: string): Promise<IProduct[]> {
    const docs = await this.model.find({ category_ids: categoryId }).lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async create(product: Omit<IProduct, 'id'>): Promise<IProduct> {
    const created = await this.model.create(product);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async update(id: string, partial: Partial<Omit<IProduct, 'id'>>): Promise<IProduct | null> {
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

  async removeCategoryFromAll(categoryId: string): Promise<number> {
    const result = await this.model.updateMany({}, { $pull: { category_ids: categoryId } }).exec();
    return result.modifiedCount;
  }
}
