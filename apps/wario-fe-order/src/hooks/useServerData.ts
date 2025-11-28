/**
 * Hooks for accessing server data via TanStack Query
 * These replace Redux selectors that accessed s.ws.*
 * 
 * Many hooks are re-exported from @wcp/wario-ux-shared/query
 * App-specific hooks that combine server data with local state are defined here
 */

import { useMemo } from 'react';

import type { MetadataModifierMap } from '@wcp/wario-shared';
import { WDateUtils } from '@wcp/wario-shared';
import {
  useCatalogSelectors,
  useCategoryById,
  useFulfillmentOperatingHours
} from '@wcp/wario-ux-shared/query';

/**
 * Hook to check if a fulfillment has operating hours
 */
export function useHasOperatingHoursForService(fulfillmentId: string) {
  const operatingHours = useFulfillmentOperatingHours(fulfillmentId);
  if (!operatingHours) return false;
  return WDateUtils.HasOperatingHours(operatingHours);
}

/**
 * Hook to get selectable modifiers from a modifier map
 * Replaces GetSelectableModifiers/SelectSelectableModifiers
 */
export function useSelectableModifiers(mMap: MetadataModifierMap) {
  const catalogSelectors = useCatalogSelectors();

  return useMemo(() => {
    if (!catalogSelectors) {
      return {};
    }
    return Object.entries(mMap).reduce<MetadataModifierMap>((acc, [k, v]) => {
      const modifierEntry = catalogSelectors.modifierEntry(k);
      // modifierEntry type comes from Record access, TypeScript infers it as always defined
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- modifierEntry can be undefined at runtime
      if (!modifierEntry) return acc;
      const omit_section_if_no_available_options = modifierEntry.modifierType.displayFlags.omit_section_if_no_available_options;
      const hidden = modifierEntry.modifierType.displayFlags.hidden;
      return (!hidden && (!omit_section_if_no_available_options || v.has_selectable)) ? { ...acc, [k]: v } : acc;
    }, {});
  }, [catalogSelectors, mMap]);
}

/**
 * Hook to check if a modifier type should be displayed
 * Replaces SelectShouldFilterModifierTypeDisplay
 */
export function useShouldFilterModifierTypeDisplay(modifierTypeId: string, hasSelectable: boolean) {
  const catalogSelectors = useCatalogSelectors();

  return useMemo(() => {
    if (!catalogSelectors) return false;
    const modifierTypeEntry = catalogSelectors.modifierEntry(modifierTypeId);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- modifierTypeEntry can be undefined at runtime
    if (!modifierTypeEntry) return false;
    return !modifierTypeEntry.modifierType.displayFlags.hidden &&
      (!modifierTypeEntry.modifierType.displayFlags.omit_section_if_no_available_options || hasSelectable);
  }, [catalogSelectors, modifierTypeId, hasSelectable]);
}

/**
 * Hook to get modifier type name
 * Replaces SelectModifierTypeNameFromModifierTypeId
 */
export function useModifierTypeName(modifierTypeId: string) {
  const catalogSelectors = useCatalogSelectors();

  return useMemo(() => {
    if (!catalogSelectors) return '';
    const modifierTypeEntry = catalogSelectors.modifierEntry(modifierTypeId);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- modifierTypeEntry can be undefined at runtime
    if (!modifierTypeEntry) return '';
    return modifierTypeEntry.modifierType.displayName || modifierTypeEntry.modifierType.name;
  }, [catalogSelectors, modifierTypeId]);
}

/**
 * Hook to get category menu name
 * Replaces SelectMenuNameFromCategoryById
 */
export function useMenuNameFromCategory(categoryId: string) {
  const categoryEntry = useCategoryById(categoryId);
  return useMemo(() => {
    if (!categoryEntry) return '';
    return categoryEntry.category.description || categoryEntry.category.name;
  }, [categoryEntry]);
}

/**
 * Hook to get category nesting display type
 * Replaces SelectMenuNestingFromCategoryById
 */
export function useMenuNestingFromCategory(categoryId: string) {
  const categoryEntry = useCategoryById(categoryId);
  return useMemo(() => {
    if (!categoryEntry) return null;
    return categoryEntry.category.display_flags.nesting;
  }, [categoryEntry]);
}

/**
 * Hook to check if category exists and is allowed for fulfillment
 * Replaces SelectCategoryExistsAndIsAllowedForFulfillment
 */
export function useCategoryAllowedForFulfillment(categoryId: string, fulfillmentId: string) {
  const categoryEntry = useCategoryById(categoryId);

  return useMemo(() => {
    if (!categoryEntry) return false;
    return categoryEntry.category.serviceDisable.indexOf(fulfillmentId) === -1;
  }, [categoryEntry, fulfillmentId]);
}