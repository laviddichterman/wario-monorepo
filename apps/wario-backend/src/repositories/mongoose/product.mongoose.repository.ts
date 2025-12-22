import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import type { IProduct } from '@wcp/wario-shared';

import type { IProductRepository } from '../interfaces/product.repository.interface';

import { toEntity } from './mongoose-entity.utils';

@Injectable()
export class ProductMongooseRepository implements IProductRepository {
  constructor(
    @InjectModel('WProductSchema')
    private readonly model: Model<IProduct>,
  ) {}

  async findById(id: string): Promise<IProduct | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? toEntity<IProduct>(doc) : null;
  }

  async findAll(): Promise<IProduct[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => toEntity<IProduct>(doc));
  }

  async findByCategoryId(categoryId: string): Promise<IProduct[]> {
    const docs = await this.model.find({ category_ids: categoryId }).lean().exec();
    return docs.map((doc) => toEntity<IProduct>(doc));
  }

  async findByQuery(filter: Partial<IProduct>): Promise<IProduct[]> {
    const docs = await this.model.find(filter).lean().exec();
    return docs.map((doc) => toEntity<IProduct>(doc));
  }

  async create(product: Omit<IProduct, 'id'>): Promise<IProduct> {
    const created = await this.model.create(product);
    return toEntity<IProduct>(created.toObject());
  }

  async update(id: string, partial: Partial<Omit<IProduct, 'id'>>): Promise<IProduct | null> {
    const updated = await this.model.findByIdAndUpdate(id, { $set: partial }, { new: true }).lean().exec();
    if (!updated) {
      return null;
    }
    return toEntity<IProduct>(updated);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  // Bulk operations
  async bulkCreate(products: Omit<IProduct, 'id'>[]): Promise<IProduct[]> {
    if (products.length === 0) return [];
    const docs = await this.model.insertMany(products);
    return docs.map((doc) => toEntity<IProduct>(doc.toObject()));
  }

  async bulkUpdate(updates: Array<{ id: string; data: Partial<Omit<IProduct, 'id'>> }>): Promise<number> {
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

  async removeCategoryFromAll(categoryId: string): Promise<number> {
    const result = await this.model.updateMany({}, { $pull: { category_ids: categoryId } }).exec();
    return result.modifiedCount;
  }

  async removeModifierTypeFromAll(mtId: string): Promise<number> {
    const result = await this.model.updateMany({}, { $pull: { modifiers: { mtid: mtId } } }).exec();
    return result.modifiedCount;
  }

  async clearModifierEnableField(productInstanceFunctionId: string): Promise<number> {
    const result = await this.model
      .updateMany({ 'modifiers.enable': productInstanceFunctionId }, { $set: { 'modifiers.$.enable': null } })
      .exec();
    return result.modifiedCount;
  }

  async removeServiceDisableFromAll(serviceId: string): Promise<number> {
    const result = await this.model
      .updateMany({}, { $pull: { serviceDisable: serviceId, 'modifiers.$[].serviceDisable': serviceId } })
      .exec();
    return result.modifiedCount;
  }

  async migratePrinterGroupForAllProducts(oldId: string, newId: string | null): Promise<number> {
    const result = await this.model.updateMany({ printerGroup: oldId }, { $set: { printerGroup: newId } }).exec();
    return result.modifiedCount;
  }
}
