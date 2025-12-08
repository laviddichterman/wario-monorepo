import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { SEMVER } from '@wcp/wario-shared';

import type { IDBVersionRepository } from '../interfaces/db-version.repository.interface';

@Injectable()
export class DBVersionMongooseRepository implements IDBVersionRepository {
  constructor(
    @InjectModel('DBVersionSchema')
    private readonly model: Model<SEMVER>,
  ) {}

  async get(): Promise<SEMVER | null> {
    const doc = await this.model.findOne().lean().exec();
    return doc ?? null;
  }
}
