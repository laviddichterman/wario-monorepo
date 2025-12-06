# Comprehensive Error Handling Plan for wario-backend

## Executive Summary

This document outlines a comprehensive strategy for standardizing error handling across the `wario-backend` application, addressing inconsistencies identified during the migration from `wcp-order-backend` to NestJS.

## Current State Analysis

### Pattern 1: OrderController (Notification-based)
The `OrderController` has a unique pattern where errors trigger email notifications:

```typescript
private SendFailureNoticeOnErrorCatch(requestData: unknown, error: unknown) {
  void this.googleService.SendEmail(...);
}

@Post()
async postOrder(@Body() body: CreateOrderRequestV2Dto) {
  try {
    const response = await this.orderManager.CreateOrder(body, ipAddress);
    if (response.status !== 201) {
      throw new HttpException(response, response.status);
    }
    return response;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    this.SendFailureNoticeOnErrorCatch(body, error);  // <-- Manual notification
    throw new InternalServerErrorException(error);
  }
}
```

**Issues:**
- Notification logic duplicated in every method
- Manual status code checking on responses
- Inconsistent re-throwing of `HttpException` vs `NotFoundException`

---

### Pattern 2: Catalog Controllers (Simple try/catch)
Controllers like `ProductController`, `ModifierController` follow a simpler pattern:

```typescript
@Post()
async postProductClass(@Body() body: CreateProductBatchRequestDto) {
  try {
    const result = await this.catalogProvider.CreateProduct(body.product, body.instances);
    if (!result) {
      throw new NotFoundException(errorDetail);
    }
    return result;
  } catch (error) {
    if (error instanceof NotFoundException) throw error;
    throw new InternalServerErrorException(error);
  }
}
```

**Issues:**
- Null-check for failure instead of proper error types
- Every method has boilerplate try/catch
- No error logging or notification

---

### Pattern 3: CategoryController (No try/catch)
Some controllers have minimal or no error handling:

```typescript
@Post()
async postCategory(@Body() body: UncommittedCategoryDto) {
  const doc = await this.catalogProvider.CreateCategory(body);
  if (!doc) {
    throw new InternalServerErrorException('Unable to create category');
  }
  return doc;
}
```

**Issues:**
- Uncaught exceptions will be handled by NestJS's default filter (500)
- No structured error responses
- Inconsistent with other controllers

---

### Pattern 4: Service Response Types
Services return `ResponseWithStatusCode<CrudOrderResponse>` which requires manual handling:

```typescript
// In OrderManagerService
return {
  status: 404,
  success: false,
  error: [{
    category: 'INVALID_REQUEST_ERROR',
    code: 'NOT_FOUND',
    detail: errorDetail,
  }],
};
```

**Issues:**
- Status codes embedded in response body
- Controllers must manually convert to `HttpException`
- Inconsistent with NestJS's exception-based flow

---

## Proposed Solution Architecture

### 1. Global Exception Filter

Create a global exception filter to handle all unhandled exceptions:

```
src/
  filters/
    all-exceptions.filter.ts       # Catches all exceptions
    http-exception.filter.ts       # Formats HTTP exceptions consistently
```

**Responsibilities:**
- Log all exceptions with context
- Transform exceptions to standardized `WError[]` format
- Send critical error notifications (emails) for 5xx errors
- Track error metrics

```typescript
// all-exceptions.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: Logger,
    private readonly notificationService: ErrorNotificationService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, errors } = this.extractErrorInfo(exception);

    // Log the error
    this.logger.error({
      path: request.url,
      method: request.method,
      status,
      errors,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // Notify for critical errors (5xx on order-related endpoints)
    if (status >= 500 && request.path.includes('/order')) {
      void this.notificationService.sendCriticalErrorEmail(request, errors);
    }

    response.status(status).json({
      success: false,
      error: errors,
    });
  }
}
```

---

### 2. Custom Domain Exceptions

Create custom exceptions that map to business logic:

```
src/
  exceptions/
    index.ts                       # Barrel export
    order.exceptions.ts            # Order-specific exceptions
    catalog.exceptions.ts          # Catalog-specific exceptions
    payment.exceptions.ts          # Payment-specific exceptions
```

