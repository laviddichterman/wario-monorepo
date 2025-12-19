import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type {
  SeatingFloor,
  SeatingLayout,
  SeatingLayoutSection,
  SeatingResource,
} from '@wcp/wario-shared';

import type { ISeatingLayoutRepository } from '../interfaces/seating-layout.repository.interface';

type LayoutMetadata = Omit<SeatingLayout, 'floors' | 'sections' | 'resources'>;

@Injectable()
export class SeatingLayoutMongooseRepository implements ISeatingLayoutRepository {
  constructor(
    @InjectModel('SeatingLayout')
    private readonly layoutModel: Model<LayoutMetadata>,
    @InjectModel('SeatingFloor')
    private readonly floorModel: Model<SeatingFloor>,
    @InjectModel('SeatingSection')
    private readonly sectionModel: Model<SeatingLayoutSection>,
    @InjectModel('SeatingResource')
    private readonly resourceModel: Model<SeatingResource>,
  ) { }

  async findById(id: string): Promise<SeatingLayout | null> {
    const layout = await this.layoutModel.findById(id).exec();
    if (!layout) {
      return null;
    }
    // Map Mongoose _id to id
    return this.assembleLayout(layout);
  }

  async findAll(): Promise<LayoutMetadata[]> {
    const docs = await this.layoutModel.find().lean().exec();
    return docs.map((doc) => ({ id: doc._id.toString(), name: doc.name }));
  }

  async create(layoutData: LayoutMetadata): Promise<SeatingLayout> {
    // Only pass name - let Mongoose generate _id, don't use client-provided id
    const { name } = layoutData;
    const created = await this.layoutModel.create({ name });
    const doc = created.toObject();
    return this.assembleLayout({ id: doc._id.toString(), name: doc.name });
  }

  async update(id: string, partial: Partial<Omit<LayoutMetadata, 'id'>>): Promise<SeatingLayout | null> {
    const updated = await this.layoutModel.findByIdAndUpdate(id, { $set: partial }, { new: true }).lean().exec();
    if (!updated) {
      return null;
    }
    return this.assembleLayout({ id: updated._id.toString(), name: updated.name });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.layoutModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  private async assembleLayout(layoutDoc: LayoutMetadata): Promise<SeatingLayout> {
    const [floors, sections, resources] = await Promise.all([
      this.floorModel.find().sort({ ordinal: 1 }).lean().exec(),
      this.sectionModel.find().sort({ ordinal: 1 }).lean().exec(),
      this.resourceModel.find().lean().exec(),
    ]);

    return {
      id: layoutDoc.id,
      name: layoutDoc.name,
      floors: floors.map((f) => ({ ...f, id: f._id.toString() })),
      sections: sections.map((s) => ({ ...s, id: s._id.toString() })),
      resources: resources.map((r) => ({ ...r, id: r._id.toString() })),
    };
  }
}
