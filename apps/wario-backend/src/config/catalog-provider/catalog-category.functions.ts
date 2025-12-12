/**
 * Pure functions for category CRUD operations.
 *
 * 2025 Schema: Categories use children[] and products[] arrays for hierarchy.
 * No parent_id field - parent manages its children array.
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

/**
 * Update a category.
 * Note: With 2025 schema, parent-child relationships are managed via the parent's children[] array,
 * not via a parent_id on the child. Moving a category requires updating the old parent's children
 * array (to remove) and the new parent's children array (to add).
 */
export async function updateCategory(
  deps: CategoryDeps,
  categoryId: string,
  category: Partial<Omit<ICategory, 'id'>>,
): Promise<ICategory | null> {
  if (!Object.hasOwn(deps.categories, categoryId)) {
    // not found
    return null;
  }

  const response = await deps.categoryRepository.update(categoryId, category);
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

  // 4. Remove this category from any parent's children array
  // In 2025 schema, we need to find the parent that has this category in its children array
  // and remove it from there
  // This is very inefficient, but it's the only way to do it AT THE MOMENT
  // TODO: in a post mongoose world, migrate this to be more efficient
  await Promise.all(
    Object.values(deps.categories).map(async (cat) => {
      if (cat.children.includes(categoryId)) {
        const updatedChildren = cat.children.filter((id) => id !== categoryId);
        await deps.categoryRepository.update(cat.id, { children: updatedChildren });
      }
    }),
  );

  // 5. Handle contained products
  let productsModified = false;
  if (deleteContainedProducts) {
    // Products in this category are in existing.products
    const productsToDelete = existing.products;
    if (productsToDelete.length > 0) {
      await deps.batchDeleteProducts(productsToDelete, true);
      productsModified = true;
    }
  } else {
    // Remove products from this category (they become orphaned)
    // In 2025 schema, products don't have category_ids, so we just need to clear
    // the category's products array (already deleted above)
    if (existing.products.length > 0) {
      deps.logger.debug(
        `Category ${categoryId} had ${String(existing.products.length)} products that might be orphaned.`,
      );
      productsModified = true;
    }
  }

  return { deleted: existing, productsModified };
}
