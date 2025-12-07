import { atom, useAtom, useAtomValue } from 'jotai';
import { useCallback } from 'react';

import type { IOptionType, KeyValue } from '@wcp/wario-shared';
import { DISPLAY_AS, MODIFIER_CLASS } from '@wcp/wario-shared';

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
};

/** Main form atom - null when no form is open */
export const modifierTypeFormAtom = atom<ModifierTypeFormState | null>(null);

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

/** Convert form state to API request body */
export const toModifierTypeApiBody = (form: ModifierTypeFormState): Omit<IOptionType, 'id'> => ({
  name: form.name,
  displayName: form.displayName,
  ordinal: form.ordinal,
  min_selected: form.minSelected,
  max_selected: form.maxSelected,
  externalIDs: form.externalIds,
  displayFlags: {
    omit_options_if_not_available: form.omitOptionIfNotAvailable,
    omit_section_if_no_available_options: form.omitSectionIfNoAvailableOptions,
    use_toggle_if_only_two_options: form.useToggleIfOnlyTwoOptions && form.minSelected === 1 && form.maxSelected === 1,
    hidden: form.isHiddenDuringCustomization,
    empty_display_as: form.emptyDisplayAs,
    modifier_class: form.modifierClass,
    template_string: form.templateString || '',
    multiple_item_separator: form.multipleItemSeparator || '',
    non_empty_group_prefix: form.nonEmptyGroupPrefix || '',
    non_empty_group_suffix: form.nonEmptyGroupSuffix || '',
    is3p: form.is3p,
  },
});

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
});


/**
 * Hook to manage ModifierType form state.
 * Returns the form state and a type-safe field updater.
 */
export const useModifierTypeForm = () => {
  const [form, setForm] = useAtom(modifierTypeFormAtom);
  const isValid = useAtomValue(modifierTypeFormIsValidAtom);
  const [isProcessing, setIsProcessing] = useAtom(modifierTypeFormProcessingAtom);

  const updateField = useCallback(
    <K extends keyof ModifierTypeFormState>(field: K, value: ModifierTypeFormState[K]) => {
      setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    [setForm],
  );

  return { form, updateField, isValid, isProcessing, setIsProcessing };
};