```typescript
// order.exceptions.ts
export class OrderNotFoundException extends NotFoundException {
  constructor(orderId: string) {
    super({
      success: false,
      error: [{
        category: 'INVALID_REQUEST_ERROR',
        code: 'ORDER_NOT_FOUND',
        detail: `Order ${orderId} not found`,
      }],
    });
  }
}

export class OrderLockedException extends ConflictException {
  constructor(orderId: string) {
    super({
      success: false,
      error: [{
        category: 'INVALID_REQUEST_ERROR',
        code: 'ORDER_LOCKED',
        detail: `Order ${orderId} is already locked`,
      }],
    });
  }
}

export class PaymentProcessingException extends BadGatewayException {
  constructor(squareErrors: WError[]) {
    super({
      success: false,
      error: squareErrors,
    });
  }
}
```

---

### 3. Error Notification Service

Extract notification logic from controllers:

```typescript
// error-notification.service.ts
@Injectable()
export class ErrorNotificationService {
  constructor(
    private readonly googleService: GoogleService,
    private readonly configService: ConfigService,
  ) {}

  async sendCriticalErrorEmail(
    request: Request,
    errors: WError[],
  ): Promise<void> {
    const email = this.configService.get('ADMIN_EMAIL');
    await this.googleService.SendEmail(
      email,
      { name: email, address: 'dave@windycitypie.com' },
      'ERROR IN ORDER PROCESSING. CONTACT DAVE IMMEDIATELY',
      'dave@windycitypie.com',
      `<p>Path: ${request.path}</p>
       <p>Method: ${request.method}</p>
       <p>Body: ${JSON.stringify(request.body)}</p>
       <p>Errors: ${JSON.stringify(errors)}</p>`,
    );
  }
}
```

---

### 4. Response Interceptor (Optional)

For consistent response formatting:

```typescript
// response.interceptor.ts
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // If already in standard format, return as-is
        if (data?.success !== undefined) {
          return data;
        }
        // Wrap in success response
        return {
          success: true,
          result: data,
        };
      }),
    );
  }
}
```

---

### 5. Service Layer Refactoring

Services should throw exceptions instead of returning error objects:

**Before:**
```typescript
// OrderManagerService
LockAndActOnOrder = async (...): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
  const order = await this.orderModel.findOneAndUpdate(...);
  if (!order) {
    return {
      status: 404,
      success: false,
      error: [{ category: 'INVALID_REQUEST_ERROR', code: 'NOT_FOUND', detail: '...' }],
    };
  }
  // ...
};
```

**After:**
```typescript
// OrderManagerService
LockAndActOnOrder = async (...): Promise<WOrderInstance> => {
  const order = await this.orderModel.findOneAndUpdate(...);
  if (!order) {
    throw new OrderNotFoundException(orderId);
  }
  // ...
  return updatedOrder;
};
```

---

## Implementation Phases

### Phase 1: Infrastructure (Low Risk)
1. Create `ErrorNotificationService`
2. Create `AllExceptionsFilter`
3. Create custom exception classes
4. Register global filter in `app.module.ts`

### Phase 2: New Controllers (No Breaking Changes)
1. Apply new patterns to any new controllers
2. Update existing tests to use new patterns

### Phase 3: Gradual Migration (Incremental)
1. Start with lowest-traffic controllers (`CategoryController`, `PrinterGroupController`)
2. Move to `ProductController`, `ModifierController`
3. Finish with high-traffic `OrderController`, `StoreCreditController`

### Phase 4: Service Layer (Highest Risk)
1. Refactor services to throw exceptions
2. Update all callers
3. Remove `ResponseWithStatusCode` wrapper pattern

---

## File Structure After Implementation

```
src/
  exceptions/
    index.ts
    order.exceptions.ts
    catalog.exceptions.ts
    payment.exceptions.ts
    store-credit.exceptions.ts
  filters/
    all-exceptions.filter.ts
    http-exception.filter.ts
    index.ts
  interceptors/
    response.interceptor.ts
    order-lock.interceptor.ts
  services/
    error-notification.service.ts
```

---

## Error Response Format

All error responses will follow the existing `WError` format from `wario-shared`:

```typescript
interface ErrorResponse {
  success: false;
  error: WError[];  // Array of { category, code, detail }
}
```

**HTTP Status Code Mapping:**

| Exception Type | HTTP Status | category |
|---------------|-------------|----------|
| `NotFoundException` | 404 | `INVALID_REQUEST_ERROR` |
| `BadRequestException` | 400 | `INVALID_REQUEST_ERROR` |
| `ConflictException` | 409 | `INVALID_REQUEST_ERROR` |
| `UnprocessableEntityException` | 422 | `INVALID_REQUEST_ERROR` |
| `UnauthorizedException` | 401 | `AUTHENTICATION_ERROR` |
| `ForbiddenException` | 403 | `AUTHORIZATION_ERROR` |
| `BadGatewayException` | 502 | `API_ERROR` |
| `InternalServerErrorException` | 500 | `API_ERROR` |

