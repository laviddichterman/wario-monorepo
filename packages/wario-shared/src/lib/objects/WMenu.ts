import { DisableDataCheck, IsSomethingDisabledForFulfillment } from '../common';
import type {
  FulfillmentConfig,
  IOption,
  IOptionType,
  IProduct,
  IProductInstance,
  IProductInstanceDisplayFlags,
  IProductModifier,
  ProductInstanceModifierEntry,
} from '../derived-types';
import { DISABLE_REASON, OptionPlacement } from '../enums';
import type { ICatalogSelectors, WProductMetadata } from '../types';
import { type Selector } from '../utility-types';

import { WCPProductGenerateMetadata } from './WCPProduct';

export type PotentiallyVisibleDisableReasons = ReturnType<typeof DisableDataCheck>['enable'];

export const ShowTemporarilyDisabledProducts = (reason: PotentiallyVisibleDisableReasons) => {
  // Show enabled products and blanket-disabled (temporarily disabled) products
  return reason !== DISABLE_REASON.DISABLED_BLANKET;
};

export const ShowCurrentlyAvailableProducts = (reason: PotentiallyVisibleDisableReasons) => {
  return reason === DISABLE_REASON.ENABLED;
};

/**
 * Represents a visible product instance with all computed metadata.
 */
export interface VisibleProductItem {
  product: IProduct;
  productInstance: IProductInstance;
  metadata: WProductMetadata;
}

/**
 * Computes if a product and its menu instances are visible.
 * This is the single source of truth for visibility logic.
 *
 * @param catalogSelectors - The catalog selectors to use for looking up product instances and options
 * @param product - The product to compute visibility for
 * @param fulfillmentId - The fulfillment service ID for visibility checks
 * @param orderTime - The order/service time for availability checks
 * @param context - either the menu or order context
 * @param visibilityLogic - function that takes a PotentiallyVisibleDisableReasons and returns true if the product should be visible
 * @returns an array of visible product instances if the product is visible, otherwise an empty array
 */
export const ComputeProductLevelVisibilityCheck = (
  catalogSelectors: ICatalogSelectors,
  product: IProduct,
  fulfillmentId: string,
  orderTime: Date | number,
  context: 'menu' | 'order',
  visibilityLogic: (reason: PotentiallyVisibleDisableReasons) => boolean,
) => {
  // Product-level visibility check
  if (IsSomethingDisabledForFulfillment(product, fulfillmentId)) return [];
  if (!visibilityLogic(DisableDataCheck(product.disabled, product.availability, orderTime).enable)) {
    return [];
  }

  // Collect all product instances, filter nulls, sort by context ordinal, then apply visibility checks
  const instances = product.instances
    .map((instanceId) => catalogSelectors.productInstance(instanceId))

    .filter((instance): instance is IProductInstance => instance !== undefined)
    .sort((a, b) => a.displayFlags[context].ordinal - b.displayFlags[context].ordinal);

  return instances.flatMap((productInstance): VisibleProductItem[] => {
    // Check display flags - skip if product is hidden
    if (
      context === 'menu'
        ? GetMenuHideDisplayFlag(productInstance.displayFlags)
        : GetOrderHideDisplayFlag(productInstance.displayFlags)
    )
      return [];

    // Check modifier-level visibility
    const potentiallyVisible = ComputePotentiallyVisible(
      catalogSelectors,
      fulfillmentId,
      orderTime,
      product,
      productInstance.modifiers,
    );
    if (!visibilityLogic(potentiallyVisible)) return [];

    // Compute metadata
    const metadata = WCPProductGenerateMetadata(
      product.id,
      productInstance.modifiers,
      catalogSelectors,
      orderTime,
      fulfillmentId,
    );

    return [{ product, productInstance, metadata }];
  });
};

/**
 * Result of pre-computing visibility for an entire category tree.
 * Maps categoryId -> array of visible products in that category.
 */
export interface CategoryVisibilityMap {
  /** Maps categoryId -> visible products directly in that category */
  products: Map<string, VisibleProductItem[]>;
  /** Maps categoryId -> subcategory IDs that have visible products (directly or in descendants) */
  populatedChildren: Map<string, string[]>;
}

/**
 * Pre-computes all visible products for an entire category tree in a single pass.
 * Returns a map that can be queried without redundant computation.
 *
 * @param catalogSelectors - The catalog selectors for looking up categories and products
 * @param rootCategoryId - The root category ID to start traversal from
 * @param fulfillmentId - The fulfillment service ID for visibility checks
 * @param orderTime - The order/service time for availability checks
 * @param context - Either 'menu' or 'order' context
 * @param visibilityLogic - Function that determines if a product should be visible based on disable reason
 * @returns CategoryVisibilityMap with pre-computed products and populated children
 */
