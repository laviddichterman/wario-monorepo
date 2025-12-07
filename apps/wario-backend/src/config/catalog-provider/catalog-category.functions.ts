/**
 * Pure functions for category CRUD operations.
 */
import type { Model } from 'mongoose';
import type { PinoLogger } from 'nestjs-pino';

import type { FulfillmentConfig, ICatalog, ICategory, IProduct } from '@wcp/wario-shared';

// ============================================================================
// Dependencies Interface
// ============================================================================

export interface CategoryDeps {
  wCategoryModel: Model<ICategory>;
  wProductModel: Model<IProduct>;
  logger: PinoLogger;

  // State needed for validation/logic
  fulfillments: Record<string, FulfillmentConfig>;
  categories: Record<string, ICategory>;
  catalog: ICatalog; // For accessing catalog.categories[id].products

  // Callbacks for external impacts
  batchDeleteProducts: (productIds: string[], suppressRecompute: boolean) => Promise<unknown>;
}

// ============================================================================
// Category Operations
// ============================================================================

export async function createCategory(deps: CategoryDeps, category: Omit<ICategory, 'id'>): Promise<ICategory> {
  const doc = new deps.wCategoryModel(category);
  await doc.save();
  return doc.toObject();
}

// TODO: support Partial update
export async function updateCategory(
  deps: CategoryDeps,
  categoryId: string,
  category: Partial<Omit<ICategory, 'id'>>,
): Promise<ICategory | null> {
  if (!Object.hasOwn(deps.categories, categoryId)) {
    // not found
    return null;
  }

  let cycleUpdatePromise: Promise<unknown> | null = null;
  const currentCategory = deps.categories[categoryId];

  if (currentCategory.parent_id !== category.parent_id && category.parent_id) {
    // need to check for potential cycle
    let cur: string | null = category.parent_id;
    while (cur && deps.categories[cur].parent_id !== categoryId) {
      cur = deps.categories[cur].parent_id;
    }

    // if the cursor is not empty/null/blank then we stopped because we found the cycle
    if (cur) {
      deps.logger.debug(
        `In changing ${categoryId}'s parent_id to ${category.parent_id}, found cycle at ${cur}, blanking out ${cur}'s parent_id to prevent cycle.`,
      );

      cycleUpdatePromise = deps.wCategoryModel.findByIdAndUpdate(cur, { parent_id: null }, { new: true }).exec();
    }
  }

  const response = await deps.wCategoryModel.findByIdAndUpdate(categoryId, category, { new: true }).exec();

  if (cycleUpdatePromise) {
    await cycleUpdatePromise;
  }

  if (!response) {
    return null;
  }

  return response.toObject();
}

export async function deleteCategory(
  deps: CategoryDeps,
  categoryId: string,
  deleteContainedProducts: boolean,
): Promise<{ deleted: ICategory | null; productsModified: boolean }> {
  deps.logger.debug(`Removing ${categoryId}`);

  // 1. Validation: make sure this isn't used in a fulfillment
  Object.values(deps.fulfillments).forEach((x) => {
    if (x.menuBaseCategoryId === categoryId) {
      throw Error(`CategoryId: ${categoryId} found as Menu Base for FulfillmentId: ${x.id} (${x.displayName})`);
    }
    if (x.orderBaseCategoryId === categoryId) {
      throw Error(`CategoryId: ${categoryId} found as Order Base for FulfillmentId: ${x.id} (${x.displayName})`);
    }
    if (x.orderSupplementaryCategoryId === categoryId) {
      throw Error(
        `CategoryId: ${categoryId} found as Order Supplementary for FulfillmentId: ${x.id} (${x.displayName})`,
      );
    }
  });

  // 2. Delete from DB
  const doc = await deps.wCategoryModel.findByIdAndDelete(categoryId).exec();
  if (!doc) {
    return { deleted: null, productsModified: false };
  }

  // 3. Update children (flatten hierarchy)
  await Promise.all(
    Object.values(deps.categories).map(async (cat) => {
      if (cat.parent_id && cat.parent_id === categoryId) {
        await deps.wCategoryModel.findByIdAndUpdate(cat.id, { parent_id: null }, { new: true }).exec();
      }
    }),
  );

  // 4. Handle contained products
  let productsModified = false;
  if (deleteContainedProducts) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const productsToDelete = deps.catalog.categories[categoryId]?.products ?? [];
    if (productsToDelete.length > 0) {
      await deps.batchDeleteProducts(productsToDelete, true);
      productsModified = true; // batchDeleteProducts might handle sync, but we flag it anyway
    }
  } else {
    // Remove category reference from products
    const productsUpdate = await deps.wProductModel.updateMany({}, { $pull: { category_ids: categoryId } }).exec();

    if (productsUpdate.modifiedCount > 0) {
      deps.logger.debug(`Removed Category ID from ${productsUpdate.modifiedCount.toString()} products.`);
      productsModified = true;
    }
  }

  return { deleted: doc.toObject(), productsModified };
}
