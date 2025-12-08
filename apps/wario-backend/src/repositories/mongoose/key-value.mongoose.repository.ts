import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { type IKeyValueRepository, type KeyValueEntry } from '../interfaces/key-value.repository.interface';

interface KeyValueDoc {
  _id: string;
  key: string;
  value: string;
}

@Injectable()
export class KeyValueMongooseRepository implements IKeyValueRepository {
  constructor(
    @InjectModel('KeyValueSchema')
    private readonly model: Model<KeyValueDoc>,
  ) {}

  async findByKey(key: string): Promise<string | null> {
    const doc = await this.model.findOne({ key }).lean().exec();
    return doc?.value ?? null;
  }

  async findAll(): Promise<KeyValueEntry[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => ({ key: doc.key, value: doc.value }));
  }

  async set(key: string, value: string): Promise<void> {
    await this.model.updateOne(
      { key },
      { $set: { value } },
      { upsert: true },
    ).exec();
  }

  async setAll(entries: KeyValueEntry[]): Promise<void> {
    // Delete all existing entries and insert new ones
    await this.model.deleteMany({}).exec();
    if (entries.length > 0) {
      await this.model.insertMany(entries);
    }
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.model.deleteOne({ key }).exec();
    return result.deletedCount > 0;
  }
}
