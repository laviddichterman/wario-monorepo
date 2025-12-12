import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import type { IProductInstance } from '@wcp/wario-shared';

import type { IProductInstanceRepository } from '../interfaces/product-instance.repository.interface';

@Injectable()
export class ProductInstanceMongooseRepository implements IProductInstanceRepository {
  constructor(
    @InjectModel('WProductInstanceSchema')
    private readonly model: Model<IProductInstance>,
  ) {}

  async findById(id: string): Promise<IProductInstance | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findByIds(ids: string[]): Promise<IProductInstance[]> {
    if (!ids.length) return [];
    return this.model
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
  }

  async findAll(): Promise<IProductInstance[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async findAllWithModifierOptions(optionIds: string[]): Promise<IProductInstance[]> {
    const product_instances_to_update = await this.model
      .find({
        'modifiers.options': {
          $elemMatch: { optionId: { $in: optionIds } },
        },
      })
      .lean()
      .exec();
    return product_instances_to_update.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async findByProductId(productId: string): Promise<IProductInstance[]> {
    const docs = await this.model.find({ productId }).lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async create(instance: Omit<IProductInstance, 'id'>): Promise<IProductInstance> {
    const created = await this.model.create(instance);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async update(id: string, partial: Partial<Omit<IProductInstance, 'id'>>): Promise<IProductInstance | null> {
    const updated = await this.model.findByIdAndUpdate(id, { $set: partial }, { new: true }).lean().exec();
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
  async bulkCreate(instances: Omit<IProductInstance, 'id'>[]): Promise<IProductInstance[]> {
    if (instances.length === 0) return [];
    const docs = await this.model.insertMany(instances);
    return docs.map((doc) => {
      const obj = doc.toObject();
      return { ...obj, id: obj._id.toString() };
    });
  }

  async bulkUpdate(updates: Array<{ id: string; data: Partial<Omit<IProductInstance, 'id'>> }>): Promise<number> {
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

  async removeModifierTypeSelectionsFromAll(mtId: string): Promise<number> {
    // Remove option selections that reference this modifier type
    // This requires knowing the option IDs that belong to the modifier type
    const result = await this.model.updateMany({}, { $pull: { modifiers: { modifierTypeId: mtId } } }).exec();
    return result.modifiedCount;
  }

  async removeModifierOptionsFromAll(mtId: string, options: string[]): Promise<number> {
    const product_instance_options_delete = await this.model
      .updateMany(
        { 'modifiers.modifierTypeId': mtId },
        { $pull: { 'modifiers.$.options': { optionId: { $in: options } } } },
      )
      .exec();
    return product_instance_options_delete.modifiedCount;
  }
}
