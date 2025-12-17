import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { SeatingPlacement } from '@wcp/wario-shared';

import { SeatingPlacementEntity } from 'src/infrastructure/database/typeorm/settings/seating-placement.entity';

import type { ISeatingPlacementRepository } from '../interfaces/seating-placement.repository.interface';

@Injectable()
export class SeatingPlacementTypeOrmRepository implements ISeatingPlacementRepository {
  constructor(
    @InjectRepository(SeatingPlacementEntity)
    private readonly repo: Repository<SeatingPlacementEntity>,
  ) {}

  async findById(id: string): Promise<SeatingPlacement | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<SeatingPlacement[]> {
    return this.repo.find();
  }

  async findBySectionId(sectionId: string): Promise<SeatingPlacement[]> {
    return this.repo.find({ where: { sectionId } });
  }

  async create(placement: Omit<SeatingPlacement, 'id'>): Promise<SeatingPlacement> {
    const entity = this.repo.create({
      ...placement,
      id: crypto.randomUUID(),
    });
    return this.repo.save(entity);
  }

  async update(id: string, partial: Partial<Omit<SeatingPlacement, 'id'>>): Promise<SeatingPlacement | null> {
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
