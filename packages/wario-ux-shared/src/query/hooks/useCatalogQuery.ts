/**
 * TanStack Query hooks for catalog data
 * Replaces Redux SocketIoSlice selectors with modern query hooks
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  FilterProductUsingCatalog,
  GetMenuHideDisplayFlag,
  GetOrderHideDisplayFlag,
  IgnoreHideDisplayFlags,
  IsModifierTypeVisible,
  WCPProductGenerateMetadata,
} from '@wcp/wario-shared/logic';
import {
  type ICatalog,
  type ICatalogSelectors,
  type ICategory,
  type IOption,
  type IOptionType,
  type IProduct,
  type IProductInstance,
  type IProductInstanceFunction,
  type MetadataModifierMap,
  type ProductInstanceModifierEntry,
} from '@wcp/wario-shared/types';

import type { ProductCategoryFilter } from '@/common/shared';

import { QUERY_KEYS } from '../types';

import { useSocket } from './useSocket';

/**
 * Hook to query catalog data
 * Data is populated via Socket.io events, not HTTP requests
 * Uses infinite staleTime since data is push-based from socket
 */
export function useCatalogQuery(options?: Omit<UseQueryOptions<ICatalog | null>, 'queryKey' | 'queryFn'>) {
  const { hostAPI } = useSocket();
  return useQuery<ICatalog | null>({
    queryKey: [...QUERY_KEYS.catalog, hostAPI],
    queryFn: async () => {
      // Use HTTP fetch for initial load to avoid socket handshake delay
      // Socket events will update the cache later if needed
      if (!hostAPI) return null;
      const response = await fetch(`${hostAPI}/api/v1/catalog`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch catalog');
      }
      return response.json() as Promise<ICatalog>;
    },
    staleTime: Infinity, // Data updates via socket, but initial fetch is good forever until overwritten
    gcTime: Infinity, // Keep in cache forever
    retry: 2,
    ...options,
  });
}

/**
 * Hook to get all category IDs from catalog
 */
export function useCategoryIds() {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => (catalog ? Object.keys(catalog.categories) : []), [catalog]);
}

/**
 * Hook to get a specific category by ID
 */
export function useCategoryById(id: string | null) {
  const { data: catalog } = useCatalogQuery();
  return catalog?.categories[id ?? ''] ?? null;
}

export function useValueFromCategoryById<K extends keyof ICategory>(id: string | null, key: K) {
  const categoryEntry = useCategoryById(id);
  // Simple derived value - returns the specific key from the category
  const value = categoryEntry ? categoryEntry[key] : null;
  return value;
}

export function useCategoryNameFromCategoryById(categoryId: string | null) {
  const category = useCategoryById(categoryId);
  return category?.description || category?.name || '';
}

/**
 * Hook to get all modifier entry IDs from catalog
 */
export function useModifierEntryIds() {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => (catalog ? Object.keys(catalog.modifiers) : []), [catalog]);
}

/**
 * Hook to get a specific modifier entry by ID
 */
export function useModifierTypeById(id: string | null) {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => catalog?.modifiers[id ?? ''] ?? null, [catalog, id]);
}

export function useValueFromModifierTypeById<K extends keyof IOptionType>(id: string | null, key: K) {
  const modifierType = useModifierTypeById(id);
  const value = modifierType ? modifierType[key] : null;
  return value;
}

export function useModifierTypeNameById(id: string | null) {
  const modifierType = useModifierTypeById(id);
  return modifierType?.displayName || modifierType?.name || '';
}

export function useIsModifierTypeVisibleById(modifierTypeId: string | null, hasSelectable: boolean) {
  const modifierType = useModifierTypeById(modifierTypeId);
  return modifierType ? IsModifierTypeVisible(modifierType, hasSelectable) : false;
}

/**
 * Hook to get all option IDs from catalog
 */
export function useOptionIds() {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => (catalog ? Object.keys(catalog.options) : []), [catalog]);
}

/**
 * Hook to get a specific option by ID
 */
export function useOptionById(id: string | null) {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => catalog?.options[id ?? ''] ?? null, [catalog, id]);
}