---

## Logging Strategy

All errors will be logged with:
- Timestamp
- Request ID (via correlation ID)
- HTTP method and path
- User/client info (if available)
- Error category, code, and detail
- Stack trace (for server errors)

```typescript
{
  timestamp: '2024-12-04T18:00:00.000Z',
  requestId: 'abc-123',
  method: 'POST',
  path: '/api/v1/order',
  status: 500,
  errors: [{ category: 'API_ERROR', code: 'INTERNAL_SERVER_ERROR', detail: '...' }],
  stack: '...',
}
```

---

## Benefits

1. **Consistency**: All controllers handle errors the same way
2. **Separation of Concerns**: Controllers don't need notification logic
3. **Testability**: Custom exceptions are easy to test
4. **Maintainability**: Single place to modify error handling behavior
5. **Observability**: Centralized logging and metrics
6. **NestJS Idiomatic**: Uses built-in exception filters and interceptors

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing clients | Phase 4 maintains response format compatibility |
| Missing notifications | Global filter catches all unhandled exceptions |
| Over-notifying | Add rate limiting and severity filtering |
| Performance | Async notification (fire-and-forget) |

---

## Success Metrics

- Zero uncaught exceptions in production
- 100% of 5xx errors trigger admin notification
- All error responses match `WError[]` format
- Reduced boilerplate in controllers by ~30%

---

## Implementation Notes

> **Last Updated:** 2024-12-04

### Phase 1: Infrastructure ✅ COMPLETED

#### 1. Custom Exception Classes
Created in `src/exceptions/`:

| File | Exceptions |
|------|------------|
| `order.exceptions.ts` | `OrderNotFoundException`, `OrderLockedException`, `InvalidOrderStateException`, `OrderValidationException`, `OrderProcessingException` |
| `catalog.exceptions.ts` | `ProductNotFoundException`, `ProductInstanceNotFoundException`, `CategoryNotFoundException`, `ModifierTypeNotFoundException`, `ModifierOptionNotFoundException`, `CatalogOperationException` |
| `payment.exceptions.ts` | `PaymentProcessingException`, `StoreCreditNotFoundException`, `InsufficientCreditException`, `InvalidPaymentAmountException` |
| `index.ts` | Barrel export for all exceptions |

**Usage Example:**
```typescript
import { OrderNotFoundException } from '../exceptions';

// In a service or controller
if (!order) {
  throw new OrderNotFoundException(orderId);
}
```

#### 2. ErrorNotificationService
Created at `src/config/error-notification/error-notification.service.ts`

**Features:**
- `sendCriticalErrorEmail()` - Sends formatted HTML email with error details
- `shouldNotify()` - Determines if error warrants notification (5xx on `/order`, `/store-credit`, `/payment`)
- Fire-and-forget pattern - email failures don't affect response
- Registered in global `ConfigModule`

#### 3. Global Exception Filter
Created at `src/filters/all-exceptions.filter.ts`

**Features:**
- Catches ALL exceptions (not just HttpException)
- Logs errors with structured context
- Transforms any exception to `WError[]` format
- Integrates with `ErrorNotificationService`
- Registered in `app.module.ts` via `APP_FILTER`

**Registration in app.module.ts:**
```typescript
{
  provide: APP_FILTER,
  useFactory: (errorNotificationService: ErrorNotificationService) => {
    return new AllExceptionsFilter(errorNotificationService);
  },
  inject: [ErrorNotificationService],
},
```

### Phase 2: New Controllers ✅ COMPLETED

The infrastructure is now in place and will automatically:
1. Catch any unhandled exceptions in new controllers
2. Convert them to the `WError[]` format
3. Log them with full context
4. Send email notifications for 5xx errors on critical paths

**New controllers can use the custom exceptions directly:**
```typescript
@Controller('api/v1/new-feature')
export class NewFeatureController {
  @Get(':id')
  async getItem(@Param('id') id: string) {
    const item = await this.service.find(id);
    if (!item) {
      // Uses custom exception - will be caught by global filter
      throw new ProductNotFoundException(id);
    }
    return item;
  }
  // No try/catch needed - global filter handles all errors
}
```

---

### Phase 3: Controller Migration ✅ COMPLETED

All controllers have been migrated to use custom exceptions and the global filter.

#### Changes Made

