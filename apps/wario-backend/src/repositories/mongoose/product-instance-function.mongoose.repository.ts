import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { IProductInstanceFunction } from '@wcp/wario-shared';

import { toPartialUpdateQuery } from '../../utils/partial-update';
import type { IProductInstanceFunctionRepository } from '../interfaces/product-instance-function.repository.interface';

import { toEntity } from './mongoose-entity.utils';

@Injectable()
export class ProductInstanceFunctionMongooseRepository implements IProductInstanceFunctionRepository {
  constructor(
    @InjectModel('WProductInstanceFunction')
    private readonly model: Model<IProductInstanceFunction>,
  ) {}

  async findById(id: string): Promise<IProductInstanceFunction | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? toEntity<IProductInstanceFunction>(doc) : null;
  }

  async findAll(): Promise<IProductInstanceFunction[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => toEntity<IProductInstanceFunction>(doc));
  }

  async create(fn: Omit<IProductInstanceFunction, 'id'>): Promise<IProductInstanceFunction> {
    const created = await this.model.create(fn);
    return toEntity<IProductInstanceFunction>(created.toObject());
  }

  async update(
    id: string,
    partial: Partial<Omit<IProductInstanceFunction, 'id'>>,
  ): Promise<IProductInstanceFunction | null> {
    const updated = await this.model.findByIdAndUpdate(id, toPartialUpdateQuery(partial), { new: true }).lean().exec();
    return updated ? toEntity<IProductInstanceFunction>(updated) : null;
  }

  async save(fn: Omit<IProductInstanceFunction, 'id'> & { id?: string }): Promise<IProductInstanceFunction> {
    if (fn.id) {
      const result = await this.update(fn.id, fn);
      if (!result) {
        throw new Error(`ProductInstanceFunction ${fn.id} not found`);
      }
      return result;
    }
    return this.create(fn);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
