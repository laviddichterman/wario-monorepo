import { atom, useAtom, useAtomValue } from 'jotai';
import { useCallback } from 'react';

import { DISPLAY_AS, MODIFIER_CLASS } from '@wcp/wario-shared/logic';
import type { IOptionType, KeyValue } from '@wcp/wario-shared/types';

/**
 * Form state for ModifierType add/edit operations.
 * Uses camelCase field names internally, converted to API format on submission.
 */
export interface ModifierTypeFormState {
  name: string;
  displayName: string;
  ordinal: number;
  minSelected: number;
  maxSelected: number | null;
  externalIds: KeyValue[];
  omitOptionIfNotAvailable: boolean;
  omitSectionIfNoAvailableOptions: boolean;
  useToggleIfOnlyTwoOptions: boolean;
  isHiddenDuringCustomization: boolean;
  emptyDisplayAs: DISPLAY_AS;
  modifierClass: MODIFIER_CLASS;
  templateString: string;
  multipleItemSeparator: string;
  nonEmptyGroupPrefix: string;
  nonEmptyGroupSuffix: string;
  is3p: boolean;
  options: string[];
}

/** Default values for "Add" mode */
export const DEFAULT_MODIFIER_TYPE_FORM: ModifierTypeFormState = {
  name: '',
  displayName: '',
  ordinal: 0,
  minSelected: 0,
  maxSelected: null,
  externalIds: [],
  omitOptionIfNotAvailable: false,
  omitSectionIfNoAvailableOptions: true,
  useToggleIfOnlyTwoOptions: false,
  isHiddenDuringCustomization: false,
  emptyDisplayAs: DISPLAY_AS.OMIT,
  modifierClass: MODIFIER_CLASS.ADD,
  templateString: '',
  multipleItemSeparator: ' + ',
  nonEmptyGroupPrefix: '',
  nonEmptyGroupSuffix: '',
  is3p: false,
  options: [],
};

/** Main form atom - null when no form is open */
export const modifierTypeFormAtom = atom<ModifierTypeFormState | null>(null);

/** Dirty fields tracking - marks which fields have been modified in edit mode */
export const modifierTypeFormDirtyFieldsAtom = atom<Set<keyof ModifierTypeFormState>>(
  new Set<keyof ModifierTypeFormState>(),
);

/** API processing state */
export const modifierTypeFormProcessingAtom = atom(false);

/** Validation derived atom */
export const modifierTypeFormIsValidAtom = atom((get) => {
  const form = get(modifierTypeFormAtom);
  if (!form) return false;

  if (form.name.length === 0) return false;
  if (form.maxSelected !== null && form.maxSelected < form.minSelected) return false;
  if (form.useToggleIfOnlyTwoOptions && (form.maxSelected !== 1 || form.minSelected !== 1)) return false;

  return true;
});

type ModifierTypeApiBody = Omit<IOptionType, 'id'>;

/**
 * Convert form state to API request body.
 *
 * Overload 1: When dirtyFields is omitted, returns the FULL body (for POST/create).
 * Overload 2: When dirtyFields is provided, returns only dirty fields (for PATCH/update).
 */
