/**
 * useOrderModifierEditor - Hook for editing modifiers in an order context with WProduct pattern.
 *
 * This hook extends useModifierEditor with support for:
 * - WProduct metadata regeneration
 * - Visibility filtering based on fulfillment and service time
 * - Integration with catalog selectors
 *
 * Usage:
 * ```tsx
 * const {
 *   visibleModifiers,
 *   visibleOptions,
 *   selectRadio,
 *   toggleCheckbox,
 *   updateOption,
 * } = useOrderModifierEditor({
 *   product: selectedProduct,
 *   fulfillmentId,
 *   serviceDateTime,
 *   onProductChange: updateCustomizerProduct,
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';

import {
  type ICatalogSelectors,
  IsModifierTypeVisible,
  OptionPlacement,
  OptionQualifier,
  SortAndFilterModifierOptions,
  SortByOrderingArray,
  SortProductModifierEntries,
  WCPProductGenerateMetadata,
  type WProduct,
} from '@wcp/wario-shared/logic';
import type {
  IOption,
  IOptionInstance,
  IOptionType,
  IProduct,
  IProductModifier,
  MetadataModifierMapEntry,
  MetadataModifierOptionMapEntry,
} from '@wcp/wario-shared/types';

import { useCatalogSelectors, useProductById } from '../../query/hooks/useCatalogQuery';

// =============================================================================
// Types
// =============================================================================

export interface UseOrderModifierEditorConfig {
  /** The product being edited (with metadata) */
  product: WProduct;
  /** Current fulfillment ID */
  fulfillmentId: string;
  /** Service date/time for availability filtering */
  serviceDateTime: Date | number;
  /** Callback when product changes (with regenerated metadata) */
  onProductChange: (product: WProduct) => void;
}

export interface UseOrderModifierEditorReturn {
  /** Visible modifier types (filtered by visibility rules) */
  visibleModifiers: Array<{ mtid: string; name: string }>;
  /** Get visible options for a modifier type */
  getVisibleOptions: (mtId: string) => IOption[];
  /** Get option state from metadata (includes enable_whole/left/right) */
  getOptionState: (mtId: string, optionId: string) => MetadataModifierOptionMapEntry | undefined;
  /** Get modifier type definition */
  getModifierType: (mtId: string) => IOptionType | undefined;
  /** Select a radio/toggle option */
  selectRadio: (mtId: string, optionId: string) => void;
  /** Toggle/update a checkbox option */
  toggleCheckbox: (mtId: string, optionId: string, state: Pick<IOptionInstance, 'placement' | 'qualifier'>) => void;
  /** Update an option with full placement/qualifier control */
  updateOption: (mtId: string, option: IOption, state: Pick<IOptionInstance, 'placement' | 'qualifier'>) => void;
}

// Helper type for visibility filtering
interface ModifierVisibilityEntry {
  entry: IOptionType | undefined;
  pm: IProductModifier;
  md: MetadataModifierMapEntry | undefined;
}

