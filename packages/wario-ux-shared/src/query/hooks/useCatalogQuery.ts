/**
 * TanStack Query hooks for catalog data
 * Replaces Redux SocketIoSlice selectors with modern query hooks
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { ICatalog } from '@wcp/wario-shared';

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

/**
 * Hook to get all product entry IDs from catalog
 */
export function useProductEntryIds() {
  const { data: catalog } = useCatalogQuery();
  return catalog ? Object.keys(catalog.products) : [];
}

/**
 * Hook to get a specific product entry by ID
 */
export function useProductEntryById(id: string) {
  const { data: catalog } = useCatalogQuery();
  return catalog?.products[id] ?? null;
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