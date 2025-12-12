import { useMemo } from 'react';
import React from 'react';

import {
  type CategoryVisibilityMap,
  ComputeCategoryVisibilityMap,
  ComputeProductLevelVisibilityCheck,
  type IProduct,
  type IProductInstance,
  type PotentiallyVisibleDisableReasons,
  type VisibleProductItem,
  type WCPProductGenerateMetadata,
} from '@wcp/wario-shared';

import { useCatalogSelectors, useValueFromCategoryById } from './hooks';

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
 * Context for providing a pre-computed CategoryVisibilityMap to descendant components.
 * Use with VisibilityMapProvider at the root and useCategoryVisibility in descendants.
 */
export const VisibilityMapContext = React.createContext<CategoryVisibilityMap | null>(null);

/**
 * Provider component that wraps children with access to a pre-computed visibility map.
 * Compute the map at the root level using useCategoryVisibilityMap, then pass it here.
 *
 * @example
 * ```tsx
 * const visibilityMap = useCategoryVisibilityMap(rootId, fulfillmentId, orderTime, 'menu', ShowTemporarilyDisabledProducts);
 * if (!visibilityMap) return <LoadingScreen />;
 * return (
 *   <VisibilityMapProvider value={visibilityMap}>
 *     <MyMenuTree categoryId={rootId} />
 *   </VisibilityMapProvider>
 * );
 * ```
 */
export function VisibilityMapProvider({
  value,
  children,
}: {
  value: CategoryVisibilityMap;
  children: React.ReactNode;
}) {
  return <VisibilityMapContext.Provider value={value}>{children}</VisibilityMapContext.Provider>;
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

/**
 * Base props that any product display component must accept.
 * The factory will pass these props to your component after handling all visibility/filtering logic.
 */
export interface ProductDisplayBaseProps {
  fulfillmentId: string;
  metadata: NonNullable<ReturnType<typeof WCPProductGenerateMetadata>>;
  productInstance: IProductInstance;
  product: IProduct;
  visibilityLogic: (reason: PotentiallyVisibleDisableReasons) => boolean;
}

/**
 * Props required by CategoryShopper component created by the factory.
 */
export interface CategoryShopperBaseProps {
  categoryId: string;
  fulfillmentId: string;
  orderTime: Date | number;
}

/**
 * Factory that wraps a product display component with visibility/filtering logic.
 * Returns a CategoryShopper component that can be used to display all products in a category.
 *
 * @typeParam TExtraProps - Additional props that the display component needs beyond ProductDisplayBaseProps
 *
 * @example
 * ```tsx
 * // Define your display component with extra props
 * interface MyExtraProps {
 *   onSelect: (id: string) => void;
 *   sourceCategoryId: string;
 * }
 *
 * const MyProductCard = ({
 *   fulfillmentId,
 *   metadata,
 *   productInstance,
 *   onSelect,
 *   sourceCategoryId
 * }: ProductDisplayBaseProps & MyExtraProps) => (
 *   <div onClick={() => onSelect(productInstance.id)}>
 *     {metadata.name} - {metadata.price}
 *   </div>
 * );
 *
 * // Create the category shopper with order display flag getter
 * const MyCategoryShopper = createCategoryShopper<MyExtraProps>(MyProductCard, GetOrderHideDisplayFlag);
 *
 * // Use it - pass fulfillmentId and orderTime along with extra props
 * <MyCategoryShopper
 *   categoryId="pizza-category"
 *   fulfillmentId={selectedService}
 *   orderTime={serviceDateTime}
 *   onSelect={handleSelect}
 *   sourceCategoryId="pizza-category"
 * />
 * ```
 */
export function createCategoryShopper<TExtraProps extends object = object>(
  DisplayComponent: React.ComponentType<ProductDisplayBaseProps & TExtraProps>,
  context: 'menu' | 'order',
  visibilityLogic: (reason: PotentiallyVisibleDisableReasons) => boolean,
) {
  /**
   * Component that displays all visible products in a category using the injected DisplayComponent.
   * Returns null if no products are visible.
   */
  function CategoryShopper(props: CategoryShopperBaseProps & TExtraProps) {
    const { categoryId, fulfillmentId, orderTime, ...extraProps } = props;
    const visibleProducts = useVisibleProductsInCategory(
      categoryId,
      fulfillmentId,
      orderTime,
      context,
      visibilityLogic,
    );
    if (visibleProducts.length === 0) {
      return null;
    }

    return (
      <>
        {visibleProducts.map((item) => (
          <DisplayComponent
            key={item.productInstance.id}
            fulfillmentId={fulfillmentId}
            visibilityLogic={visibilityLogic}
            metadata={item.metadata}
            productInstance={item.productInstance}
            product={item.product}
            {...(extraProps as TExtraProps)}
          />
        ))}
      </>
    );
  }

  return CategoryShopper;
}
