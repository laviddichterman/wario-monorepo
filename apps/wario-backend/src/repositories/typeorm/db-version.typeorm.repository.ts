import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { SEMVER } from '@wcp/wario-shared';

import { DBVersionEntity } from '../../entities/settings/db-version.entity';
import type { IDBVersionRepository } from '../interfaces/db-version.repository.interface';

@Injectable()
export class DBVersionTypeOrmRepository implements IDBVersionRepository {
  constructor(
    @InjectRepository(DBVersionEntity)
    private readonly repo: Repository<DBVersionEntity>,
  ) {}

  async get(): Promise<SEMVER | null> {
    // DBVersion is a singleton - get first row
    const result = await this.repo.find({ take: 1 });
    return result[0] ?? null;
  }
}
