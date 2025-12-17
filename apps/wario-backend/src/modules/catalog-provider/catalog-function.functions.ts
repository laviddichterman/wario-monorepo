/**
 * Pure functions for product instance function and order instance function CRUD operations.
 * These functions handle database operations only - the caller (CatalogProviderService)
 * is responsible for syncing and recomputing the catalog.
 */
import type { PinoLogger } from 'nestjs-pino';

import type { IProductInstanceFunction, OrderInstanceFunction } from '@wcp/wario-shared';

import type { IOptionRepository } from '../../repositories/interfaces/option.repository.interface';
import type { IOrderInstanceFunctionRepository } from '../../repositories/interfaces/order-instance-function.repository.interface';
import type { IProductInstanceFunctionRepository } from '../../repositories/interfaces/product-instance-function.repository.interface';
import type { IProductRepository } from '../../repositories/interfaces/product.repository.interface';

// ============================================================================
// Dependencies Interface
// ============================================================================

export interface FunctionDeps {
  productInstanceFunctionRepository: IProductInstanceFunctionRepository;
  orderInstanceFunctionRepository: IOrderInstanceFunctionRepository;
  optionRepository: IOptionRepository;
  productRepository: IProductRepository;
  logger: PinoLogger;
}

// ============================================================================
// Product Instance Function Operations
// ============================================================================

export async function createProductInstanceFunction(
  deps: FunctionDeps,
  productInstanceFunction: Omit<IProductInstanceFunction, 'id'>,
): Promise<IProductInstanceFunction> {
  return deps.productInstanceFunctionRepository.create(productInstanceFunction);
}

export async function updateProductInstanceFunction(
  deps: FunctionDeps,
  pifId: string,
  productInstanceFunction: Partial<Omit<IProductInstanceFunction, 'id'>>,
): Promise<IProductInstanceFunction | null> {
  return deps.productInstanceFunctionRepository.update(pifId, productInstanceFunction);
}

export interface DeleteProductInstanceFunctionResult {
  deleted: IProductInstanceFunction | null;
  optionsModified: number;
  productsModified: number;
}

export async function deleteProductInstanceFunction(
  deps: FunctionDeps,
  pifId: string,
): Promise<DeleteProductInstanceFunctionResult> {
  deps.logger.debug(`Removing Product Instance Function: ${pifId}`);

  // First find the function to ensure it exists
  const doc = await deps.productInstanceFunctionRepository.findById(pifId);
  if (!doc) {
    return { deleted: null, optionsModified: 0, productsModified: 0 };
  }

  // Delete the function
  await deps.productInstanceFunctionRepository.delete(pifId);

  // Remove references from options
  const optionsModified = await deps.optionRepository.clearEnableField(pifId);
  if (optionsModified > 0) {
    deps.logger.debug(`Removed ${pifId} from ${optionsModified.toString()} Modifier Options.`);
  }

  // Remove references from products
  const productsModified = await deps.productRepository.clearModifierEnableField(pifId);
  if (productsModified > 0) {
    deps.logger.debug(`Removed ${pifId} from ${productsModified.toString()} Products.`);
  }

  return {
    deleted: doc,
    optionsModified,
    productsModified,
  };
}

// ============================================================================
// Order Instance Function Operations
// ============================================================================

export async function createOrderInstanceFunction(
  deps: FunctionDeps,
  orderInstanceFunction: Omit<OrderInstanceFunction, 'id'>,
): Promise<OrderInstanceFunction> {
  return deps.orderInstanceFunctionRepository.create(orderInstanceFunction);
}

export async function updateOrderInstanceFunction(
  deps: FunctionDeps,
  id: string,
  orderInstanceFunction: Partial<Omit<OrderInstanceFunction, 'id'>>,
): Promise<OrderInstanceFunction | null> {
  return deps.orderInstanceFunctionRepository.update(id, orderInstanceFunction);
}

export async function deleteOrderInstanceFunction(
  deps: FunctionDeps,
  id: string,
): Promise<OrderInstanceFunction | null> {
  deps.logger.debug(`Removing Order Instance Function: ${id}`);
  const doc = await deps.orderInstanceFunctionRepository.findById(id);
  if (!doc) {
    return null;
  }
  await deps.orderInstanceFunctionRepository.delete(id);
  return doc;
}
