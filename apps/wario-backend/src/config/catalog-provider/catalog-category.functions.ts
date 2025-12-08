/**
 * Pure functions for category CRUD operations.
 */
import type { PinoLogger } from 'nestjs-pino';

import type { FulfillmentConfig, ICatalog, ICategory } from '@wcp/wario-shared';

import type { ICategoryRepository } from '../../repositories/interfaces/category.repository.interface';
import type { IProductRepository } from '../../repositories/interfaces/product.repository.interface';

// ============================================================================
// Dependencies Interface
// ============================================================================

export interface CategoryDeps {
  categoryRepository: ICategoryRepository;
  productRepository: IProductRepository;
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
  return deps.categoryRepository.create(category);
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

      cycleUpdatePromise = deps.categoryRepository.update(cur, { parent_id: null });
    }
  }

  const response = await deps.categoryRepository.update(categoryId, category);

  if (cycleUpdatePromise) {
    await cycleUpdatePromise;
  }

  return response;
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

  // 2. Get the category before deletion
  const existing = await deps.categoryRepository.findById(categoryId);
  if (!existing) {
    return { deleted: null, productsModified: false };
  }

  // 3. Delete from DB
  await deps.categoryRepository.delete(categoryId);

  // 4. Update children (flatten hierarchy)
  await Promise.all(
    Object.values(deps.categories).map(async (cat) => {
      if (cat.parent_id && cat.parent_id === categoryId) {
        await deps.categoryRepository.update(cat.id, { parent_id: null });
      }
    }),
  );

  // 5. Handle contained products
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
    const modifiedCount = await deps.productRepository.removeCategoryFromAll(categoryId);

    if (modifiedCount > 0) {
      deps.logger.debug(`Removed Category ID from ${modifiedCount.toString()} products.`);
      productsModified = true;
    }
  }

  return { deleted: existing, productsModified };
}
