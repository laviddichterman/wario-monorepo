# Migration Critique: wcp-order-backend to wario-backend

## Overview

The migration of `wcp-order-backend` to NestJS in `wario-backend` shows a mix of direct porting and some NestJS adaptation. While the basic structure of Controllers and Services is present, there are several areas where the implementation deviates from NestJS best practices, potentially impacting maintainability, scalability, and testing.

## 1. Architecture & Design

### God Class: `OrderManagerService`

The `OrderManagerService` is a massive class (over 2000 lines) that violates the Single Responsibility Principle. It handles:

- Order creation and management
- Email notifications (via `GoogleService`)
- Payment processing (via `SquareService`)
- Background tasks (via `setInterval`)
- Business logic (e.g., cart rebuilding, lead time calculation)

**Recommendation:** Refactor this service into smaller, focused services:

- `OrderNotificationService`: for emails.
- `OrderPaymentService`: for Square interactions.
- `OrderBackgroundService`: for scheduled tasks.
- Domain-specific services or models for business logic (e.g., `CartService`, `FulfillmentService`).

### Background Tasks

The `Bootstrap` method in `OrderManagerService` uses `setInterval` to schedule background tasks. This is not idiomatic in NestJS.

**Recommendation:** Use `@nestjs/schedule` and `@Cron` decorators to manage background tasks. This provides better integration, error handling, and testing capabilities.

## 2. Error Handling

### Custom Error Handling vs. Exception Filters

The `OrderController` uses a private method `SendFailureNoticeOnErrorCatch` to catch errors and send emails. This logic is repeated in every controller method.

**Recommendation:** Implement a Global Exception Filter (e.g., `AllExceptionsFilter`) to catch unhandled exceptions, log them, and send notifications if necessary. This removes boilerplate from the controller and ensures consistent error handling.

### Return Values

The controller methods return a `response` object directly, often checking `response.status` to throw exceptions.

**Recommendation:** Use standard NestJS HTTP Exceptions (e.g., `BadRequestException`, `NotFoundException`) within the service or controller. The controller should return the data directly, and NestJS will handle the status codes. Alternatively, use a Response Interceptor to standardize the API response format.

## 3. Security

### Request Object Mutation ✅ RESOLVED

~~The `OrderLockInterceptor` mutates the `request` object to add `lockedOrder` and `idempotencyKey`. While common in Express, this can lead to typing issues and implicit dependencies.~~

**Solution Implemented:** Created custom parameter decorators (`@LockedOrder()` and `@IdempotencyKey()` in `src/decorators/`) to extract this information from the execution context in the controller, rather than relying on the mutated request object. The controller now uses these decorators and passes the pre-locked order directly to service methods (`CancelLockedOrder`, `ConfirmLockedOrder`, etc.), eliminating duplicate locking logic.

### IP Address Access

The `postOrder` method accesses `req.headers` and `req.socket` directly to get the IP address.

**Recommendation:** Use the `@Ip()` decorator provided by NestJS or a custom decorator if more complex logic (like `x-forwarded-for`) is needed.

### Idempotency

The `idempotency-key` header is checked in the interceptor, but it's not consistently used in the controller methods (e.g., commented out in `putCancelOrder`).

**Recommendation:** Ensure `idempotency-key` is correctly passed to all state-changing methods in the service to prevent duplicate operations.

## 4. Code Quality & Idiomatic Usage

### `Bootstrap` Method

The `Bootstrap` method in `OrderManagerService` is defined as an arrow function property (`Bootstrap = () => { ... }`). This is unusual for a class method and can cause issues with `this` binding if not careful (though arrow functions handle `this` lexically, it's not the standard way to define methods in a class).

**Recommendation:** Change it to a regular class method: `async onModuleInit() { this.Bootstrap(); }` and `private Bootstrap() { ... }`.

### Hardcoded Values

There are hardcoded values like area codes, email addresses, and configuration keys scattered throughout the code.

**Recommendation:** Move these to a configuration file or environment variables, accessed via `ConfigService`.

### Typing

There are instances of `any` or `unknown` usage, and some complex types that could be simplified or better defined with DTOs.

## 5. Testing

The current structure with the "God Class" `OrderManagerService` makes unit testing difficult, as you have to mock many dependencies and internal states. Breaking it down will significantly improve testability.

## Summary

The migration is functional but requires refactoring to align with NestJS best practices. Prioritize breaking down `OrderManagerService` and standardizing error handling to improve the codebase's health.
