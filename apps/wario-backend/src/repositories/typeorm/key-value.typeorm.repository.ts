import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { KeyValueEntity } from '../../entities/settings/key-value.entity';
import type { IKeyValueRepository, KeyValueEntry } from '../interfaces/key-value.repository.interface';

@Injectable()
export class KeyValueTypeOrmRepository implements IKeyValueRepository {
  constructor(
    @InjectRepository(KeyValueEntity)
    private readonly repo: Repository<KeyValueEntity>,
  ) {}

  async findByKey(key: string): Promise<string | null> {
    const entity = await this.repo.findOne({ where: { key } });
    return entity?.value ?? null;
  }

  async findAll(): Promise<KeyValueEntry[]> {
    const entities = await this.repo.find();
    return entities.map((e) => ({ key: e.key, value: e.value }));
  }

  async set(key: string, value: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { key } });
    if (existing) {
      await this.repo.update({ key }, { value });
    } else {
      await this.repo.insert({ key, value });
    }
  }

  async setAll(entries: KeyValueEntry[]): Promise<void> {
    await this.repo.clear();
    if (entries.length > 0) {
      await this.repo.insert(entries);
    }
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.repo.delete({ key });
    return (result.affected ?? 0) > 0;
  }
}
