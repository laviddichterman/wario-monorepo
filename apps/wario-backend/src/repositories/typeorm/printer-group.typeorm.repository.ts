import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { PrinterGroup } from '@wcp/wario-shared';

import { PrinterGroupEntity } from 'src/entities/settings/printer-group.entity';
import type { IPrinterGroupRepository } from '../interfaces/printer-group.repository.interface';

@Injectable()
export class PrinterGroupTypeOrmRepository implements IPrinterGroupRepository {
  constructor(
    @InjectRepository(PrinterGroupEntity)
    private readonly repo: Repository<PrinterGroupEntity>,
  ) {}

  async findById(id: string): Promise<PrinterGroup | null> {
    return this.repo.findOne({ where: { id, validTo: IsNull() } });
  }

  async findAll(): Promise<PrinterGroup[]> {
    return this.repo.find({ where: { validTo: IsNull() } });
  }

  async create(group: Omit<PrinterGroup, 'id'>): Promise<PrinterGroup> {
    const now = new Date();
    const entity = this.repo.create({
      ...group,
      id: crypto.randomUUID(),
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async update(id: string, partial: Partial<Omit<PrinterGroup, 'id'>>): Promise<PrinterGroup | null> {
    const now = new Date();
    const existing = await this.repo.findOne({ where: { id, validTo: IsNull() } });
    if (!existing) {
      return null;
    }

    // Close old version
    await this.repo.update({ id, validTo: IsNull() }, { validTo: now });

    // Create new version
    const { rowId: _rowId, validFrom: _vf, validTo: _vt, createdAt: _ca, ...rest } = existing;
    const entity = this.repo.create({
      ...(rest as PrinterGroup),
      ...partial,
      id,
      validFrom: now,
      validTo: null,
    });
    return this.repo.save(entity);
  }

  async delete(id: string): Promise<boolean> {
    const now = new Date();
    const result = await this.repo.update({ id, validTo: IsNull() }, { validTo: now });
    return (result.affected ?? 0) > 0;
  }
}
