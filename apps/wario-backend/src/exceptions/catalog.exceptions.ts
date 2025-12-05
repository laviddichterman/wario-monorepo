/**
 * Custom domain exceptions for catalog-related errors.
 * These exceptions provide structured error responses following the WError format.
 */
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import type { WError } from '@wcp/wario-shared';

/**
 * Thrown when a product cannot be found by ID.
 */
export class ProductNotFoundException extends NotFoundException {
  constructor(productId: string) {
    super({
      success: false,
      error: [{
        category: 'INVALID_REQUEST_ERROR',
        code: 'PRODUCT_NOT_FOUND',
        detail: `Product ${productId} not found`,
      }] satisfies WError[],
    });
  }
}

/**
 * Thrown when a product instance cannot be found by ID.
 */
export class ProductInstanceNotFoundException extends NotFoundException {
  constructor(productInstanceId: string) {
    super({
      success: false,
      error: [{
        category: 'INVALID_REQUEST_ERROR',
        code: 'PRODUCT_INSTANCE_NOT_FOUND',
        detail: `Product instance ${productInstanceId} not found`,
      }] satisfies WError[],
    });
  }
}

/**
 * Thrown when a category cannot be found by ID.
 */
export class CategoryNotFoundException extends NotFoundException {
  constructor(categoryId: string) {
    super({
      success: false,
      error: [{
        category: 'INVALID_REQUEST_ERROR',
        code: 'CATEGORY_NOT_FOUND',
        detail: `Category ${categoryId} not found`,
      }] satisfies WError[],
    });
  }
}

/**
 * Thrown when a modifier type cannot be found by ID.
 */
export class ModifierTypeNotFoundException extends NotFoundException {
  constructor(modifierTypeId: string) {
    super({
      success: false,
      error: [{
        category: 'INVALID_REQUEST_ERROR',
        code: 'MODIFIER_TYPE_NOT_FOUND',
        detail: `Modifier type ${modifierTypeId} not found`,
      }] satisfies WError[],
    });
  }
}

/**
 * Thrown when a modifier option cannot be found by ID.
 */
export class ModifierOptionNotFoundException extends NotFoundException {
  constructor(modifierOptionId: string) {
    super({
      success: false,
      error: [{
        category: 'INVALID_REQUEST_ERROR',
        code: 'MODIFIER_OPTION_NOT_FOUND',
        detail: `Modifier option ${modifierOptionId} not found`,
      }] satisfies WError[],
    });
  }
}

/**
 * Thrown when catalog creation or update fails unexpectedly.
 */
export class CatalogOperationException extends InternalServerErrorException {
  constructor(operation: string, detail: string) {
    super({
      success: false,
      error: [{
        category: 'API_ERROR',
        code: 'CATALOG_OPERATION_FAILED',
        detail: `Failed to ${operation}: ${detail}`,
      }] satisfies WError[],
    });
  }
}
