import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';

import type { WFulfillmentStatus, WOrderInstance, WOrderStatus } from '@wcp/wario-shared';

import { OrderEntity } from '../../entities/order/order.entity';
import type { IOrderRepository } from '../interfaces/order.repository.interface';

@Injectable()
export class OrderTypeOrmRepository implements IOrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly repo: Repository<OrderEntity>,
  ) {}

  async findById(id: string): Promise<WOrderInstance | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByStatus(status: WOrderStatus): Promise<WOrderInstance[]> {
    return this.repo.find({ where: { status } });
  }

  async findByFulfillmentDate(date: string): Promise<WOrderInstance[]> {
    return this.repo.find({ where: { fulfillmentDate: date } });
  }

  async findByDateRange(startDate: string, endDate: string): Promise<WOrderInstance[]> {
    return this.repo.find({
      where: { fulfillmentDate: Between(startDate, endDate) },
    });
  }

  async save(order: WOrderInstance): Promise<WOrderInstance> {
    const entity = this.repo.create(order);
    return this.repo.save(entity);
  }

  async updateStatus(id: string, status: WOrderStatus): Promise<WOrderInstance | null> {
    await this.repo.update({ id }, { status });
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  async findByThirdPartySquareIds(squareIds: string[]): Promise<WOrderInstance[]> {
    if (squareIds.length === 0) return [];
    return this.repo
      .createQueryBuilder('order')
      .where("order.fulfillment->'thirdPartyInfo'->>'squareId' IN (:...squareIds)", { squareIds })
      .getMany();
  }

  async updateWithLock(
    id: string,
    lock: string | null,
    updates: Partial<WOrderInstance>,
  ): Promise<WOrderInstance | null> {
    const whereClause = lock === null ? { id, locked: IsNull() } : { id, locked: lock };
    const result = await this.repo.update(whereClause, updates);
    if ((result.affected ?? 0) === 0) return null;
    return this.findById(id);
  }

  async releaseLock(id: string): Promise<void> {
    await this.repo.update({ id }, { locked: null });
  }

  async bulkCreate(orders: Omit<WOrderInstance, 'id'>[]): Promise<WOrderInstance[]> {
    const entities = orders.map((o) => this.repo.create({ ...o, id: crypto.randomUUID() }));
    return this.repo.save(entities);
  }

  async create(order: Omit<WOrderInstance, 'id'>): Promise<WOrderInstance> {
    const entity = this.repo.create({ ...order, id: crypto.randomUUID() });
    return this.repo.save(entity);
  }

  async findByLock(lock: string): Promise<WOrderInstance[]> {
    return this.repo.find({ where: { locked: lock } });
  }

  async lockReadyOrders(
    status: WOrderStatus,
    fulfillmentStatus: WFulfillmentStatus,
    selectedDate: string,
    maxSelectedTime: number,
    lock: string,
  ): Promise<number> {
    // Use raw query builder for complex JSONB update
    const result = await this.repo
      .createQueryBuilder()
      .update(OrderEntity)
      .set({ locked: lock })
      .where('status = :status', { status })
      .andWhere('locked IS NULL')
      .andWhere("fulfillment->>'status' = :fulfillmentStatus", { fulfillmentStatus })
      .andWhere("fulfillment->>'selectedDate' = :selectedDate", { selectedDate })
      .andWhere("(fulfillment->>'selectedTime')::int <= :maxSelectedTime", { maxSelectedTime })
      .execute();
    return result.affected ?? 0;
  }

  async acquireLock(id: string, status: WOrderStatus, lock: string): Promise<WOrderInstance | null> {
    const result = await this.repo.update({ id, status, locked: IsNull() }, { locked: lock });
    if ((result.affected ?? 0) === 0) return null;
    return this.findById(id);
  }

  async tryAcquireLock(id: string, lock: string): Promise<WOrderInstance | null> {
    const result = await this.repo.update({ id, locked: IsNull() }, { locked: lock });
    if ((result.affected ?? 0) === 0) return null;
    return this.findById(id);
  }

  async unlockAll(): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(OrderEntity)
      .set({ locked: null })
      .where('locked IS NOT NULL')
      .execute();
    return result.affected ?? 0;
  }
}
