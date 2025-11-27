/**
 * TanStack Query hooks for catalog data
 * Replaces Redux SocketIoSlice selectors with modern query hooks
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { type CatalogCategoryEntry, type CatalogModifierEntry, type CatalogProductEntry, FilterProductUsingCatalog, GetMenuHideDisplayFlag, GetOrderHideDisplayFlag, type ICatalog, type ICatalogSelectors, type ICategory, IgnoreHideDisplayFlags, type IOption, type IOptionType, type IProduct, type IProductInstance, type ProductModifierEntry, WCPProductGenerateMetadata } from '@wcp/wario-shared';

import type { ProductCategoryFilter } from '@/common/shared';

import { QUERY_KEYS } from '../types';

/**
 * Hook to query catalog data
 * Data is populated via Socket.io events, not HTTP requests
 * Uses infinite staleTime since data is push-based from socket
 */
export function useCatalogQuery(
  options?: Omit<UseQueryOptions<ICatalog | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ICatalog | null>({
    queryKey: QUERY_KEYS.catalog,
    queryFn: () => {
      // Data is set via socket events, not fetched
      // Initial value is null until socket pushes data
      return null;
    },
    staleTime: Infinity, // Never refetch - data comes from socket
    gcTime: Infinity, // Keep in cache forever
    ...options,
  });
}

/**
 * Hook to get all category IDs from catalog
 */
export function useCategoryIds() {
  const { data: catalog } = useCatalogQuery();
  return catalog ? Object.keys(catalog.categories) : [];
}

/**
 * Hook to get a specific category by ID
 */
export function useCategoryById(id: string) {
  const { data: catalog } = useCatalogQuery();
  return catalog?.categories[id] ?? null;
}

export function useValueFromCategoryEntryById<K extends keyof CatalogCategoryEntry>(id: string, key: K) {
  const categoryEntry = useCategoryById(id);
  // Simple derived value - returns the specific key from the category
  const value = categoryEntry ? categoryEntry[key] : null;
  return value;
}
export function useValueFromCategoryById<K extends keyof ICategory>(id: string, key: K) {
  const categoryEntry = useValueFromCategoryEntryById(id, 'category');
  // Simple derived value - returns the specific key from the category
  const value = categoryEntry ? categoryEntry[key] : null;
  return value;
}

/**
 * Hook to get all modifier entry IDs from catalog
 */
export function useModifierEntryIds() {
  const { data: catalog } = useCatalogQuery();
  return catalog ? Object.keys(catalog.modifiers) : [];
}

/**
 * Hook to get a specific modifier entry by ID
 */
export function useModifierEntryById(id: string) {
  const { data: catalog } = useCatalogQuery();
  return catalog?.modifiers[id] ?? null;
}

export function useValueFromModifierEntryById<K extends keyof CatalogModifierEntry>(id: string, key: K) {
  const modifierEntry = useModifierEntryById(id);
  const value = modifierEntry ? modifierEntry[key] : null;
  return value;
}

export function useValueFromModifierTypeById<K extends keyof IOptionType>(id: string, key: K) {
  const modifierEntry = useValueFromModifierEntryById(id, 'modifierType');
  const value = modifierEntry ? modifierEntry[key] : null;
  return value;
}

export function useModifierTypeNameById(id: string) {
  const modifierEntry = useValueFromModifierEntryById(id, 'modifierType') as IOptionType;
  return modifierEntry.displayName || modifierEntry.name;
}

/**
 * Hook to get all option IDs from catalog
 */
export function useOptionIds() {
  const { data: catalog } = useCatalogQuery();
  return catalog ? Object.keys(catalog.options) : [];
}

/**
 * Hook to get a specific option by ID
 */
export function useOptionById(id: string) {
  const { data: catalog } = useCatalogQuery();
  return catalog?.options[id] ?? null;
}

export function useValueFromOptionById<K extends keyof IOption>(id: string, key: K) {
  const optionEntry = useOptionById(id);
  const value = optionEntry ? optionEntry[key] : null;
  return value;
}

/**
 * Hook to get all product entry IDs from catalog
 */
export function useProductEntryIds() {
  const { data: catalog } = useCatalogQuery();
  return catalog ? Object.keys(catalog.products) : [];
}

/**
 * Hook to get all product entries from catalog
 */
export function useProductEntries() {
  const { data: catalog } = useCatalogQuery();
  return catalog ? Object.values(catalog.products) : [];
}

/**
 * Hook to get a specific product entry by ID
 */
