import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { SeatingResource } from '@wcp/wario-shared';

import type { ISeatingResourceRepository } from '../interfaces/seating-resource.repository.interface';

@Injectable()
export class SeatingResourceMongooseRepository implements ISeatingResourceRepository {
  constructor(
    @InjectModel('SeatingResource')
    private readonly model: Model<SeatingResource>,
  ) {}

  async findById(id: string): Promise<SeatingResource | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findAll(): Promise<SeatingResource[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async findBySectionId(sectionId: string): Promise<SeatingResource[]> {
    const docs = await this.model.find({ sectionId }).lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async create(resource: Omit<SeatingResource, 'id'>): Promise<SeatingResource> {
    const created = await this.model.create(resource);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async update(id: string, partial: Partial<Omit<SeatingResource, 'id'>>): Promise<SeatingResource | null> {
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
}
