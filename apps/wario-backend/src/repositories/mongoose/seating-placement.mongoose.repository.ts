import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { SeatingPlacement } from '@wcp/wario-shared';

import type { ISeatingPlacementRepository } from '../interfaces/seating-placement.repository.interface';

@Injectable()
export class SeatingPlacementMongooseRepository implements ISeatingPlacementRepository {
  constructor(
    @InjectModel('SeatingPlacement')
    private readonly model: Model<SeatingPlacement>,
  ) { }

  async findById(id: string): Promise<SeatingPlacement | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findAll(): Promise<SeatingPlacement[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async findBySectionId(sectionId: string): Promise<SeatingPlacement[]> {
    const docs = await this.model.find({ sectionId }).lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async create(placement: Omit<SeatingPlacement, 'id'>): Promise<SeatingPlacement> {
    const created = await this.model.create(placement);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async update(id: string, partial: Partial<Omit<SeatingPlacement, 'id'>>): Promise<SeatingPlacement | null> {
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
