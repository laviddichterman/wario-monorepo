import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { Observable } from 'rxjs';

import {
  IDEMPOTENCY_KEY,
  type IdempotencyKeyRequest,
} from '../decorators/idempotency-key.decorator';
import { LOCK_ORDER_KEY } from '../decorators/lock-order.decorator';
import {
  LOCKED_ORDER_KEY,
  type LockedOrderRequest,
} from '../decorators/locked-order.decorator';
import type { WOrderInstance } from '../models/orders/WOrderInstance';

/**
 * Request interface combining all required properties for order locking.
 * Uses constants from decorators for type-safe property access.
 */
interface OrderLockRequest extends LockedOrderRequest, IdempotencyKeyRequest {
  headers: {
    'idempotency-key'?: string;
    [key: string]: string | string[] | undefined;
  };
  params: {
    oId?: string;
    [key: string]: string | undefined;
  };
}

@Injectable()
export class OrderLockInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    @InjectModel('WOrderInstance') private orderModel: Model<WOrderInstance>,
  ) { }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const requiresLock = this.reflector.get<boolean>(LOCK_ORDER_KEY, context.getHandler());

    if (!requiresLock) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<OrderLockRequest>();
    const idempotencyKey = request.headers['idempotency-key'];
    const orderId = request.params.oId as string;

    if (!idempotencyKey) {
      throw new BadRequestException('idempotency-key header required');
    }

    // Attempt to atomically lock the order
    const order = await this.orderModel
      .findOneAndUpdate(
        { _id: orderId, locked: null }, // Only update if not locked
        { locked: idempotencyKey }, // Set lock to idempotency key
        { new: true },
      )
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found or already locked');
    }

    // Attach locked order and idempotency key to request for use via decorators
    request[LOCKED_ORDER_KEY] = order.toObject();
    request[IDEMPOTENCY_KEY] = idempotencyKey;

    return next.handle();
  }
}
