import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { SeatingLayoutSection } from '@wcp/wario-shared';

import { SeatingSectionEntity } from 'src/infrastructure/database/typeorm/settings/seating-section.entity';

import type { ISeatingSectionRepository } from '../interfaces/seating-section.repository.interface';

@Injectable()
export class SeatingSectionTypeOrmRepository implements ISeatingSectionRepository {
  constructor(
    @InjectRepository(SeatingSectionEntity)
    private readonly repo: Repository<SeatingSectionEntity>,
  ) { }

  async findById(id: string): Promise<SeatingLayoutSection | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<SeatingLayoutSection[]> {
    return this.repo.find({ order: { ordinal: 'ASC' } });
  }

  async findByFloorId(floorId: string): Promise<SeatingLayoutSection[]> {
    return this.repo.find({ where: { floorId }, order: { ordinal: 'ASC' } });
  }

  async create(section: Omit<SeatingLayoutSection, 'id'>): Promise<SeatingLayoutSection> {
    const entity = this.repo.create({
      ...section,
      id: crypto.randomUUID(),
    });
    return this.repo.save(entity);
  }

  async update(id: string, partial: Partial<Omit<SeatingLayoutSection, 'id'>>): Promise<SeatingLayoutSection | null> {
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
