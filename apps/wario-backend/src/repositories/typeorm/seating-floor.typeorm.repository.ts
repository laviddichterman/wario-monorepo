import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { SeatingFloor } from '@wcp/wario-shared';

import { SeatingFloorEntity } from 'src/infrastructure/database/typeorm/settings/seating-floor.entity';

import type { ISeatingFloorRepository } from '../interfaces/seating-floor.repository.interface';

@Injectable()
export class SeatingFloorTypeOrmRepository implements ISeatingFloorRepository {
  constructor(
    @InjectRepository(SeatingFloorEntity)
    private readonly repo: Repository<SeatingFloorEntity>,
  ) {}

  async findById(id: string): Promise<SeatingFloor | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<SeatingFloor[]> {
    return this.repo.find();
  }

  async create(floor: Omit<SeatingFloor, 'id'>): Promise<SeatingFloor> {
    const entity = this.repo.create({
      ...floor,
      id: crypto.randomUUID(),
    });
    return this.repo.save(entity);
  }

  async update(id: string, partial: Partial<Omit<SeatingFloor, 'id'>>): Promise<SeatingFloor | null> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) {
      return null;
    }
    await this.repo.update({ id }, partial);
    return this.repo.findOne({ where: { id } });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
