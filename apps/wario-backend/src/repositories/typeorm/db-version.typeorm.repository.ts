import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { SEMVER } from '@wcp/wario-shared';

import { DBVersionEntity } from 'src/entities/settings/db-version.entity';
import type { IDBVersionRepository } from '../interfaces/db-version.repository.interface';

@Injectable()
export class DBVersionTypeOrmRepository implements IDBVersionRepository {
  constructor(
    @InjectRepository(DBVersionEntity)
    private readonly repo: Repository<DBVersionEntity>,
  ) {}

  async get(): Promise<SEMVER | null> {
    const entity = await this.repo.findOne({ where: {} });
    if (!entity) return null;
    return { major: entity.major, minor: entity.minor, patch: entity.patch };
  }

  async set(version: SEMVER): Promise<void> {
    const existing = await this.repo.findOne({ where: {} });
    if (existing) {
      await this.repo.update({ rowId: existing.rowId }, version);
      return;
    }
    await this.repo.insert(version);
  }
}
