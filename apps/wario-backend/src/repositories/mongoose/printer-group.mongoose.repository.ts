import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { PrinterGroup } from '@wcp/wario-shared';

import type { IPrinterGroupRepository } from '../interfaces/printer-group.repository.interface';

import { toEntity } from './mongoose-entity.utils';

@Injectable()
export class PrinterGroupMongooseRepository implements IPrinterGroupRepository {
  constructor(
    @InjectModel('WPrinterGroupSchema')
    private readonly model: Model<PrinterGroup>,
  ) {}

  async findById(id: string): Promise<PrinterGroup | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? toEntity<PrinterGroup>(doc) : null;
  }

  async findAll(): Promise<PrinterGroup[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => toEntity<PrinterGroup>(doc));
  }

  async create(group: Omit<PrinterGroup, 'id'>): Promise<PrinterGroup> {
    const created = await this.model.create(group);
    return toEntity<PrinterGroup>(created.toObject());
  }

  async update(id: string, partial: Partial<Omit<PrinterGroup, 'id'>>): Promise<PrinterGroup | null> {
    const updated = await this.model.findByIdAndUpdate(id, { $set: partial }, { new: true }).lean().exec();
    if (!updated) {
      return null;
    }
    return toEntity<PrinterGroup>(updated);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