export function useValueFromOptionById<K extends keyof IOption>(id: string | null, key: K) {
  const optionEntry = useOptionById(id);
  const value = optionEntry ? optionEntry[key] : null;
  return value;
}

/**
 * Hook to get all product entry IDs from catalog
 */
export function useProductEntryIds() {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => (catalog ? Object.keys(catalog.products) : []), [catalog]);
}

/**
 * Hook to get all product entries from catalog
 */
export function useProductEntries() {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => (catalog ? Object.values(catalog.products) : []), [catalog]);
}

/**
 * Hook to get a specific product by ID
 */
export function useProductById(id: string | null) {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => catalog?.products[id ?? ''] ?? null, [catalog, id]);
}

export function useValueFromProductById<K extends keyof IProduct>(id: string | null, key: K) {
  const product = useProductById(id);
  const value = product ? product[key] : null;
  return value;
}
/**
 * Hook to get all product instance IDs from catalog
 */
export function useProductInstanceIds() {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => (catalog ? Object.keys(catalog.productInstances) : []), [catalog]);
}

/**
 * Hook to get a specific product instance by ID
 */
export function useProductInstanceById(id: string | null) {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => catalog?.productInstances[id ?? ''] ?? null, [catalog, id]);
}

export function useValueFromProductInstanceById<K extends keyof IProductInstance>(id: string | null, key: K) {
  const product = useProductInstanceById(id);
  const value = product ? product[key] : null;
  return value;
}

/**
 * Hook to get all order instance function IDs from catalog
 */
export function useOrderInstanceFunctionIds() {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => (catalog ? Object.keys(catalog.orderInstanceFunctions) : []), [catalog]);
}

/**
 * Hook to get a specific order instance function by ID
 */
export function useOrderInstanceFunctionById(id: string | null) {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => catalog?.orderInstanceFunctions[id ?? ''] ?? null, [catalog, id]);
}

/**
 * Hook to get all product instance function IDs from catalog
 */
export function useProductInstanceFunctionIds() {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => (catalog ? Object.keys(catalog.productInstanceFunctions) : []), [catalog]);
}

/**
 * Hook to get a specific product instance function by ID
 */
export function useProductInstanceFunctionById(id: string | null) {
  const { data: catalog } = useCatalogQuery();
  return useMemo(() => catalog?.productInstanceFunctions[id ?? ''] ?? null, [catalog, id]);
}

