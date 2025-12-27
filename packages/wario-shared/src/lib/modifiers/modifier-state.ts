/**
 * Pure functions for modifying product modifier state.
 *
 * These functions operate on ProductInstanceModifierEntry arrays and return
 * new arrays - they do not mutate the inputs.
 *
 * Two usage patterns are supported:
 * 1. "Normalized" form: All modifier types and options are represented, with
 *    unselected options having placement=NONE. Used for catalog editing UI.
 * 2. "Minimized" form: Only selected options are stored (placement !== NONE).
 *    Used for storage and API payloads.
 */

import type { IOptionInstance, IOptionType, IProduct, ProductInstanceModifierEntry } from '../derived-types';
import { OptionPlacement, OptionQualifier } from '../enums';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Product definition without ID and instances - used for uncommitted products
 */
export type ProductModifierDefinition = Pick<IProduct, 'modifiers'>;

// =============================================================================
// Normalization Functions
// =============================================================================

/**
 * Expands minimized modifier selections into a normalized form where all
 * possible options are represented.
 *
 * @param productModifiers - The product's modifier definitions (which modifiers apply)
 * @param modifierTypesMap - Map of modifier type IDs to their definitions
 * @param currentSelections - Current selections in minimized form
 * @returns Normalized modifier entries with all options represented
 */
export const normalizeModifierSelections = (
  productModifiers: ProductModifierDefinition['modifiers'],
  modifierTypesMap: Record<string, IOptionType>,
  currentSelections: ProductInstanceModifierEntry[],
): ProductInstanceModifierEntry[] =>
  productModifiers.map((modifierDef) => {
    const existingEntry = currentSelections.find((x) => x.modifierTypeId === modifierDef.mtid);
    const existingOptions = existingEntry?.options ?? [];
    const modifierType = modifierTypesMap[modifierDef.mtid] as IOptionType | undefined;
    const availableOptionIds = modifierType?.options ?? [];

    return {
      modifierTypeId: modifierDef.mtid,
      options: availableOptionIds.map((optionId: string) => {
        const foundOptionState = existingOptions.find((x) => x.optionId === optionId);
        return {
          optionId,
          placement: foundOptionState?.placement ?? OptionPlacement.NONE,
          qualifier: foundOptionState?.qualifier ?? OptionQualifier.REGULAR,
        };
      }),
    };
  });

/**
 * Compresses normalized modifier entries into minimized form by removing
 * options with NONE placement.
 *
 * @param normalizedModifiers - Modifier entries with all options represented
 * @returns Minimized modifier entries with only selected options
 */
export const minimizeModifierSelections = (
  normalizedModifiers: ProductInstanceModifierEntry[],
): ProductInstanceModifierEntry[] =>
  normalizedModifiers.reduce<ProductInstanceModifierEntry[]>((acc, modifier) => {
    const selectedOptions = modifier.options.filter((x) => x.placement !== OptionPlacement.NONE);
    return selectedOptions.length > 0
      ? [...acc, { modifierTypeId: modifier.modifierTypeId, options: selectedOptions }]
      : acc;
  }, []);

// =============================================================================
// State Update Functions (for minimized form)
// =============================================================================

/**
 * Updates a radio/toggle modifier selection. Radio modifiers only allow one
 * option to be selected at a time with WHOLE placement.
 *
 * @param mtId - Modifier type ID
 * @param selectedOptionId - The option ID to select
 * @param currentModifiers - Current minimized modifier selections
 * @returns New minimized modifier entries with the selection applied
 */
export const updateRadioModifierSelection = (
  mtId: string,
  selectedOptionId: string,
  currentModifiers: ProductInstanceModifierEntry[],
): ProductInstanceModifierEntry[] => {
  const newModifiers = structuredClone(currentModifiers);
  const entryIndex = newModifiers.findIndex((x) => x.modifierTypeId === mtId);

  const newSelection: IOptionInstance = {
    optionId: selectedOptionId,
    placement: OptionPlacement.WHOLE,
    qualifier: OptionQualifier.REGULAR,
  };

  if (entryIndex === -1) {
    // Add new modifier entry
    newModifiers.push({ modifierTypeId: mtId, options: [newSelection] });
  } else {
    // Replace existing selection
    newModifiers[entryIndex].options = [newSelection];
  }

  return newModifiers;
};

/**
 * Updates a checkbox modifier selection. Checkbox modifiers allow multiple
 * options and support placement (NONE/LEFT/RIGHT/WHOLE) and qualifiers.
 *
 * @param mtId - Modifier type ID
 * @param optionId - The option ID to update
 * @param optionState - The new state for this option (placement and qualifier)
 * @param currentModifiers - Current minimized modifier selections
 * @param modifierType - The modifier type definition (for option ordering)
 * @returns New minimized modifier entries with the selection applied
 */
export const updateCheckboxModifierSelection = (
  mtId: string,
  optionId: string,
  optionState: Pick<IOptionInstance, 'placement' | 'qualifier'>,
  currentModifiers: ProductInstanceModifierEntry[],
  modifierType: IOptionType,
): ProductInstanceModifierEntry[] => {
  const newModifiers = structuredClone(currentModifiers);
  const entryIndex = newModifiers.findIndex((x) => x.modifierTypeId === mtId);
  let options = entryIndex !== -1 ? newModifiers[entryIndex].options : [];

  if (optionState.placement === OptionPlacement.NONE) {
    // Remove the option
    options = options.filter((x) => x.optionId !== optionId);
  } else {
    // For exclusive checkboxes (min=0, max=1), clear other selections first
    if (modifierType.min_selected === 0 && modifierType.max_selected === 1) {
      options = [];
    }

    const existingIndex = options.findIndex((x) => x.optionId === optionId);
    const newOption: IOptionInstance = { optionId, ...optionState };

    if (existingIndex === -1) {
      // Add new option and sort by modifier type's option ordering
      options.push(newOption);
      options = sortOptionsByModifierOrder(options, modifierType.options);
    } else {
      // Update existing option
      options[existingIndex] = newOption;
    }
  }

  // Update or add/remove the modifier entry
  if (entryIndex === -1) {
    if (options.length > 0) {
      newModifiers.push({ modifierTypeId: mtId, options });
    }
  } else {
    if (options.length > 0) {
      newModifiers[entryIndex].options = options;
    } else {
      newModifiers.splice(entryIndex, 1);
    }
  }

  return newModifiers;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Sorts option instances according to the modifier type's option order.
 */
const sortOptionsByModifierOrder = (options: IOptionInstance[], orderedOptionIds: string[]): IOptionInstance[] => {
  const orderMap = new Map(orderedOptionIds.map((id, idx) => [id, idx]));
  return [...options].sort((a, b) => {
    const aIdx = orderMap.get(a.optionId) ?? Infinity;
    const bIdx = orderMap.get(b.optionId) ?? Infinity;
    return aIdx - bIdx;
  });
};
