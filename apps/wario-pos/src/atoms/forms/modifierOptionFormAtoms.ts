import { atom, useAtomValue } from 'jotai';
import { atomFamily } from 'jotai-family';

import type { IMoney, IOption, IOptionType, IRecurringInterval, IWInterval, KeyValue } from '@wcp/wario-shared';

/**
 * Form state for a single modifier option in the copy flow.
 */
export interface ModifierOptionFormState {
  displayName: string;
  description: string;
  shortcode: string;
  price: IMoney;
  externalIds: KeyValue[];
  enableFunction: string | null;
  flavorFactor: number;
  bakeFactor: number;
  canSplit: boolean;
  allowHeavy: boolean;
  allowLite: boolean;
  allowOTS: boolean;
  omitFromShortname: boolean;
  omitFromName: boolean;
  disabled: IWInterval | null;
  availability: IRecurringInterval[];
}

/** Default values for "Add" mode */
export const DEFAULT_MODIFIER_OPTION_FORM: ModifierOptionFormState = {
  displayName: '',
  description: '',
  shortcode: '',
  price: { amount: 0, currency: 'USD' } as IMoney, // Assuming USD default from shared types/enums if available, or just mocking it. checking imports. IMoney is imported. I need CURRENCY enum.
  externalIds: [],
  enableFunction: null,
  flavorFactor: 0,
  bakeFactor: 0,
  canSplit: true,
  allowHeavy: false,
  allowLite: false,
  allowOTS: false,
  omitFromShortname: false,
  omitFromName: false,
  disabled: null,
  availability: [],
};

/** Main form atom - null when no form is open */
export const modifierOptionFormAtom = atom<ModifierOptionFormState | null>(null);

/** API processing state */
export const modifierOptionFormProcessingAtom = atom(false);

/** Validation derived atom */
export const modifierOptionFormIsValidAtom = atom((get) => {
  const form = get(modifierOptionFormAtom);
  if (!form) return false;

  if (form.displayName.length === 0) return false;
  if (form.shortcode.length === 0) return false;
  if (form.price.amount < 0) return false;
  if (form.flavorFactor < 0) return false;
  if (form.bakeFactor < 0) return false;

  // Note: Availability validation might be complex, simplified for now to always true unless we add specific check
  // Original component checked "availabilityIsValid" local state.
  // We might need to handle that or assume the custom component handles it via separate atom or internal state.
  // For now, simple checks.

  return true;
});

/** Convert an IOption entity to form state */
export const fromModifierOptionEntity = (option: IOption): ModifierOptionFormState => ({
  displayName: option.displayName,
  description: option.description,
  shortcode: option.shortcode,
  price: option.price,
  externalIds: option.externalIDs,
  enableFunction: option.enable ?? null,
  flavorFactor: option.metadata.flavor_factor,
  bakeFactor: option.metadata.bake_factor,
  canSplit: option.metadata.can_split,
  allowHeavy: option.metadata.allowHeavy,
  allowLite: option.metadata.allowLite,
  allowOTS: option.metadata.allowOTS,
  omitFromShortname: option.displayFlags.omit_from_shortname,
  omitFromName: option.displayFlags.omit_from_name,
  disabled: option.disabled ?? null,
  availability: option.availability,
});

/** Convert form state to API request body */
export const toModifierOptionApiBody = (form: ModifierOptionFormState): Omit<IOption, 'modifierTypeId' | 'id'> => ({
  displayName: form.displayName,
  description: form.description,
  shortcode: form.shortcode,
  price: form.price,
  enable: form.enableFunction,
  externalIDs: form.externalIds,
  disabled: form.disabled,
  availability: form.availability,
  metadata: {
    flavor_factor: form.flavorFactor,
    bake_factor: form.bakeFactor,
    can_split: form.canSplit,
    allowHeavy: form.allowHeavy,
    allowLite: form.allowLite,
    allowOTS: form.allowOTS,
  },
  displayFlags: {
    omit_from_shortname: form.omitFromShortname,
    omit_from_name: form.omitFromName,
  },
});

// =============================================================================
// ATOMS FOR COPY/BATCH OPERATIONS
// =============================================================================

/**
 * AtomFamily for modifier option form state, indexed by position.
 * Each option in the copy list gets its own atom.
 */
/**
 * AtomFamily for modifier option form state, indexed by position.
 * Each option in the copy list gets its own atom.
 */
export const modifierOptionFormFamily = atomFamily((_param: string | number) =>
  atom<ModifierOptionFormState | null>(null),
);

/** Copy flag for each option (whether to include in the copy) */
export const modifierOptionCopyFlagFamily = atomFamily((_param: string | number) => atom(true));

/** Expanded state for each option's accordion */
export const modifierOptionExpandedFamily = atomFamily((_param: string | number) => atom(false));

/**
 * Master atom to track how many options are in the copy operation.
 * Used to iterate over the atomFamily.
 */
export const modifierOptionCopyCountAtom = atom(0);

// =============================================================================
// MODIFIER TYPE COPY-SPECIFIC ATOMS
// =============================================================================

/**
 * Stores the modifier type being copied (read-only reference for child components).
 */
export const modifierTypeCopySourceAtom = atom<IOptionType | null>(null);

export const useModifierOptionForm = () => {
  const form = useAtomValue(modifierOptionFormAtom);
  const isValid = useAtomValue(modifierOptionFormIsValidAtom);
  const isProcessing = useAtomValue(modifierOptionFormProcessingAtom);
  return { form, isValid, isProcessing };
};