export function useValueFromProductInstanceFunctionById<K extends keyof IProductInstanceFunction>(
  id: string | null,
  key: K,
) {
  const productInstanceFunction = useProductInstanceFunctionById(id);
  const value = productInstanceFunction ? productInstanceFunction[key] : null;
  return value;
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

export function useBaseProductByProductId(productClassId: string) {
  const productEntry = useProductById(productClassId);
  // instances[0] is the base product instance per 2025 schema
  const baseProductId = productEntry?.instances[0] ?? '';
  const productInstance = useProductInstanceById(baseProductId);
  return productInstance;
}

export function useBaseProductNameByProductId(productClassId: string) {
  const productEntry = useProductById(productClassId);
  const baseProductId = productEntry?.instances[0] ?? '';
  const productInstance = useProductInstanceById(baseProductId);
  return productInstance?.displayName || 'UNDEFINED';
}

export function useProductMetadata(
  productId: string,
  modifiers: ProductInstanceModifierEntry[],
  service_time: Date | number,
  fulfillmentId: string,
) {
  const catalogSelectors = useCatalogSelectors();
  const metadata = useMemo(() => {
    if (!catalogSelectors) return null;
    return WCPProductGenerateMetadata(productId, modifiers, catalogSelectors, service_time, fulfillmentId);
  }, [productId, modifiers, catalogSelectors, service_time, fulfillmentId]);
  return metadata;
}

export function useProductsNotPermanentlyDisabled() {
  const products = useProductEntries();
  return products.filter((x) => !x.disabled || x.disabled.start <= x.disabled.end);
}

export function useProductIdsNotPermanentlyDisabled() {
  const products = useProductsNotPermanentlyDisabled();
  return products.map((x) => x.id);
}
// plan is to re-write this in the order page and see if the new schema might make it possible to not pre-filter
function filteredProducts(
  category: ICategory,
  filter: ProductCategoryFilter,
  catalogSelectors: ICatalogSelectors,
  order_time: Date | number,
  fulfillmentId: string,
) {
  const categoryProductInstances = category.products.reduce<IProductInstance[]>(
    (acc: IProductInstance[], productId: string) => {
      const product = catalogSelectors.productEntry(productId);
      if (!product) return acc;
      if (!product.disabled || product.disabled.start <= product.disabled.end) {
        return [
          ...acc,
          ...product.instances.reduce<IProductInstance[]>((accB: IProductInstance[], pIId: string) => {
            const pi = catalogSelectors.productInstance(pIId);
            if (!pi) return accB;
            const passesFilter = FilterProductUsingCatalog(
              productId,
              pi.modifiers,
              pi.displayFlags,
              catalogSelectors,
              filter === 'Menu'
                ? GetMenuHideDisplayFlag
                : filter === 'Order'
                  ? GetOrderHideDisplayFlag
                  : IgnoreHideDisplayFlags,
              order_time,
              fulfillmentId,
            );
            return passesFilter ? [...accB, pi] : accB;
          }, []),
        ];
      }
      return acc;
    },
    [],
  );
  return categoryProductInstances;
}

function selectPopulatedSubcategoryIdsInCategory(
  catalogSelectors: ICatalogSelectors,
  categoryId: string,
  filter: ProductCategoryFilter,
  order_time: Date | number,
  fulfillmentId: string,
) {
  const categoryEntry = catalogSelectors.category(categoryId);
  if (!categoryEntry || categoryEntry.serviceDisable.indexOf(fulfillmentId) !== -1) {
    return [];
  }
  // Children are already ordered in the parent's children array per 2025 schema
  const subcats = categoryEntry.children.reduce((acc: ICategory[], subcatId: string) => {
    const subcategory = catalogSelectors.category(subcatId);
    const instances = subcategory
      ? filteredProducts(subcategory, filter, catalogSelectors, order_time, fulfillmentId)
      : [];
    if (
      instances.length > 0 ||
      selectPopulatedSubcategoryIdsInCategory(catalogSelectors, subcatId, filter, order_time, fulfillmentId).length > 0
    ) {
      return subcategory ? [...acc, subcategory] : acc;
    } else {
      return acc;
    }
  }, []);
  // No need to sort - ordering is preserved from parent's children array
  return subcats.map((x: ICategory) => x.id);
}

/**
 * For a given categoryId, selects the sub category IDs that, somewhere down their tree, contain a product that is meant to be displayed
 * with the passed context (product availability, time of order, fulfillment, display (menu/order))
 * Returns values in context order (Menu | Order)
 */
export function usePopulatedSubcategoryIdsInCategory(
  categoryId: string,
  filter: ProductCategoryFilter,
  order_time: Date | number,
  fulfillmentId: string,
) {
  const catalogSelectors = useCatalogSelectors();
  return useMemo(() => {
    if (!catalogSelectors) {
      return [];
    }
    return selectPopulatedSubcategoryIdsInCategory(catalogSelectors, categoryId, filter, order_time, fulfillmentId);
  }, [catalogSelectors, categoryId, filter, order_time, fulfillmentId]);
}

// end added for wario-fe-menu

/**
 * Filters a MetadataModifierMap to only include selectable modifiers that are visible
 * @param mMap Modifier map from WCPProductGenerateMetadata
 * @returns
 */
export function useFilterSelectableModifiers(mMap: MetadataModifierMap) {
  const { modifierEntry: modifierTypeSelector } = useCatalogSelectors() as ICatalogSelectors;
  const mods = useMemo(
    () =>
      Object.entries(mMap).reduce<MetadataModifierMap>((acc, [k, v]) => {
        const modifierType = modifierTypeSelector(k);
        if (!modifierType) return acc;
        return IsModifierTypeVisible(modifierType, v.has_selectable) ? { ...acc, [k]: v } : acc;
      }, {}),
    [mMap, modifierTypeSelector],
  );
  return mods;
}
