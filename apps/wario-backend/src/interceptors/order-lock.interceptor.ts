import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';

import { IDEMPOTENCY_KEY, type IdempotencyKeyRequest } from '../decorators/idempotency-key.decorator';
import { LOCK_ORDER_KEY } from '../decorators/lock-order.decorator';
import { LOCKED_ORDER_KEY, type LockedOrderRequest } from '../decorators/locked-order.decorator';
import { type IOrderRepository, ORDER_REPOSITORY } from '../repositories/interfaces/order.repository.interface';

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
    @Inject(ORDER_REPOSITORY) private orderRepository: IOrderRepository,
  ) {}

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

    // Attempt to atomically lock the order using repository
    const order = await this.orderRepository.tryAcquireLock(orderId, idempotencyKey);

    if (!order) {
      throw new NotFoundException('Order not found or already locked');
    }

    // Attach locked order and idempotency key to request for use via decorators
    request[LOCKED_ORDER_KEY] = order;
    request[IDEMPOTENCY_KEY] = idempotencyKey;

    return next.handle();
  }
}
