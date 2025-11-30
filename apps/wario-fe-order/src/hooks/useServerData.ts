/**
 * Hooks for accessing server data via TanStack Query
 * These replace Redux selectors that accessed s.ws.*
 * 
 * Many hooks are re-exported from @wcp/wario-ux-shared/query
 * App-specific hooks that combine server data with local state are defined here
 */

import { useMemo } from 'react';

import type { MetadataModifierMap } from '@wcp/wario-shared';
import { IsModifierTypeVisible, WDateUtils } from '@wcp/wario-shared';
import {
  useCatalogSelectors,
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
    return IsModifierTypeVisible(modifierTypeEntry.modifierType, hasSelectable);
  }, [catalogSelectors, modifierTypeId, hasSelectable]);
}
