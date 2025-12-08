import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { SeatingResource } from '@wcp/wario-shared';

import { SeatingResourceEntity } from '../../entities/settings/seating-resource.entity';
import type { ISeatingResourceRepository } from '../interfaces/seating-resource.repository.interface';

@Injectable()
export class SeatingResourceTypeOrmRepository implements ISeatingResourceRepository {
  constructor(
    @InjectRepository(SeatingResourceEntity)
    private readonly repo: Repository<SeatingResourceEntity>,
  ) {}

  async findById(id: string): Promise<SeatingResource | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<SeatingResource[]> {
    return this.repo.find();
  }

  async findBySectionId(sectionId: string): Promise<SeatingResource[]> {
    return this.repo.find({ where: { sectionId } });
  }

  async create(resource: Omit<SeatingResource, 'id'>): Promise<SeatingResource> {
    const entity = this.repo.create({
      ...resource,
      id: crypto.randomUUID(),
    });
    return this.repo.save(entity);
  }

  async update(id: string, partial: Partial<Omit<SeatingResource, 'id'>>): Promise<SeatingResource | null> {
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
