/**
 * Pure functions for product instance function and order instance function CRUD operations.
 * These functions handle database operations only - the caller (CatalogProviderService)
 * is responsible for syncing and recomputing the catalog.
 */
import type { Model } from 'mongoose';
import type { PinoLogger } from 'nestjs-pino';

import type { IOption, IProduct, IProductInstanceFunction, OrderInstanceFunction } from '@wcp/wario-shared';

// ============================================================================
// Dependencies Interface
// ============================================================================

export interface FunctionDeps {
  wProductInstanceFunctionModel: Model<IProductInstanceFunction>;
  wOrderInstanceFunctionModel: Model<OrderInstanceFunction>;
  wOptionModel: Model<IOption>;
  wProductModel: Model<IProduct>;
  logger: PinoLogger;
}

// ============================================================================
// Product Instance Function Operations
// ============================================================================

export async function createProductInstanceFunction(
  deps: FunctionDeps,
  productInstanceFunction: Omit<IProductInstanceFunction, 'id'>,
): Promise<IProductInstanceFunction> {
  const doc = new deps.wProductInstanceFunctionModel(productInstanceFunction);
  await doc.save();
  return doc.toObject();
}

export async function updateProductInstanceFunction(
  deps: FunctionDeps,
  pifId: string,
  productInstanceFunction: Partial<Omit<IProductInstanceFunction, 'id'>>,
): Promise<IProductInstanceFunction | null> {
  const updated = await deps.wProductInstanceFunctionModel
    .findByIdAndUpdate(pifId, productInstanceFunction, { new: true })
    .exec();
  if (!updated) {
    return null;
  }
  return updated.toObject();
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

  const doc = await deps.wProductInstanceFunctionModel.findByIdAndDelete(pifId).exec();
  if (!doc) {
    return { deleted: null, optionsModified: 0, productsModified: 0 };
  }

  // Remove references from options
  const optionsUpdate = await deps.wOptionModel
    .updateMany({ enable: pifId }, { $set: { enable: null } })
    .exec();
  if (optionsUpdate.modifiedCount > 0) {
    deps.logger.debug(`Removed ${doc.id as string} from ${optionsUpdate.modifiedCount.toString()} Modifier Options.`);
  }

  // Remove references from products
  const productsUpdate = await deps.wProductModel
    .updateMany({ 'modifiers.enable': pifId }, { $set: { 'modifiers.$.enable': null } })
    .exec();
  if (productsUpdate.modifiedCount > 0) {
    deps.logger.debug(`Removed ${doc.id as string} from ${productsUpdate.modifiedCount.toString()} Products.`);
  }

  return {
    deleted: doc.toObject(),
    optionsModified: optionsUpdate.modifiedCount,
    productsModified: productsUpdate.modifiedCount,
  };
}

// ============================================================================
// Order Instance Function Operations
// ============================================================================

export async function createOrderInstanceFunction(
  deps: FunctionDeps,
  orderInstanceFunction: Omit<OrderInstanceFunction, 'id'>,
): Promise<OrderInstanceFunction> {
  const doc = new deps.wOrderInstanceFunctionModel(orderInstanceFunction);
  await doc.save();
  return doc.toObject();
}

export async function updateOrderInstanceFunction(
  deps: FunctionDeps,
  id: string,
  orderInstanceFunction: Partial<Omit<OrderInstanceFunction, 'id'>>,
): Promise<OrderInstanceFunction | null> {
  const updated = await deps.wOrderInstanceFunctionModel.findByIdAndUpdate(
    id,
    orderInstanceFunction,
    { new: true }
  );
  if (!updated) {
    return null;
  }
  return updated.toObject();
}

export async function deleteOrderInstanceFunction(
  deps: FunctionDeps,
  id: string,
): Promise<OrderInstanceFunction | null> {
  deps.logger.debug(`Removing Order Instance Function: ${id}`);
  const doc = await deps.wOrderInstanceFunctionModel.findByIdAndDelete(id);
  if (!doc) {
    return null;
  }
  return doc.toObject();
}
