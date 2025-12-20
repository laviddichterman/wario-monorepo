import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { SeatingLayout } from '@wcp/wario-shared';

import { SeatingLayoutEntity } from 'src/infrastructure/database/typeorm/settings/seating-layout.entity';

import type { ISeatingLayoutRepository } from '../interfaces/seating-layout.repository.interface';

type LayoutMetadata = Omit<SeatingLayout, 'floors'>;

@Injectable()
export class SeatingLayoutTypeOrmRepository implements ISeatingLayoutRepository {
  constructor(
    @InjectRepository(SeatingLayoutEntity)
    private readonly layoutRepo: Repository<SeatingLayoutEntity>,
  ) {}

  async findById(id: string): Promise<SeatingLayout | null> {
    const layout = await this.layoutRepo.findOne({ where: { id } });
    if (!layout) {
      return null;
    }
    return {
      id: layout.id,
      name: layout.name,
      floors: layout.floors,
    };
  }

  async findAll(): Promise<LayoutMetadata[]> {
    const layouts = await this.layoutRepo.find();
    return layouts.map((l) => ({ id: l.id, name: l.name }));
  }

  async create(layoutData: Omit<SeatingLayout, 'id'>): Promise<SeatingLayout> {
    const entity = this.layoutRepo.create({
      id: crypto.randomUUID(),
      name: layoutData.name,
      floors: layoutData.floors,
    });
    const saved = await this.layoutRepo.save(entity);
    return {
      id: saved.id,
      name: saved.name,
      floors: saved.floors,
    };
  }

  async update(id: string, partial: Partial<Omit<SeatingLayout, 'id'>>): Promise<SeatingLayout | null> {
    const existing = await this.layoutRepo.findOne({ where: { id } });
    if (!existing) {
      return null;
    }
    await this.layoutRepo.update({ id }, partial);
    const updated = await this.layoutRepo.findOne({ where: { id } });
    if (!updated) {
      return null;
    }
    return {
      id: updated.id,
      name: updated.name,
      floors: updated.floors,
    };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.layoutRepo.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
