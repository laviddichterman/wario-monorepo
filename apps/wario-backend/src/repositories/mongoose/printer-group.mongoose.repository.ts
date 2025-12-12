import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { PrinterGroup } from '@wcp/wario-shared';

import type { IPrinterGroupRepository } from '../interfaces/printer-group.repository.interface';

@Injectable()
export class PrinterGroupMongooseRepository implements IPrinterGroupRepository {
  constructor(
    @InjectModel('WPrinterGroupSchema')
    private readonly model: Model<PrinterGroup>,
  ) {}

  async findById(id: string): Promise<PrinterGroup | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findAll(): Promise<PrinterGroup[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async create(group: Omit<PrinterGroup, 'id'>): Promise<PrinterGroup> {
    const created = await this.model.create(group);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async update(id: string, partial: Partial<Omit<PrinterGroup, 'id'>>): Promise<PrinterGroup | null> {
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
