import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { WFulfillmentStatus, WOrderInstance, WOrderStatus } from '@wcp/wario-shared';

import type { IOrderRepository } from '../interfaces/order.repository.interface';

@Injectable()
export class OrderMongooseRepository implements IOrderRepository {
  constructor(
    @InjectModel('WOrderInstance')
    private readonly model: Model<WOrderInstance>,
  ) { }

  async findById(id: string): Promise<WOrderInstance | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? { ...doc, id: doc._id.toString() } : null;
  }

  async findBy({
    date,
    endDate,
    status,
  }: {
    date: string | null;
    endDate: string | null;
    status: WOrderStatus | null;
  }): Promise<WOrderInstance[]> {
    const docs = await this.model
      .find({
        ...(status ? { status } : {}),
        ...(date
          ? endDate
            ? { 'fulfillment.selectedDate': { $gte: date, $lte: endDate } }
            : { 'fulfillment.selectedDate': { $eq: date } }
          : {}),
      })
      .lean()
      .exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async save(order: WOrderInstance): Promise<WOrderInstance> {
    if (order.id) {
      const updated = await this.model.findByIdAndUpdate(order.id, { $set: order }, { new: true }).lean().exec();
      if (!updated) {
        throw new Error(`Order ${order.id} not found`);
      }
      return { ...updated, id: updated._id.toString() };
    }

    const created = await this.model.create(order);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async updateStatus(id: string, status: WOrderStatus): Promise<WOrderInstance | null> {
    const updated = await this.model.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean().exec();
    return updated ? { ...updated, id: updated._id.toString() } : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async findByThirdPartySquareIds(squareIds: string[]): Promise<WOrderInstance[]> {
    if (squareIds.length === 0) return [];
    const docs = await this.model
      .find({
        'fulfillment.thirdPartyInfo.squareId': { $in: squareIds },
      })
      .lean()
      .exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async updateWithLock(
    id: string,
    lock: string | null,
    updates: Partial<WOrderInstance>,
  ): Promise<WOrderInstance | null> {
    const updated = await this.model
      .findOneAndUpdate({ _id: id, locked: lock }, { $set: updates }, { new: true })
      .lean()
      .exec();
    return updated ? { ...updated, id: updated._id.toString() } : null;
  }

  async releaseLock(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { $set: { locked: null } }).exec();
  }

  async bulkCreate(orders: Omit<WOrderInstance, 'id'>[]): Promise<WOrderInstance[]> {
    const docs = await this.model.insertMany(orders);
    return docs.map((doc) => ({ ...doc.toObject(), id: doc._id.toString() }));
  }

  async create(order: Omit<WOrderInstance, 'id'>): Promise<WOrderInstance> {
    const created = await this.model.create(order);
    const doc = created.toObject();
    return { ...doc, id: doc._id.toString() };
  }

  async findByLock(lock: string): Promise<WOrderInstance[]> {
    const docs = await this.model.find({ locked: lock }).lean().exec();
    return docs.map((doc) => ({ ...doc, id: doc._id.toString() }));
  }

  async lockReadyOrders(
    status: WOrderStatus,
    fulfillmentStatus: WFulfillmentStatus,
    selectedDate: string,
    maxSelectedTime: number,
    lock: string,
  ): Promise<number> {
    const result = await this.model
      .updateMany(
        {
          status,
          locked: null,
          'fulfillment.status': fulfillmentStatus,
          'fulfillment.selectedDate': selectedDate,
          'fulfillment.selectedTime': { $lte: maxSelectedTime },
        },
        { $set: { locked: lock } },
      )
      .exec();
    return result.modifiedCount;
  }

  async acquireLock(
    id: string,
    status: WOrderStatus,
    lock: string,
  ): Promise<(WOrderInstance & Required<{ locked: string }>) | null> {
    const updated = await this.model
      .findOneAndUpdate({ _id: id, locked: null, status }, { $set: { locked: lock } }, { new: true })
      .lean()
      .exec();
    return updated
      ? ({ ...updated, id: updated._id.toString() } as WOrderInstance & Required<{ locked: string }>)
      : null;
  }

  async tryAcquireLock(id: string, lock: string): Promise<(WOrderInstance & Required<{ locked: string }>) | null> {
    const updated = await this.model
      .findOneAndUpdate({ _id: id, locked: null }, { $set: { locked: lock } }, { new: true })
      .lean()
      .exec();
    return updated
      ? ({ ...updated, id: updated._id.toString() } as WOrderInstance & Required<{ locked: string }>)
      : null;
  }

  async unlockAll(): Promise<number> {
    const result = await this.model.updateMany({ locked: { $ne: null } }, { $set: { locked: null } }).exec();
    return result.modifiedCount;
  }
}