export function useProductEntryById(id: string) {
  const { data: catalog } = useCatalogQuery();
  return catalog?.products[id] ?? null;
}

export function useValueFromProductEntryById<K extends keyof CatalogProductEntry>(id: string, key: K) {
  const productEntry = useProductEntryById(id);
  const value = productEntry ? productEntry[key] : null;
  return value;
}

export function useValueFromProductTypeById<K extends keyof IProduct>(id: string, key: K) {
  const productEntry = useValueFromProductEntryById(id, 'product');
  const value = productEntry ? productEntry[key] : null;
  return value;
}

/**
 * Hook to get all product instance IDs from catalog
 */
export function useProductInstanceIds() {
  const { data: catalog } = useCatalogQuery();
  return catalog ? Object.keys(catalog.productInstances) : [];
}


/**
 * Hook to get a specific product instance by ID
 */
export function useProductInstanceById(id: string) {
  const { data: catalog } = useCatalogQuery();
  return catalog?.productInstances[id] ?? null;
}

export function useValueFromProductInstanceById<K extends keyof IProductInstance>(id: string, key: K) {
  const product = useProductInstanceById(id);
  const value = product ? product[key] : null;
  return value;
}

/**
 * Hook to get all order instance function IDs from catalog
 */
export function useOrderInstanceFunctionIds() {
  const { data: catalog } = useCatalogQuery();
  return catalog ? Object.keys(catalog.orderInstanceFunctions) : [];
}

/**
 * Hook to get a specific order instance function by ID
 */
export function useOrderInstanceFunctionById(id: string) {
  const { data: catalog } = useCatalogQuery();
  return catalog?.orderInstanceFunctions[id] ?? null;
}

/**
 * Hook to get all product instance function IDs from catalog
 */
export function useProductInstanceFunctionIds() {
  const { data: catalog } = useCatalogQuery();
  return catalog ? Object.keys(catalog.productInstanceFunctions) : [];
}

/**
 * Hook to get a specific product instance function by ID
 */
export function useProductInstanceFunctionById(id: string) {
  const { data: catalog } = useCatalogQuery();
  return catalog?.productInstanceFunctions[id] ?? null;
}

/**
 * Hook to access catalog selectors
 * Provides selector functions similar to SelectCatalogSelectors from Redux
 */
export function useCatalogSelectors() {
  const { data: catalog } = useCatalogQuery();

  return useMemo(() => {
    if (!catalog) return null;
    return {
      categories: () => Object.keys(catalog.categories),
      category: (id: string) => catalog.categories[id],
      modifierEntries: () => Object.keys(catalog.modifiers),
      modifierEntry: (id: string) => catalog.modifiers[id],
      options: () => Object.keys(catalog.options),
      option: (id: string) => catalog.options[id],
      productEntries: () => Object.keys(catalog.products),
      productEntry: (id: string) => catalog.products[id],
      productInstances: () => Object.keys(catalog.productInstances),
      productInstance: (id: string) => catalog.productInstances[id],
      orderInstanceFunctions: () => Object.keys(catalog.orderInstanceFunctions),
      orderInstanceFunction: (id: string) => catalog.orderInstanceFunctions[id],
      productInstanceFunctions: () => Object.keys(catalog.productInstanceFunctions),
      productInstanceFunction: (id: string) => catalog.productInstanceFunctions[id],
    };
  }, [catalog]);
}
// Added for wario-fe-menu

export function useParentProductEntryFromProductInstanceId(productInstanceId: string) {
  const product = useProductInstanceById(productInstanceId) as IProductInstance;
  const productEntry = useProductEntryById(product.productId);
  return productEntry;
}

export function useBaseProductByProductId(productClassId: string) {
  const productEntry = useProductEntryById(productClassId) as CatalogProductEntry;
  const productInstance = useProductInstanceById(productEntry.product.baseProductId);
  return productInstance;
}

export function useBaseProductNameByProductId(productClassId: string) {
  const baseProduct = useBaseProductByProductId(productClassId);
  return baseProduct?.displayName || "UNDEFINED";
}

export function useProductMetadata(productId: string, modifiers: ProductModifierEntry[], service_time: Date | number, fulfillmentId: string) {
  const catalogSelectors = useCatalogSelectors();
  const metadata = useMemo(() => {
    if (!catalogSelectors) return null;
    return WCPProductGenerateMetadata(productId, modifiers, catalogSelectors, service_time, fulfillmentId);
  }, [productId, modifiers, catalogSelectors, service_time, fulfillmentId]);
  return metadata;
}

