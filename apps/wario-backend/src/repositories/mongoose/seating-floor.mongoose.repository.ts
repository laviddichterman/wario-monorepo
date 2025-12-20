import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { SeatingFloor } from '@wcp/wario-shared';

import type { ISeatingFloorRepository } from '../interfaces/seating-floor.repository.interface';

@Injectable()
export class SeatingFloorMongooseRepository implements ISeatingFloorRepository {
  constructor(
    @InjectModel('SeatingFloor')
    private readonly model: Model<SeatingFloor>,
  ) {}

  async findById(id: string): Promise<SeatingFloor | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findAll(): Promise<SeatingFloor[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async create(floor: Omit<SeatingFloor, 'id'>): Promise<SeatingFloor> {
    const created = await this.model.create(floor);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async update(id: string, partial: Partial<Omit<SeatingFloor, 'id'>>): Promise<SeatingFloor | null> {
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
}
