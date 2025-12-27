/**
 * Core hook for editing product modifier selections.
 *
 * This hook provides the state and handlers needed to build a modifier
 * editing UI. It handles:
 * - Normalizing modifier selections for display
 * - Radio/checkbox/toggle selection updates
 * - State minimization for storage
 *
 * Usage:
 * ```tsx
 * const { normalizedModifiers, selectRadio, toggleCheckbox, getOptionState } = useModifierEditor({
 *   productModifiers: product.modifiers,
 *   currentSelections: form.modifiers,
 *   onSelectionsChange: (mods) => setForm({ ...form, modifiers: mods }),
 *   catalog, // Optional - if not provided, uses useCatalogQuery
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';

import {
  minimizeModifierSelections,
  normalizeModifierSelections,
  type ProductModifierDefinition,
  updateCheckboxModifierSelection,
  updateRadioModifierSelection,
} from '@wcp/wario-shared/logic';
import type { ICatalog, IOptionInstance, IOptionType, ProductInstanceModifierEntry } from '@wcp/wario-shared/types';

import { useCatalogQuery } from '../../query/hooks/useCatalogQuery';

// =============================================================================
// Types
// =============================================================================

export interface UseModifierEditorConfig {
  /** Product's modifier definitions - which modifiers can be applied */
  productModifiers: ProductModifierDefinition['modifiers'];
  /** Current modifier selections in minimized form */
  currentSelections: ProductInstanceModifierEntry[];
  /** Callback when selections change */
  onSelectionsChange: (modifiers: ProductInstanceModifierEntry[]) => void;
  /** Optional catalog - if not provided, uses useCatalogQuery */
  catalog?: ICatalog | null;
}

export interface UseModifierEditorReturn {
  /** All modifiers with all options represented (for UI rendering) */
  normalizedModifiers: ProductInstanceModifierEntry[];
  /** Select a single option for a radio/toggle modifier */
  selectRadio: (mtId: string, optionId: string) => void;
  /** Toggle or update a checkbox option's state */
  toggleCheckbox: (mtId: string, optionId: string, state: Pick<IOptionInstance, 'placement' | 'qualifier'>) => void;
  /** Get the current option state for an option */
  getOptionState: (mtId: string, optionId: string) => IOptionInstance | undefined;
  /** Get the modifier type definition */
  getModifierType: (mtId: string) => IOptionType | undefined;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useModifierEditor({
  productModifiers,
  currentSelections,
  onSelectionsChange,
  catalog: externalCatalog,
}: UseModifierEditorConfig): UseModifierEditorReturn {
  // Use external catalog if provided, otherwise fetch via query
  const { data: queriedCatalog } = useCatalogQuery({ enabled: !externalCatalog });
  const catalog = externalCatalog ?? queriedCatalog;

  // Normalized modifiers for UI - all options represented
  const normalizedModifiers = useMemo(() => {
    if (!catalog) return [];
    return normalizeModifierSelections(productModifiers, catalog.modifiers, currentSelections);
  }, [productModifiers, catalog, currentSelections]);

  // Get modifier type definition
  const getModifierType = useCallback(
    (mtId: string): IOptionType | undefined => {
      return catalog?.modifiers[mtId];
    },
    [catalog],
  );

  // Get option state from normalized modifiers
  const getOptionState = useCallback(
    (mtId: string, optionId: string): IOptionInstance | undefined => {
      const entry = normalizedModifiers.find((m) => m.modifierTypeId === mtId);
      return entry?.options.find((o) => o.optionId === optionId);
    },
    [normalizedModifiers],
  );

  // Handle radio/toggle selection
  const selectRadio = useCallback(
    (mtId: string, optionId: string) => {
      const newModifiers = updateRadioModifierSelection(mtId, optionId, currentSelections);
      onSelectionsChange(newModifiers);
    },
    [currentSelections, onSelectionsChange],
  );

  // Handle checkbox selection
  const toggleCheckbox = useCallback(
    (mtId: string, optionId: string, state: Pick<IOptionInstance, 'placement' | 'qualifier'>) => {
      const modifierType = catalog?.modifiers[mtId];
      if (!modifierType) return;

      const newModifiers = updateCheckboxModifierSelection(mtId, optionId, state, currentSelections, modifierType);
      onSelectionsChange(newModifiers);
    },
    [catalog, currentSelections, onSelectionsChange],
  );

  return {
    normalizedModifiers,
    selectRadio,
    toggleCheckbox,
    getOptionState,
    getModifierType,
  };
}

// Re-export the pure functions for direct use
export { minimizeModifierSelections, normalizeModifierSelections };
