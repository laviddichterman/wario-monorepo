import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

import type {
  IMoney,
  IOption,
  IOptionType,
  IRecurringInterval,
  IWInterval,
  KeyValue,
} from '@wcp/wario-shared';

/**
 * Form state for a single modifier option in the copy flow.
 */
export interface ModifierOptionFormState {
  displayName: string;
  description: string;
  shortcode: string;
  ordinal: number;
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

/** Convert an IOption entity to form state */
export const fromModifierOptionEntity = (option: IOption): ModifierOptionFormState => ({
  displayName: option.displayName,
  description: option.description,
  shortcode: option.shortcode,
  ordinal: option.ordinal,
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
export const toModifierOptionApiBody = (
  form: ModifierOptionFormState,
): Omit<IOption, 'modifierTypeId' | 'id'> => ({
  displayName: form.displayName,
  description: form.description,
  shortcode: form.shortcode,
  ordinal: form.ordinal,
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
export const modifierOptionFormFamily = atomFamily((_index: number) =>
  atom<ModifierOptionFormState | null>(null),
);

/** Copy flag for each option (whether to include in the copy) */
export const modifierOptionCopyFlagFamily = atomFamily((_index: number) => atom(true));

/** Expanded state for each option's accordion */
export const modifierOptionExpandedFamily = atomFamily((_index: number) => atom(false));

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
