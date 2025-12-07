import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { WOrderInstance } from '../models/orders/WOrderInstance';

/**
 * Metadata key for storing the locked order on the request context.
 * Used by the OrderLockInterceptor to attach the locked order.
 */
export const LOCKED_ORDER_KEY = 'lockedOrder';

/**
 * Request interface extension for the locked order data.
 */
export interface LockedOrderRequest {
  [LOCKED_ORDER_KEY]?: WOrderInstance;
}

/**
 * Parameter decorator that extracts the locked order from the execution context.
 *
 * The order is attached to the request by the OrderLockInterceptor after
 * successfully acquiring an atomic lock on the order document.
 *
 * @example
 * ```typescript
 * @Put(':oId/cancel')
 * @UseInterceptors(OrderLockInterceptor)
 * @LockOrder()
 * async putCancelOrder(
 *   @LockedOrder() order: WOrderInstance,
 *   @Body() body: CancelOrderRequestDto,
 * ) {
 *   // order is the locked order, ready for mutation
 * }
 * ```
 */
export const LockedOrder = createParamDecorator((_data: unknown, ctx: ExecutionContext): WOrderInstance | undefined => {
  const request = ctx.switchToHttp().getRequest<LockedOrderRequest>();
  return request[LOCKED_ORDER_KEY];
});
