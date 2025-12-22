import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { SeatingLayoutSection } from '@wcp/wario-shared';

import type { ISeatingSectionRepository } from '../interfaces/seating-section.repository.interface';

import { toEntity } from './mongoose-entity.utils';

@Injectable()
export class SeatingSectionMongooseRepository implements ISeatingSectionRepository {
  constructor(
    @InjectModel('SeatingSection')
    private readonly model: Model<SeatingLayoutSection>,
  ) {}

  async findById(id: string): Promise<SeatingLayoutSection | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? toEntity<SeatingLayoutSection>(doc) : null;
  }

  async findAll(): Promise<SeatingLayoutSection[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => toEntity<SeatingLayoutSection>(doc));
  }

  async create(section: Omit<SeatingLayoutSection, 'id'>): Promise<SeatingLayoutSection> {
    const created = await this.model.create(section);
    return toEntity<SeatingLayoutSection>(created.toObject());
  }

  async update(id: string, partial: Partial<Omit<SeatingLayoutSection, 'id'>>): Promise<SeatingLayoutSection | null> {
    const updated = await this.model.findByIdAndUpdate(id, { $set: partial }, { new: true }).lean().exec();
    if (!updated) {
      return null;
    }
    return toEntity<SeatingLayoutSection>(updated);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