export function useProductsNotPermanentlyDisabled() {
  const products = useProductEntries();
  return products.filter((x) => (!x.product.disabled || x.product.disabled.start <= x.product.disabled.end));
}

export function useProductIdsNotPermanentlyDisabled() {
  const products = useProductsNotPermanentlyDisabled();
  return products.map(x => x.product.id);
}

function filteredProducts(category: CatalogCategoryEntry, filter: ProductCategoryFilter, catalogSelectors: ICatalogSelectors, order_time: Date | number, fulfillmentId: string) {
  const categoryProductInstances = category.products.reduce<IProductInstance[]>((acc: IProductInstance[], productId) => {
    const product = catalogSelectors.productEntry(productId) as CatalogProductEntry;
    if (!product.product.disabled || product.product.disabled.start <= product.product.disabled.end) {
      return [...acc, ...product.instances.reduce<IProductInstance[]>((accB, pIId) => {
        const pi = catalogSelectors.productInstance(pIId) as IProductInstance;
        const passesFilter = FilterProductUsingCatalog(productId, pi.modifiers, pi.displayFlags, catalogSelectors, filter === 'Menu' ? GetMenuHideDisplayFlag : (filter === "Order" ? GetOrderHideDisplayFlag : IgnoreHideDisplayFlags), order_time, fulfillmentId);
        return passesFilter ? [...accB, pi] : accB;
      }, [])];
    }
    return acc;
  }, []);
  return categoryProductInstances;
}

/**
 * Selects product instance IDs that pass relevant filters and are immediate children of the given categoryID
 * Returns values in context order (Menu | Order)
 */
export function useProductInstancesInCategory(categoryId: string, filter: ProductCategoryFilter, order_time: Date | number, fulfillmentId: string,) {
  const category = useCategoryById(categoryId);
  const catalogSelectors = useCatalogSelectors();
  const { data: catalog } = useCatalogQuery();

  if (!catalog || !catalogSelectors || !category || category.category.serviceDisable.indexOf(fulfillmentId) !== -1) {
    return [];
  }
  const categoryProductInstances = filteredProducts(category, filter, catalogSelectors, order_time, fulfillmentId);
  switch (filter) {
    case 'Menu':
      categoryProductInstances.sort((a, b) => (a.displayFlags.menu.ordinal - b.displayFlags.menu.ordinal)); break;
    case 'Order':
      categoryProductInstances.sort((a, b) => (a.displayFlags.order.ordinal - b.displayFlags.order.ordinal)); break;
    default:
      break;
  }
  return categoryProductInstances.map(x => x.id);
}

function selectPopulatedSubcategoryIdsInCategory(catalogSelectors: ICatalogSelectors, categoryId: string, filter: ProductCategoryFilter, order_time: Date | number, fulfillmentId: string) {
  const categoryEntry = catalogSelectors.category(categoryId);
  if (!categoryEntry || categoryEntry.category.serviceDisable.indexOf(fulfillmentId) !== -1) {
    return [];
  }
  const subcats = categoryEntry.children.reduce((acc: CatalogCategoryEntry[], subcatId) => {
    const subcategory = catalogSelectors.category(subcatId);
    const instances = subcategory ? filteredProducts(subcategory, filter, catalogSelectors, order_time, fulfillmentId) : [];
    if (instances.length > 0 || selectPopulatedSubcategoryIdsInCategory(catalogSelectors, subcatId, filter, order_time, fulfillmentId).length > 0) {
      return [...acc, subcategory as CatalogCategoryEntry];
    }
    else {
      return acc;
    }
  }, []);
  subcats.sort((a, b) => a.category.ordinal - b.category.ordinal);
  return subcats.map(x => x.category.id);
}

/**
 * For a given categoryId, selects the sub category IDs that, somewhere down their tree, contain a product that is meant to be displayed
 * with the passed context (product availability, time of order, fulfillment, display (menu/order))
 * Returns values in context order (Menu | Order)
 */
export function usePopulatedSubcategoryIdsInCategory(categoryId: string, filter: ProductCategoryFilter, order_time: Date | number, fulfillmentId: string) {
  const catalogSelectors = useCatalogSelectors();
  if (!catalogSelectors) {
    return [];
  }
  return selectPopulatedSubcategoryIdsInCategory(catalogSelectors, categoryId, filter, order_time, fulfillmentId);
}

// end added for wario-fe-menu  