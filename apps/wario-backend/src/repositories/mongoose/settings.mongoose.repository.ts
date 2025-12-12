import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { IWSettings } from '@wcp/wario-shared';

import type { ISettingsRepository } from '../interfaces/settings.repository.interface';

@Injectable()
export class SettingsMongooseRepository implements ISettingsRepository {
  constructor(
    @InjectModel('SettingsSchema')
    private readonly model: Model<IWSettings>,
  ) {}

  async get(): Promise<IWSettings | null> {
    const doc = await this.model.findOne().lean().exec();
    return doc ?? null;
  }

  async save(settings: IWSettings): Promise<IWSettings> {
    // Upsert: find first and update, or create
    const updated = await this.model
      .findOneAndUpdate({}, { $set: settings }, { new: true, upsert: true })
      .lean()
      .exec();
    return updated;
  }
}