// Type guard for complete modifier entries
function isCompleteModifierEntry(
  x: ModifierVisibilityEntry,
): x is { entry: IOptionType; pm: IProductModifier; md: MetadataModifierMapEntry } {
  return x.entry !== undefined && x.md !== undefined;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useOrderModifierEditor({
  product,
  fulfillmentId,
  serviceDateTime,
  onProductChange,
}: UseOrderModifierEditorConfig): UseOrderModifierEditorReturn {
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors | null;
  const productType = useProductById(product.p.productId) as IProduct | undefined;

  // Get visible modifier types
  const visibleModifiers = useMemo(() => {
    if (!productType || !catalogSelectors) return [];
    const metadata = product.m;
    return productType.modifiers
      .filter((x: IProductModifier) => x.serviceDisable.indexOf(fulfillmentId) === -1)
      .map((x: IProductModifier) => ({
        entry: catalogSelectors.modifierEntry(x.mtid) as IOptionType,
        pm: x,
        md: metadata.modifier_map[x.mtid],
      }))
      .filter(
        (x: ModifierVisibilityEntry) =>
          isCompleteModifierEntry(x) && IsModifierTypeVisible(x.entry, x.md.has_selectable),
      )
      .sort((a, b) => a.entry.ordinal - b.entry.ordinal)
      .map((x) => ({ mtid: x.pm.mtid, name: x.entry.name }));
  }, [productType, product.m, fulfillmentId, catalogSelectors]);

  // Get visible options for a modifier type
  const getVisibleOptions = useCallback(
    (mtId: string): IOption[] => {
      if (!catalogSelectors) return [];
      const modifierTypeEntry = catalogSelectors.modifierEntry(mtId);
      if (!modifierTypeEntry) return [];
      return SortAndFilterModifierOptions(product.m, modifierTypeEntry, catalogSelectors.option, serviceDateTime);
    },
    [product.m, catalogSelectors, serviceDateTime],
  );

  // Get option state from metadata
  const getOptionState = useCallback(
    (mtId: string, optionId: string): MetadataModifierOptionMapEntry | undefined => {
      const modifierMap = product.m.modifier_map;
      if (Object.hasOwn(modifierMap, mtId) && Object.hasOwn(modifierMap[mtId].options, optionId)) {
        return modifierMap[mtId].options[optionId];
      }
      return undefined;
    },
    [product.m.modifier_map],
  );

  // Get modifier type definition
  const getModifierType = useCallback(
    (mtId: string): IOptionType | undefined => {
      return catalogSelectors?.modifierEntry(mtId);
    },
    [catalogSelectors],
  );

  // Helper to regenerate product with new modifiers
  const updateProduct = useCallback(
    (newModifiers: typeof product.p.modifiers) => {
      if (!catalogSelectors) return;
      const newProduct: WProduct = {
        m: WCPProductGenerateMetadata(
          product.p.productId,
          newModifiers,
          catalogSelectors,
          serviceDateTime,
          fulfillmentId,
        ),
        p: { productId: product.p.productId, modifiers: newModifiers },
      };
      onProductChange(newProduct);
    },
    [catalogSelectors, product, serviceDateTime, fulfillmentId, onProductChange],
  );

  // Select radio option (single-select)
  const selectRadio = useCallback(
    (mtId: string, optionId: string) => {
      if (!catalogSelectors) return;
      const newModifierOptions = [{ placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR, optionId }];
      const modifierEntryIndex = product.p.modifiers.findIndex((x) => x.modifierTypeId === mtId);
      const newProductModifiers = structuredClone(product.p.modifiers);

      if (modifierEntryIndex === -1) {
        newProductModifiers.push({ modifierTypeId: mtId, options: newModifierOptions });
        SortProductModifierEntries(newProductModifiers, catalogSelectors.modifierEntry);
      } else {
        newProductModifiers[modifierEntryIndex].options = newModifierOptions;
      }
      updateProduct(newProductModifiers);
    },
    [catalogSelectors, product.p.modifiers, updateProduct],
  );

  // Toggle checkbox option
  const toggleCheckbox = useCallback(
    (mtId: string, optionId: string, state: Pick<IOptionInstance, 'placement' | 'qualifier'>) => {
      if (!catalogSelectors) return;
      const mt = catalogSelectors.modifierEntry(mtId);
      if (!mt) return;

      const newOptInstance = { ...state, optionId };
      const modifierEntryIndex = product.p.modifiers.findIndex((x) => x.modifierTypeId === mtId);
      const newProductModifiers = structuredClone(product.p.modifiers);
      let newModifierOptions = modifierEntryIndex !== -1 ? newProductModifiers[modifierEntryIndex].options : [];

      if (state.placement === OptionPlacement.NONE) {
        newModifierOptions = newModifierOptions.filter((x) => x.optionId !== optionId);
      } else {
        if (mt.min_selected === 0 && mt.max_selected === 1) {
          // Optional single-select - clear other options
          newModifierOptions = [];
        }
        const moIdX = newModifierOptions.findIndex((x) => x.optionId === optionId);
        if (moIdX === -1) {
          newModifierOptions.push(newOptInstance);
          newModifierOptions = SortByOrderingArray(newModifierOptions, mt.options, (x) => x.optionId);
        } else {
          newModifierOptions[moIdX] = newOptInstance;
        }
      }

      if (modifierEntryIndex === -1 && newModifierOptions.length > 0) {
        newProductModifiers.push({ modifierTypeId: mtId, options: newModifierOptions });
        SortProductModifierEntries(newProductModifiers, catalogSelectors.modifierEntry);
      } else if (modifierEntryIndex !== -1) {
        if (newModifierOptions.length > 0) {
          newProductModifiers[modifierEntryIndex].options = newModifierOptions;
        } else {
          newProductModifiers.splice(modifierEntryIndex, 1);
        }
      }
      updateProduct(newProductModifiers);
    },
    [catalogSelectors, product.p.modifiers, updateProduct],
  );

  // Update option with full control (for advanced placement modal)
  const updateOption = useCallback(
    (mtId: string, option: IOption, state: Pick<IOptionInstance, 'placement' | 'qualifier'>) => {
      toggleCheckbox(mtId, option.id, state);
    },
    [toggleCheckbox],
  );

  return {
    visibleModifiers,
    getVisibleOptions,
    getOptionState,
    getModifierType,
    selectRadio,
    toggleCheckbox,
    updateOption,
  };
}
