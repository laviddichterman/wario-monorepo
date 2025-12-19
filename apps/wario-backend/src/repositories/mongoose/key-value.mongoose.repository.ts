import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import type { KeyValue } from '@wcp/wario-shared';

import { type IKeyValueRepository, type KeyValueEntry } from '../interfaces/key-value.repository.interface';

// The IKeyValueStore schema stores all key-value pairs in a single document
interface KeyValueStoreDoc {
  _id: string;
  settings: KeyValue[];
}

@Injectable()
export class KeyValueMongooseRepository implements IKeyValueRepository {
  constructor(
    @InjectModel('KeyValueSchema')
    private readonly model: Model<KeyValueStoreDoc>,
    @InjectPinoLogger(KeyValueMongooseRepository.name)
    private readonly logger: PinoLogger,
  ) {}

  async findByKey(key: string): Promise<string | null> {
    const doc = await this.model.findOne({}).lean().exec();
    const entry = doc?.settings.find((s) => s.key === key);
    return entry?.value ?? null;
  }

  async findAll(): Promise<KeyValueEntry[]> {
    const doc = await this.model.findOne({}).lean().exec();
    return doc?.settings ?? [];
  }

  async set(key: string, value: string): Promise<void> {
    const doc = await this.model.findOne({}).exec();
    if (!doc) {
      // Create new document with this entry
      await this.model.create({ settings: [{ key, value }] });
      return;
    }

    const existingIndex = doc.settings.findIndex((s) => s.key === key);
    if (existingIndex >= 0) {
      doc.settings[existingIndex].value = value;
    } else {
      doc.settings.push({ key, value });
    }
    await doc.save();
  }

  async setAll(entries: KeyValueEntry[]): Promise<void> {
    // Upsert single document with all entries
    await this.model.updateOne({}, { $set: { settings: entries } }, { upsert: true }).exec();
  }

  async delete(key: string): Promise<boolean> {
    const doc = await this.model.findOne({}).exec();
    if (!doc) return false;

    const initialLength = doc.settings.length;
    doc.settings = doc.settings.filter((s) => s.key !== key);
    if (doc.settings.length < initialLength) {
      await doc.save();
      return true;
    }
    return false;
  }
}
