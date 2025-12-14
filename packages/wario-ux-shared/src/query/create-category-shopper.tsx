import React from 'react';

import { type PotentiallyVisibleDisableReasons } from '@wcp/wario-shared/logic';
import { type IProduct, type IProductInstance, type WProductMetadata } from '@wcp/wario-shared/types';

import { useVisibleProductsInCategory } from './hooks/use-visibility';

/**
 * Base props that any product display component must accept.
 * The factory will pass these props to your component after handling all visibility/filtering logic.
 */
export interface ProductDisplayBaseProps {
  fulfillmentId: string;
  metadata: WProductMetadata;
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
