import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { FulfillmentConfig } from '@wcp/wario-shared';

import { FulfillmentEntity } from '../../entities/settings/fulfillment.entity';
import type { IFulfillmentRepository } from '../interfaces/fulfillment.repository.interface';

@Injectable()
export class FulfillmentTypeOrmRepository implements IFulfillmentRepository {
  constructor(
    @InjectRepository(FulfillmentEntity)
    private readonly repo: Repository<FulfillmentEntity>,
  ) {}

  async findById(id: string): Promise<FulfillmentConfig | null> {
    return this.repo.findOne({ where: { id, validTo: IsNull() } });
  }

  async findAll(): Promise<FulfillmentConfig[]> {
    return this.repo.find({ where: { validTo: IsNull() } });
  }

  async findByService(service: string): Promise<FulfillmentConfig[]> {
    return this.repo.find({ where: { service: service as FulfillmentConfig['service'], validTo: IsNull() } });
  }

  async create(fulfillment: Omit<FulfillmentConfig, 'id'>): Promise<FulfillmentConfig> {
    const now = new Date();
    const entity = this.repo.create({
      ...fulfillment,
      id: crypto.randomUUID(),
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async update(id: string, partial: Partial<Omit<FulfillmentConfig, 'id'>>): Promise<FulfillmentConfig | null> {
    const now = new Date();
    const existing = await this.repo.findOne({ where: { id, validTo: IsNull() } });
    if (!existing) {
      return null;
    }

    // Close old version
    await this.repo.update({ id, validTo: IsNull() }, { validTo: now });

    // Create new version
    const merged = { ...(existing as FulfillmentConfig), ...partial };
    const entity = this.repo.create({
      ...merged,
      id,
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
