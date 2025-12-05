# Order Lock Lifecycle Improvement Proposal

## Current State

The `OrderLockInterceptor` handles locking orders atomically, but unlocking is currently handled within each service method. Service methods like `CancelLockedOrder`, `ConfirmLockedOrder`, etc. each set `locked: null` in their `findOneAndUpdate` calls.

**Current flow:**
1. Interceptor locks order (sets `locked: idempotencyKey`)
2. Controller extracts locked order via `@LockedOrder()` decorator
3. Service method does work AND atomically updates order with `locked: null`

## Proposed Improvement

Move unlock responsibility to the interceptor, centralizing the entire lock lifecycle. Service methods would return the order state (or update payload), and the interceptor would apply updates and unlock atomically.

### Pattern

```typescript
return next.handle().pipe(
  // Handle both success and "handled failures" that return a result
  switchMap(async (result: ResponseWithStatusCode<CrudOrderResponse>) => {
    // If result contains an order, apply it and unlock atomically
    if (result?.result) {
      const updatedOrder = await this.orderModel.findOneAndUpdate(
        { _id: orderId, locked: idempotencyKey },
        { ...result.result, locked: null },
        { new: true }
      );
      return { ...result, result: updatedOrder?.toObject() };
    }
    // No order in result (pure failure), just clear the lock
    await this.orderModel.findOneAndUpdate(
      { _id: orderId, locked: idempotencyKey },
      { locked: null }
    );
    return result;
  }),
  // Handle unhandled exceptions (service threw instead of returning)
  catchError(async (error) => {
    await this.orderModel.findOneAndUpdate(
      { _id: orderId, locked: idempotencyKey },
      { locked: null }
    );
    throw error;
  })
);
```

### Coverage Matrix

| Scenario | Order in result? | Action |
|----------|-----------------|--------|
| Success | Yes | Atomic update + unlock |
| Handled error (partial success) | Yes | Atomic update + unlock |
| Handled error (no changes made) | No | Just unlock |
| Unhandled exception | N/A | Just unlock, re-throw |

### Benefits

1. **Centralized lock lifecycle** - Interceptor owns both lock and unlock
2. **Guaranteed unlock** - Lock is always released, even on errors
3. **Cleaner service methods** - No longer need to handle `locked: null` themselves
4. **Single source of truth** - Lock logic in one place, not scattered across methods

### Trade-offs

1. **Requires restructuring service methods** - They would need to return order state/update payloads rather than saving directly
2. **Response format consistency** - All locked operations must return a consistent structure with optional `result` field
3. **Testing considerations** - Lock behavior becomes implicit in interceptor, may need integration tests

### Implementation Steps (Future)

1. Define a consistent response type for locked operations
2. Modify service methods to return update payloads (not save + unlock)
3. Enhance `OrderLockInterceptor` with the RxJS pattern above
4. Update tests to verify lock lifecycle

## Related Files

- `src/interceptors/order-lock.interceptor.ts` - Current interceptor implementation
- `src/decorators/locked-order.decorator.ts` - Decorator for extracting locked order
- `src/decorators/idempotency-key.decorator.ts` - Decorator for idempotency key
- `src/config/order-manager/order-manager.service.ts` - Service methods that would be refactored

## Status

**Proposed** - Documented for future implementation. Current implementation keeps unlock in service methods for atomicity with order updates.
