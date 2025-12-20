import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { SeatingLayout, UpdateSeatingLayout } from '@wcp/wario-shared';

import type { ISeatingLayoutRepository } from '../interfaces/seating-layout.repository.interface';

type LayoutMetadata = Omit<SeatingLayout, 'floors'>;

@Injectable()
export class SeatingLayoutMongooseRepository implements ISeatingLayoutRepository {
  constructor(
    @InjectModel('SeatingLayout')
    private readonly layoutModel: Model<SeatingLayout>,
  ) {}

  async findById(id: string): Promise<SeatingLayout | null> {
    const layout = await this.layoutModel.findById(id).lean().exec();
    if (!layout) {
      return null;
    }
    return {
      id: layout._id.toString(),
      name: layout.name,
      floors: layout.floors,
    };
  }

  async findAll(): Promise<LayoutMetadata[]> {
    const docs = await this.layoutModel.find().lean().exec();
    return docs.map((doc) => ({ id: doc._id.toString(), name: doc.name }));
  }

  async create(layoutData: Omit<SeatingLayout, 'id'>): Promise<SeatingLayout> {
    const created = await this.layoutModel.create({
      name: layoutData.name,
      floors: layoutData.floors,
    });
    const doc = created.toObject();
    return {
      id: doc._id.toString(),
      name: doc.name,
      floors: doc.floors,
    };
  }

  async update(id: string, partial: Omit<UpdateSeatingLayout, 'id'>): Promise<SeatingLayout | null> {
    const updated = await this.layoutModel.findByIdAndUpdate(id, { $set: partial }, { new: true }).lean().exec();
    if (!updated) {
      return null;
    }
    return {
      id: updated._id.toString(),
      name: updated.name,
      floors: updated.floors,
    };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.layoutModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
