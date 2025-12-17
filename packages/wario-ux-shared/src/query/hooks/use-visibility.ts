import { useMemo } from 'react';
import React from 'react';

import {
  type CategoryVisibilityMap,
  ComputeCategoryVisibilityMap,
  ComputeProductLevelVisibilityCheck,
  type PotentiallyVisibleDisableReasons,
  type VisibleProductItem,
} from '@wcp/wario-shared/logic';

import { VisibilityMapContext } from '@/query/context/visibility-context-definition';

import { useCatalogSelectors, useValueFromCategoryById } from './useCatalogQuery';

// Re-export for backward compatibility
export type { CategoryVisibilityMap, VisibleProductItem };

/**
 * Hook that pre-computes visibility for an entire category tree.
 * Use at the root level to avoid redundant recursive computations.
 *
 * @param rootCategoryId - The root category ID to start traversal from
 * @param fulfillmentId - The fulfillment service ID for visibility checks
 * @param orderTime - The order/service time for availability checks
 * @param context - Either 'menu' or 'order' context
 * @param visibilityLogic - Function that determines if a product should be visible based on disable reason
 * @returns CategoryVisibilityMap with pre-computed products and populated children, or null if catalog not loaded
 */
export function useCategoryVisibilityMap(
  rootCategoryId: string,
  fulfillmentId: string,
  orderTime: Date | number,
  context: 'menu' | 'order',
  visibilityLogic: (reason: PotentiallyVisibleDisableReasons) => boolean,
): CategoryVisibilityMap | null {
  const catalogSelectors = useCatalogSelectors();

  return useMemo(() => {
    if (!catalogSelectors) return null;
    return ComputeCategoryVisibilityMap(
      catalogSelectors,
      rootCategoryId,
      fulfillmentId,
      orderTime,
      context,
      visibilityLogic,
    );
  }, [catalogSelectors, rootCategoryId, fulfillmentId, orderTime, context, visibilityLogic]);
}

/**
 * Result of useCategoryVisibility hook.
 */
export interface CategoryVisibilityResult {
  /** Visible products directly in this category */
  products: VisibleProductItem[];
  /** Subcategory IDs that have visible products (directly or in descendants) */
  populatedChildren: string[];
}

/**
 * Hook to get visibility data for a specific category from the pre-computed map.
 * Must be used within a VisibilityMapProvider.
 *
 * @param categoryId - The category ID to get visibility data for
 * @returns Products and populated children for the category
 * @throws Error if used outside of VisibilityMapProvider
 *
 * @example
 * ```tsx
 * function CategorySection({ categoryId }: { categoryId: string }) {
 *   const { products, populatedChildren } = useCategoryVisibility(categoryId);
 *   return (
 *     <>
 *       {products.map(item => <ProductCard key={item.productInstance.id} {...item} />)}
 *       {populatedChildren.map(childId => <CategorySection key={childId} categoryId={childId} />)}
 *     </>
 *   );
 * }
 * ```
 */
export function useCategoryVisibility(categoryId: string): CategoryVisibilityResult {
  const visibilityMap = React.useContext(VisibilityMapContext);

  const result = useMemo(
    () => ({
      products: visibilityMap?.products.get(categoryId) ?? [],
      populatedChildren: visibilityMap?.populatedChildren.get(categoryId) ?? [],
    }),
    [visibilityMap, categoryId],
  );

  if (!visibilityMap) {
    throw new Error('useCategoryVisibility must be used within a VisibilityMapProvider');
  }

  return result;
}

/**
 * Hook that computes all visible product instances for a category.
 * This is the single source of truth for visibility logic.
 *
 * Use this hook to:
 * - Get the count of visible products (result.length)
 * - Render visible products by mapping over the result
 *
 * @param categoryId - The ID of the category to get visible products for
 * @param fulfillmentId - The fulfillment service ID for visibility checks
 * @param orderTime - The order/service time for availability checks
 * @param context - either the menu or order context
 * @param visbilityLogic - function that takes a PotentiallyVisibleDisableReasons and returns if the product should be visible
 * @returns Array of VisibleProductItem objects, empty array if none are visible
 */
export const useVisibleProductsInCategory = (
  categoryId: string,
  fulfillmentId: string,
  orderTime: Date | number,
  context: 'menu' | 'order',
  visibilityLogic: (reason: PotentiallyVisibleDisableReasons) => boolean,
): VisibleProductItem[] => {
  const catalogSelectors = useCatalogSelectors();
  const productIdsInCategory = useValueFromCategoryById(categoryId, 'products');

  return useMemo(() => {
    if (!productIdsInCategory || !catalogSelectors) return [];

    return productIdsInCategory.flatMap((productId): VisibleProductItem[] => {
      const product = catalogSelectors.productEntry(productId);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!product) return [];

      return ComputeProductLevelVisibilityCheck(
        catalogSelectors,
        product,
        fulfillmentId,
        orderTime,
        context,
        visibilityLogic,
      );
    });
  }, [productIdsInCategory, fulfillmentId, orderTime, catalogSelectors, context, visibilityLogic]);
};