export function ComputeCategoryVisibilityMap(
  catalogSelectors: ICatalogSelectors,
  rootCategoryId: string,
  fulfillmentId: string,
  orderTime: Date | number,
  context: 'menu' | 'order',
  visibilityLogic: (reason: PotentiallyVisibleDisableReasons) => boolean,
): CategoryVisibilityMap {
  const products = new Map<string, VisibleProductItem[]>();
  const populatedChildren = new Map<string, string[]>();

  /**
   * Recursively traverses the category tree, computing visibility.
   * Returns true if this category or any descendant has visible products.
   */
  function traverse(categoryId: string): boolean {
    const category = catalogSelectors.category(categoryId);
    if (!category || category.serviceDisable.includes(fulfillmentId)) {
      return false;
    }

    // Compute visible products for this category
    const visibleProducts = category.products.flatMap((productId) => {
      const product = catalogSelectors.productEntry(productId);
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
    products.set(categoryId, visibleProducts);

    // Recursively process children and track which are populated
    const populated: string[] = [];
    for (const childId of category.children) {
      if (traverse(childId)) {
        populated.push(childId);
      }
    }
    populatedChildren.set(categoryId, populated);

    // This category is "populated" if it has products OR populated children
    return visibleProducts.length > 0 || populated.length > 0;
  }

  traverse(rootCategoryId);

  return { products, populatedChildren };
}

/**
 * Pure function to compute if a product instance is potentially visible.
 * Extracted from useDetermineIfPotentiallyVisible hook for reuse in data computation.
 * This check is used AFTER the hidden check
 */
export function ComputePotentiallyVisible(
  catalogSelectors: ICatalogSelectors,
  fulfillmentId: string,
  orderTime: Date | number,
  product: IProduct,
  productInstanceModifiers: ProductInstanceModifierEntry[],
): PotentiallyVisibleDisableReasons {
  const disableCheck = productInstanceModifiers.flatMap(
    (productInstanceModEntry: ProductInstanceModifierEntry): PotentiallyVisibleDisableReasons[] => {
      const productModifierDefinition = product.modifiers.find(
        (x) => x.mtid === productInstanceModEntry.modifierTypeId,
      ) as IProductModifier;
      return [
        ...productInstanceModEntry.options.map((x): PotentiallyVisibleDisableReasons => {
          const modifierOption = catalogSelectors.option(x.optionId) as IOption;
          return DisableDataCheck(modifierOption.disabled, modifierOption.availability, orderTime).enable;
        }),
        IsSomethingDisabledForFulfillment(productModifierDefinition, fulfillmentId)
          ? DISABLE_REASON.DISABLED_BLANKET
          : DISABLE_REASON.ENABLED,
      ];
    },
  );
  return disableCheck.reduce((acc, reason) => DisableReasonAccumulator(acc, reason), DISABLE_REASON.ENABLED);
}

/**
 * Accumulates disable reasons, returning the "most disabled" reason.
 * Generally used to determine if the disable reason is either strictly enabled or strictly disabled.
 * @param current current disable reason
 * @param next next disable reason to accumulate
 * @returns the accumulated disable reason
 */
export const DisableReasonAccumulator = (
  current: PotentiallyVisibleDisableReasons,
  next: PotentiallyVisibleDisableReasons,
) => {
  if (current === DISABLE_REASON.DISABLED_BLANKET || next === DISABLE_REASON.DISABLED_BLANKET) {
    return DISABLE_REASON.DISABLED_BLANKET;
  }
  //TODO time and availability are similar and i'm not sure which is "MORE" disabled
  if (current === DISABLE_REASON.DISABLED_TIME || next === DISABLE_REASON.DISABLED_TIME) {
    return DISABLE_REASON.DISABLED_TIME;
  }
  if (current === DISABLE_REASON.DISABLED_AVAILABILITY || next === DISABLE_REASON.DISABLED_AVAILABILITY) {
    return DISABLE_REASON.DISABLED_AVAILABILITY;
  }
  return DISABLE_REASON.ENABLED;
};

export const CheckRequiredModifiersAreAvailable = (
  product: IProduct,
  modifiers: ProductInstanceModifierEntry[],
  optionSelector: ICatalogSelectors['option'],
  order_time: Date | number,
  fulfillmentId: string,
) => {
  let passes = true;
  modifiers.forEach((productInstanceModifierEntry) => {
    // TODO: for incomplete product instances, this should check for a viable way to order the product
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const productModifierDefinition = product.modifiers.find(
      (x) => x.mtid === productInstanceModifierEntry.modifierTypeId,
    )!;
    passes &&=
      !IsSomethingDisabledForFulfillment(productModifierDefinition, fulfillmentId) &&
      productInstanceModifierEntry.options.reduce((acc: boolean, x) => {
        const modifierOption = optionSelector(x.optionId);
        return (
          acc &&
          modifierOption !== undefined &&
          DisableDataCheck(modifierOption.disabled, modifierOption.availability, order_time).enable ===
            DISABLE_REASON.ENABLED
        );
      }, true);
  });
  return passes;
};

export type DisableFlagGetterType = (
  x: Pick<IProductInstanceDisplayFlags, 'menu'> | Pick<IProductInstanceDisplayFlags, 'order'>,
) => boolean;

export const GetMenuHideDisplayFlag: DisableFlagGetterType = (x) =>
  (x as Pick<IProductInstanceDisplayFlags, 'menu'>).menu.hide;
export const GetOrderHideDisplayFlag: DisableFlagGetterType = (x) =>
  (x as Pick<IProductInstanceDisplayFlags, 'order'>).order.hide;
export const IgnoreHideDisplayFlags: DisableFlagGetterType = (_x) => false;

/**
 * Checks if a product is enabled and visible
 * @param {string} productId - the product type to check
 * @param {ProductInstanceModifierEntry[]} modifiers - product modifier entry list of selected/placed modifiers
 * @param {IProductInstanceDisplayFlags} display_flags - either the display flags for the specific product instance we're checking
 * @param {Pick<ICatalogSelectors, "productEntry" | "option">} catalogSelectors - the menu from which to pull catalog data
 * @param {DisableFlagGetterType} hide_product_functor - getter function to check if the product should be hidden
 * @param {Date | number} order_time - from getTime or Date.valueOf() the time to use to check for disable/enable status
 * @param {string} fulfillmentId - the service selected
 * @returns {boolean} returns true if item is enabled and visible
 */
export function FilterProductUsingCatalog(
  productId: string,
  modifiers: ProductInstanceModifierEntry[],
  display_flags: IProductInstanceDisplayFlags,
  catalogSelectors: Pick<ICatalogSelectors, 'productEntry' | 'option'>,
  hide_product_functor: DisableFlagGetterType,
  order_time: Date | number,
  fulfillmentId: string,
) {
  const productClass = catalogSelectors.productEntry(productId);
  return (
    productClass !== undefined &&
    !IsSomethingDisabledForFulfillment(productClass, fulfillmentId) &&
    !hide_product_functor(display_flags) &&
    DoesProductPassAvailabilityCheck(productClass, order_time) &&
    CheckRequiredModifiersAreAvailable(productClass, modifiers, catalogSelectors.option, order_time, fulfillmentId)
  );
}

export function DoesProductPassAvailabilityCheck(
  product: Pick<IProduct, 'disabled' | 'availability'>,
  order_time: Date | number,
) {
  return DisableDataCheck(product.disabled, product.availability, order_time).enable === DISABLE_REASON.ENABLED;
}

/**
 *
 * @see FilterProductSelector
 */
export function FilterWCPProduct(
  productId: string,
  modifiers: ProductInstanceModifierEntry[],
  catalog: ICatalogSelectors,
  order_time: Date | number,
  fulfillmentId: string,
  filterIncomplete: boolean,
) {
  const productEntry = catalog.productEntry(productId);
  const newMetadata = WCPProductGenerateMetadata(productId, modifiers, catalog, order_time, fulfillmentId);
  return (
    productEntry !== undefined &&
    FilterProductSelector(
      productEntry,
      modifiers,
      newMetadata,
      catalog.option,
      order_time,
      fulfillmentId,
      filterIncomplete,
    )
  );
}

/**
 * Generate a list of products that are reachable from a fulfillment, and are not disabled for that fulfillment.
 * @param fulfillment
 * @param catalogSelectors
 * @returns
 */
export const GenerateProductsReachableAndNotDisabledFromFulfillment = (
  fulfillment: Pick<FulfillmentConfig, 'id' | 'orderBaseCategoryId' | 'orderSupplementaryCategoryId'>,
  catalogSelectors: Pick<ICatalogSelectors, 'category' | 'productEntry'>,
) => {
  const GenerateOrderedArray = (inner_id: string): string[] => {
    const cat = catalogSelectors.category(inner_id);
    if (!cat || cat.serviceDisable.indexOf(fulfillment.id) !== -1) {
      return [];
    }
    return [
      ...cat.children.flatMap((childId: string) => GenerateOrderedArray(childId)),
      ...cat.products.filter((x) => {
        const product = catalogSelectors.productEntry(x);
        return product && product.serviceDisable.indexOf(fulfillment.id) === -1;
      }),
    ];
  };
  return new Set([
    ...GenerateOrderedArray(fulfillment.orderBaseCategoryId),
    ...(fulfillment.orderSupplementaryCategoryId ? GenerateOrderedArray(fulfillment.orderSupplementaryCategoryId) : []),
  ]);
};

/**
 * Filters a product to see if it is available for purchase in a fulfillment in a given configuration.
 * Does NOT check if the product is disabled for the fulfillment, or if it is reachable from the fulfillment tree.
 * @param product IProduct from the catalog
 * @param modifiers modifiers as the instance would be purchased
 * @param metadata the WProductMetadata computed with the same parameters passed to this function (exposed here for selector caching)
 * @param optionSelector selector IOptions
 * @param order_time the time the product would be ordered
 * @param fulfillmentId the fulfillment to check for the product to be disabled in
 * @param filterIncomplete flag for if we should filter incomplete products
 *     // !newMetadata.incomplete && // WAS GOING to remove this check as it caused products that were in the process of being configured to be removed from the customizer
 *   // I don't believe this check is actually needed as I'm not sure when a product would go FROM complete to incomplete with the change in time or a component being unselected
 *   // maybe it comes into play with a dependent modifier. If it's needed, then we can't use this function to check if something needs to be pulled from the customizer.
 *   // INSTEAD: just added a flag to specify the intention
 * @returns true if the product passes filters for availability
 */
export function FilterProductSelector(
  product: IProduct,
  modifiers: ProductInstanceModifierEntry[],
  metadata: WProductMetadata,
  optionSelector: Selector<IOption>,
  order_time: Date | number,
  fulfillmentId: string,
  filterIncomplete: boolean,
) {
  const failsIncompleteCheck = !filterIncomplete || !metadata.incomplete;
  return (
    failsIncompleteCheck &&
    product.serviceDisable.indexOf(fulfillmentId) === -1 &&
    DisableDataCheck(product.disabled, product.availability, order_time).enable === DISABLE_REASON.ENABLED &&
    modifiers.reduce((acc, modifier) => {
      const mdModifier = metadata.modifier_map[modifier.modifierTypeId];
      return (
        acc &&
        modifier.options.reduce((moAcc, mo) => {
          const modifierOption = optionSelector(mo.optionId);
          return (
            moAcc &&
            modifierOption !== undefined &&
            ((mo.placement === OptionPlacement.LEFT &&
              mdModifier.options[mo.optionId].enable_left.enable === DISABLE_REASON.ENABLED) ||
              (mo.placement === OptionPlacement.RIGHT &&
                mdModifier.options[mo.optionId].enable_right.enable === DISABLE_REASON.ENABLED) ||
              (mo.placement === OptionPlacement.WHOLE &&
                mdModifier.options[mo.optionId].enable_whole.enable === DISABLE_REASON.ENABLED)) &&
            DisableDataCheck(modifierOption.disabled, modifierOption.availability, order_time).enable ===
              DISABLE_REASON.ENABLED
          );
        }, true)
      );
    }, true)
  );
}

export function CanThisBeOrderedAtThisTimeAndFulfillmentCatalog(
  productId: string,
  modifiers: ProductInstanceModifierEntry[],
  catalog: ICatalogSelectors,
  serviceTime: Date | number,
  reachableProducts: Set<string>,
  fulfillment: string,
  filterIncomplete: boolean,
) {
  return (
    reachableProducts.has(productId) &&
    FilterWCPProduct(productId, modifiers, catalog, serviceTime, fulfillment, filterIncomplete)
  );
}

export const SortProductModifierEntries = (
  mods: ProductInstanceModifierEntry[],
  modifierTypeSelector: Selector<IOptionType>,
) =>
  mods.sort(
    (a, b) =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      modifierTypeSelector(a.modifierTypeId)!.ordinal -
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      modifierTypeSelector(b.modifierTypeId)!.ordinal,
  );

export const SortByOrderingArray = <T>(items: T[], ordering: string[], idGetter: (item: T) => string) => {
  const orderMap = new Map(ordering.map((id, index) => [id, index]));
  return items.sort((a, b) => {
    const indexA = orderMap.get(idGetter(a)) ?? ordering.length;
    const indexB = orderMap.get(idGetter(b)) ?? ordering.length;
    return indexA - indexB;
  });
};
