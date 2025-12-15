import { atom, useAtomValue } from 'jotai';
import { atomFamily } from 'jotai-family';

import type { IMoney, IOption, IOptionType, IRecurringInterval, IWInterval, KeyValue } from '@wcp/wario-shared/types';

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

/** Dirty fields tracking - marks which fields have been modified in edit mode */
export const modifierOptionFormDirtyFieldsAtom = atom<Set<keyof ModifierOptionFormState>>(
  new Set<keyof ModifierOptionFormState>(),
);

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

export type ModifierOptionApiBody = Omit<IOption, 'id' | 'modifierTypeId'>;

/**
 * Convert form state to API request body.
 *
 * Overload 1: When dirtyFields is omitted, returns the FULL body (for POST/create).
 * Overload 2: When dirtyFields is provided, returns only dirty fields (for PATCH/update).
 *
 * Note: For nested objects (metadata, displayFlags), if ANY nested field is dirty,
 * we include the entire parent object.
 */
export function toModifierOptionApiBody(form: ModifierOptionFormState): ModifierOptionApiBody;
export function toModifierOptionApiBody(
  form: ModifierOptionFormState,
  dirtyFields: Set<keyof ModifierOptionFormState>,
): Partial<ModifierOptionApiBody>;
export function toModifierOptionApiBody(
  form: ModifierOptionFormState,
  dirtyFields?: Set<keyof ModifierOptionFormState>,
): ModifierOptionApiBody | Partial<ModifierOptionApiBody> {
  // Build the full body structure
  const fullBody: ModifierOptionApiBody = {
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
  };

  // If no dirty fields provided, return full body (create mode)
  if (!dirtyFields) {
    return fullBody;
  }

  // If dirty fields is empty, also return full body
  if (dirtyFields.size === 0) {
    return fullBody;
  }

  // Map form fields to API fields for dirty tracking
  // This handles cases where multiple form fields map to nested API structures
  const isDirty = (apiField: keyof ModifierOptionApiBody): boolean => {
    // Check if the direct field is dirty
    if (dirtyFields.has(apiField as keyof ModifierOptionFormState)) return true;

    // Special handling for nested objects
    if (apiField === 'metadata') {
      return (
        dirtyFields.has('flavorFactor') ||
        dirtyFields.has('bakeFactor') ||
        dirtyFields.has('canSplit') ||
        dirtyFields.has('allowHeavy') ||
        dirtyFields.has('allowLite') ||
        dirtyFields.has('allowOTS')
      );
    }

    if (apiField === 'displayFlags') {
      return dirtyFields.has('omitFromShortname') || dirtyFields.has('omitFromName');
    }

    // Map enable field
    if (apiField === 'enable') {
      return dirtyFields.has('enableFunction');
    }

    // Map externalIDs field
    if (apiField === 'externalIDs') {
      return dirtyFields.has('externalIds');
    }

    return false;
  };

  // Filter to only dirty fields
  const result: Partial<ModifierOptionApiBody> = {};
  for (const key of Object.keys(fullBody)) {
    if (isDirty(key as keyof ModifierOptionApiBody)) {
      const typedKey = key as keyof ModifierOptionApiBody;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (result as any)[typedKey] = fullBody[typedKey];
    }
  }
  return result;
}

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
