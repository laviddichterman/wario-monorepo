import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { IOption } from '@wcp/wario-shared';

import { OptionEntity } from '../../entities/catalog/option.entity';
import type { IOptionRepository } from '../interfaces/option.repository.interface';

@Injectable()
export class OptionTypeOrmRepository implements IOptionRepository {
  constructor(
    @InjectRepository(OptionEntity)
    private readonly repo: Repository<OptionEntity>,
  ) {}

  async findById(id: string): Promise<IOption | null> {
    return this.repo.findOne({ where: { id, validTo: IsNull() } });
  }

  async findAll(): Promise<IOption[]> {
    return this.repo.find({ where: { validTo: IsNull() } });
  }

  async findByModifierTypeId(modifierTypeId: string): Promise<IOption[]> {
    return this.repo.find({ where: { modifierTypeId, validTo: IsNull() } });
  }

  async save(option: Omit<IOption, 'id'> & { id?: string }): Promise<IOption> {
    const now = new Date();

    if (option.id) {
      await this.repo.update(
        { id: option.id, validTo: IsNull() },
        { validTo: now },
      );
    }

    const entity = this.repo.create({
      ...option,
      id: option.id || crypto.randomUUID(),
      validFrom: now,
      validTo: null,
    });

    return this.repo.save(entity);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.update(
      { id, validTo: IsNull() },
      { validTo: new Date() },
    );
    return (result.affected ?? 0) > 0;
  }
}