| Controller | Changes |
|------------|---------|
| `CategoryController` | Replaced `NotFoundException`/`InternalServerErrorException` with `CategoryNotFoundException`/`CatalogOperationException` |
| `PrinterGroupController` | Removed try/catch blocks, added `PrinterGroupNotFoundException`/`PrinterGroupOperationException` |
| `ProductController` | Removed all try/catch blocks (~50 lines), uses `ProductNotFoundException`/`ProductInstanceNotFoundException`/`CatalogOperationException` |
| `ModifierController` | Removed try/catch blocks, uses `ModifierTypeNotFoundException`/`ModifierOptionNotFoundException` |
| `OrderController` | **Removed `SendFailureNoticeOnErrorCatch` method** - global filter now handles email notifications. Removed all try/catch blocks, uses `OrderNotFoundException` |
| `StoreCreditController` | Removed manual email notifications, removed GoogleService/DataProviderService dependencies, uses `StoreCreditNotFoundException`/`InsufficientCreditException` |

#### New Printer Exceptions

Created `src/exceptions/printer.exceptions.ts`:
- `PrinterGroupNotFoundException` - Thrown when a printer group cannot be found
- `PrinterGroupOperationException` - Thrown when printer group operations fail

#### Lines of Code Removed

Approximate boilerplate removed across all controllers:
- **~200 lines** of try/catch blocks
- **~40 lines** of manual email notification code
- **2 controller dependencies** removed (GoogleService, DataProviderService from StoreCreditController)

---

### Phase 4: Service Layer Refactoring ⏸️ DEFERRED (Optional)

> [!NOTE]
> **This phase is optional.** The error handling system is fully functional with Phases 1-3 complete.
> Phase 4 is a larger architectural refactoring that can be done incrementally over time.

**Current State:** Services like `OrderManagerService` return `ResponseWithStatusCode<CrudOrderResponse>` objects. Controllers check the status and throw `HttpException` when needed.

**Why Defer?**
1. **High Risk**: `OrderManagerService` alone is 1,300+ lines with 20+ methods returning `ResponseWithStatusCode`
2. **Working System**: Controllers already convert response status codes to exceptions
3. **Breaking Changes**: Would require updating all service callers simultaneously
4. **Diminishing Returns**: The main benefits (centralized error handling, notifications) are already achieved

**If implementing later:**

| Task | Scope |
|------|-------|
| Refactor `OrderManagerService` | ~20 methods, 1,300 lines |
| Refactor `StoreCreditProviderService` | ~5 methods |
| Refactor `CatalogProviderService` | ~15 methods |
| Remove `ResponseWithStatusCode` | Type definitions, all usages |

**Recommended Approach:**
- Refactor one method at a time during regular maintenance
- Start with simpler services (e.g., `StoreCreditProviderService`)
- Add new methods using exception-based pattern

---

## ✅ Implementation Complete

**Summary of Changes:**

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Infrastructure - exception classes, filter, notification service |
| Phase 2 | ✅ Complete | New controllers automatically use new patterns |
| Phase 3 | ✅ Complete | All existing controllers migrated |
| Phase 4 | ⏸️ Deferred | Service layer refactoring (optional) |

**Files Created:**
- `src/exceptions/` - Custom domain exceptions (order, catalog, payment, printer)
- `src/filters/all-exceptions.filter.ts` - Global exception filter
- `src/config/error-notification/error-notification.service.ts` - Email notifications

**Files Modified:**
- `src/app.module.ts` - Registered global filter
- `src/config/config.module.ts` - Added ErrorNotificationService
- `src/controllers/` - All 6 controllers refactored

**Benefits Achieved:**
- ✅ Centralized error handling
- ✅ Automatic email notifications for 5xx errors on critical paths
- ✅ Consistent `WError[]` response format
- ✅ ~200 lines of boilerplate removed
- ✅ Custom exceptions for better error semantics

---

### File Summary

| Path | Description |
|------|-------------|
| `src/exceptions/index.ts` | Barrel export |
| `src/exceptions/order.exceptions.ts` | Order domain exceptions |
| `src/exceptions/catalog.exceptions.ts` | Catalog domain exceptions |
| `src/exceptions/payment.exceptions.ts` | Payment domain exceptions |
| `src/exceptions/printer.exceptions.ts` | Printer group exceptions |
| `src/config/error-notification/error-notification.service.ts` | Email notification service |
| `src/filters/all-exceptions.filter.ts` | Global exception filter |
| `src/filters/index.ts` | Filter barrel export |



