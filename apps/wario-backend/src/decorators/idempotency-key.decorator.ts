import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/**
 * Metadata key for storing the idempotency key on the request context.
 * Used by the OrderLockInterceptor to attach the validated idempotency key.
 */
export const IDEMPOTENCY_KEY = 'idempotencyKey';

/**
 * Request interface extension for the idempotency key data.
 */
export interface IdempotencyKeyRequest {
  [IDEMPOTENCY_KEY]?: string;
}

/**
 * Parameter decorator that extracts the validated idempotency key from the execution context.
 *
 * The idempotency key is validated and attached to the request by the OrderLockInterceptor.
 * This key is used to ensure exactly-once semantics for order mutations.
 *
 * @example
 * ```typescript
 * @Put(':oId/cancel')
 * @UseInterceptors(OrderLockInterceptor)
 * @LockOrder()
 * async putCancelOrder(
 *   @IdempotencyKey() idempotencyKey: string,
 *   @LockedOrder() order: WOrderInstance,
 * ) {
 *   // idempotencyKey is validated and ready to use
 * }
 * ```
 */
export const IdempotencyKey = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest<IdempotencyKeyRequest>();
  return request[IDEMPOTENCY_KEY];
});
