import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { IOptionType } from '@wcp/wario-shared';

import { OptionTypeEntity } from '../../entities/catalog/option-type.entity';
import type { IOptionTypeRepository } from '../interfaces/option-type.repository.interface';

@Injectable()
export class OptionTypeTypeOrmRepository implements IOptionTypeRepository {
  constructor(
    @InjectRepository(OptionTypeEntity)
    private readonly repo: Repository<OptionTypeEntity>,
  ) {}

  async findById(id: string): Promise<IOptionType | null> {
    return this.repo.findOne({ where: { id, validTo: IsNull() } });
  }

  async findAll(): Promise<IOptionType[]> {
    return this.repo.find({ where: { validTo: IsNull() } });
  }

  async save(optionType: Omit<IOptionType, 'id'> & { id?: string }): Promise<IOptionType> {
    const now = new Date();

    if (optionType.id) {
      await this.repo.update(
        { id: optionType.id, validTo: IsNull() },
        { validTo: now },
      );
    }

    const entity = this.repo.create({
      ...optionType,
      id: optionType.id || crypto.randomUUID(),
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
