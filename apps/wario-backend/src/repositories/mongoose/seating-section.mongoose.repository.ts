import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { SeatingLayoutSection } from '@wcp/wario-shared';

import type { ISeatingSectionRepository } from '../interfaces/seating-section.repository.interface';

@Injectable()
export class SeatingSectionMongooseRepository implements ISeatingSectionRepository {
  constructor(
    @InjectModel('SeatingSection')
    private readonly model: Model<SeatingLayoutSection>,
  ) {}

  async findById(id: string): Promise<SeatingLayoutSection | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findAll(): Promise<SeatingLayoutSection[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async create(section: Omit<SeatingLayoutSection, 'id'>): Promise<SeatingLayoutSection> {
    const created = await this.model.create(section);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async update(id: string, partial: Partial<Omit<SeatingLayoutSection, 'id'>>): Promise<SeatingLayoutSection | null> {
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
