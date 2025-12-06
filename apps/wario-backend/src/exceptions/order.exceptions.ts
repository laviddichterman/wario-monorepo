/**
 * Custom domain exceptions for order-related errors.
 * These exceptions provide structured error responses following the WError format.
 */
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { WError } from '@wcp/wario-shared';

/**
 * Thrown when an order cannot be found by ID.
 */
export class OrderNotFoundException extends NotFoundException {
  constructor(orderId: string) {
    super({
      success: false,
      error: [{
        category: 'INVALID_REQUEST_ERROR',
        code: 'ORDER_NOT_FOUND',
        detail: `Order ${orderId} not found`,
      }] satisfies WError[],
    });
  }
}

/**
 * Thrown when attempting to modify an order that is already locked.
 */
export class OrderLockedException extends ConflictException {
  constructor(orderId: string) {
    super({
      success: false,
      error: [{
        category: 'INVALID_REQUEST_ERROR',
        code: 'ORDER_LOCKED',
        detail: `Order ${orderId} is already locked`,
      }] satisfies WError[],
    });
  }
}

/**
 * Thrown when an order is in an invalid state for the requested operation.
 */
export class InvalidOrderStateException extends UnprocessableEntityException {
  constructor(orderId: string, currentStatus: string, requiredStatus: string) {
    super({
      success: false,
      error: [{
        category: 'INVALID_REQUEST_ERROR',
        code: 'INVALID_ORDER_STATE',
        detail: `Order ${orderId} is in status '${currentStatus}' but requires '${requiredStatus}'`,
      }] satisfies WError[],
    });
  }
}

/**
 * Thrown when order validation fails.
 */
export class OrderValidationException extends BadRequestException {
  constructor(errors: WError[]) {
    super({
      success: false,
      error: errors,
    });
  }
}

/**
 * Thrown when an unexpected error occurs during order processing.
 */
export class OrderProcessingException extends InternalServerErrorException {
  constructor(detail: string, originalError?: unknown) {
    super({
      success: false,
      error: [{
        category: 'API_ERROR',
        code: 'ORDER_PROCESSING_ERROR',
        detail,
      }] satisfies WError[],
      originalError,
    });
  }
}
