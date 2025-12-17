import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import type { IWSettings } from '@wcp/wario-shared';

import { SettingsEntity } from 'src/infrastructure/database/typeorm/settings/settings.entity';

import type { ISettingsRepository } from '../interfaces/settings.repository.interface';

@Injectable()
export class SettingsTypeOrmRepository implements ISettingsRepository {
  constructor(
    @InjectRepository(SettingsEntity)
    private readonly repo: Repository<SettingsEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async get(): Promise<IWSettings | null> {
    // Settings is a singleton - get first row
    const result = await this.repo.find({ take: 1 });
    return result[0] ?? null;
  }

  async save(settings: IWSettings): Promise<IWSettings> {
    // Transactional upsert: clear + insert atomically
    return this.dataSource.transaction(async (manager) => {
      await manager.clear(SettingsEntity);
      const entity = manager.create(SettingsEntity, settings);
      return manager.save(entity);
    });
  }
}
