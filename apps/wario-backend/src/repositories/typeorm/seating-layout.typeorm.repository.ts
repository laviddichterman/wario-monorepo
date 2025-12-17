import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { SeatingLayout } from '@wcp/wario-shared';

import { SeatingFloorEntity } from 'src/infrastructure/database/typeorm/settings/seating-floor.entity';
import { SeatingLayoutEntity } from 'src/infrastructure/database/typeorm/settings/seating-layout.entity';
import { SeatingPlacementEntity } from 'src/infrastructure/database/typeorm/settings/seating-placement.entity';
import { SeatingResourceEntity } from 'src/infrastructure/database/typeorm/settings/seating-resource.entity';
import { SeatingSectionEntity } from 'src/infrastructure/database/typeorm/settings/seating-section.entity';

import type { ISeatingLayoutRepository } from '../interfaces/seating-layout.repository.interface';

type LayoutMetadata = Omit<SeatingLayout, 'floors' | 'sections' | 'resources' | 'placements'>;

@Injectable()
export class SeatingLayoutTypeOrmRepository implements ISeatingLayoutRepository {
  constructor(
    @InjectRepository(SeatingLayoutEntity)
    private readonly layoutRepo: Repository<SeatingLayoutEntity>,
    @InjectRepository(SeatingFloorEntity)
    private readonly floorRepo: Repository<SeatingFloorEntity>,
    @InjectRepository(SeatingSectionEntity)
    private readonly sectionRepo: Repository<SeatingSectionEntity>,
    @InjectRepository(SeatingResourceEntity)
    private readonly resourceRepo: Repository<SeatingResourceEntity>,
    @InjectRepository(SeatingPlacementEntity)
    private readonly placementRepo: Repository<SeatingPlacementEntity>,
  ) { }

  async findById(id: string): Promise<SeatingLayout | null> {
    const layout = await this.layoutRepo.findOne({ where: { id } });
    if (!layout) {
      return null;
    }
    return this.assembleLayout(layout);
  }

  async findAll(): Promise<LayoutMetadata[]> {
    return this.layoutRepo.find();
  }

  async create(layoutData: LayoutMetadata): Promise<SeatingLayout> {
    const entity = this.layoutRepo.create({
      ...layoutData,
      id: layoutData.id || crypto.randomUUID(),
    });
    const saved = await this.layoutRepo.save(entity);
    return this.assembleLayout(saved);
  }

  async update(id: string, partial: Partial<Omit<LayoutMetadata, 'id'>>): Promise<SeatingLayout | null> {
    const existing = await this.layoutRepo.findOne({ where: { id } });
    if (!existing) {
      return null;
    }
    await this.layoutRepo.update({ id }, partial);
    const updated = await this.layoutRepo.findOne({ where: { id } });
    if (!updated) {
      return null;
    }
    return this.assembleLayout(updated);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.layoutRepo.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  private async assembleLayout(layoutEntity: SeatingLayoutEntity): Promise<SeatingLayout> {
    const [floors, sections, resources, placements] = await Promise.all([
      this.floorRepo.find({ order: { ordinal: 'ASC' } }),
      this.sectionRepo.find({ order: { ordinal: 'ASC' } }),
      this.resourceRepo.find(),
      this.placementRepo.find(),
    ]);

    return {
      id: layoutEntity.id,
      name: layoutEntity.name,
      floors,
      sections,
      resources,
      placements,
    };
  }
}