export function toModifierTypeApiBody(form: ModifierTypeFormState): ModifierTypeApiBody;
export function toModifierTypeApiBody(
  form: ModifierTypeFormState,
  dirtyFields: Set<keyof ModifierTypeFormState>,
): Partial<ModifierTypeApiBody>;
export function toModifierTypeApiBody(
  form: ModifierTypeFormState,
  dirtyFields?: Set<keyof ModifierTypeFormState>,
): ModifierTypeApiBody | Partial<ModifierTypeApiBody> {
  const fullBody: ModifierTypeApiBody = {
    name: form.name,
    displayName: form.displayName,
    ordinal: form.ordinal,
    min_selected: form.minSelected,
    max_selected: form.maxSelected,
    externalIDs: form.externalIds,
    displayFlags: {
      omit_options_if_not_available: form.omitOptionIfNotAvailable,
      omit_section_if_no_available_options: form.omitSectionIfNoAvailableOptions,
      use_toggle_if_only_two_options:
        form.useToggleIfOnlyTwoOptions && form.minSelected === 1 && form.maxSelected === 1,
      hidden: form.isHiddenDuringCustomization,
      empty_display_as: form.emptyDisplayAs,
      modifier_class: form.modifierClass,
      template_string: form.templateString || '',
      multiple_item_separator: form.multipleItemSeparator || '',
      non_empty_group_prefix: form.nonEmptyGroupPrefix || '',
      non_empty_group_suffix: form.nonEmptyGroupSuffix || '',
      is3p: form.is3p,
    },
    options: form.options,
  };

  // If no dirty fields provided, return full body (create mode)
  if (!dirtyFields) {
    return fullBody;
  }

  // If dirty fields is empty, also return full body
  if (dirtyFields.size === 0) {
    return fullBody;
  }

  // Check if field is dirty, including mapping nested fields to their parent
  const isDirty = (apiField: keyof ModifierTypeApiBody): boolean => {
    if (dirtyFields.has(apiField as keyof ModifierTypeFormState)) return true;

    // Special handling for displayFlags - check all related form fields
    if (apiField === 'displayFlags') {
      return (
        dirtyFields.has('omitOptionIfNotAvailable') ||
        dirtyFields.has('omitSectionIfNoAvailableOptions') ||
        dirtyFields.has('useToggleIfOnlyTwoOptions') ||
        dirtyFields.has('isHiddenDuringCustomization') ||
        dirtyFields.has('emptyDisplayAs') ||
        dirtyFields.has('modifierClass') ||
        dirtyFields.has('templateString') ||
        dirtyFields.has('multipleItemSeparator') ||
        dirtyFields.has('nonEmptyGroupPrefix') ||
        dirtyFields.has('nonEmptyGroupSuffix') ||
        dirtyFields.has('is3p')
      );
    }

    // Map camelCase form fields to snake_case API fields
    if (apiField === 'min_selected') return dirtyFields.has('minSelected');
    if (apiField === 'max_selected') return dirtyFields.has('maxSelected');
    if (apiField === 'externalIDs') return dirtyFields.has('externalIds');

    return false;
  };

  // Filter to only dirty fields
  const result: Partial<ModifierTypeApiBody> = {};
  for (const key of Object.keys(fullBody)) {
    if (isDirty(key as keyof ModifierTypeApiBody)) {
      const typedKey = key as keyof ModifierTypeApiBody;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (result as any)[typedKey] = fullBody[typedKey];
    }
  }
  return result;
}

/** Convert API entity to form state */
export const fromModifierTypeEntity = (entity: IOptionType): ModifierTypeFormState => ({
  name: entity.name,
  displayName: entity.displayName,
  ordinal: entity.ordinal,
  minSelected: entity.min_selected || 0,
  maxSelected: entity.max_selected || null,
  externalIds: entity.externalIDs,
  omitOptionIfNotAvailable: entity.displayFlags.omit_options_if_not_available,
  omitSectionIfNoAvailableOptions: entity.displayFlags.omit_section_if_no_available_options,
  useToggleIfOnlyTwoOptions: entity.displayFlags.use_toggle_if_only_two_options,
  isHiddenDuringCustomization: entity.displayFlags.hidden,
  emptyDisplayAs: entity.displayFlags.empty_display_as,
  modifierClass: entity.displayFlags.modifier_class,
  templateString: entity.displayFlags.template_string,
  multipleItemSeparator: entity.displayFlags.multiple_item_separator,
  nonEmptyGroupPrefix: entity.displayFlags.non_empty_group_prefix,
  nonEmptyGroupSuffix: entity.displayFlags.non_empty_group_suffix,
  is3p: entity.displayFlags.is3p,
  options: entity.options,
});

/**
 * Hook to manage ModifierType form state.
 * Returns the form state, a type-safe field updater with dirty tracking, and dirty fields.
 */
export const useModifierTypeForm = () => {
  const [form, setForm] = useAtom(modifierTypeFormAtom);
  const [dirtyFields, setDirtyFields] = useAtom(modifierTypeFormDirtyFieldsAtom);
  const isValid = useAtomValue(modifierTypeFormIsValidAtom);
  const [isProcessing, setIsProcessing] = useAtom(modifierTypeFormProcessingAtom);

  const updateField = useCallback(
    <K extends keyof ModifierTypeFormState>(field: K, value: ModifierTypeFormState[K]) => {
      setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
      setDirtyFields((prev) => new Set(prev).add(field));
    },
    [setForm, setDirtyFields],
  );

  const clearDirtyFields = useCallback(() => {
    setDirtyFields(new Set());
  }, [setDirtyFields]);

  return { form, updateField, isValid, isProcessing, setIsProcessing, dirtyFields, clearDirtyFields };
};
