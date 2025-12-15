import { atom, useAtomValue } from 'jotai';
import { atomFamily } from 'jotai-family';

import { PriceDisplay } from '@wcp/wario-shared/logic';
import {
  type CreateIProductInstanceRequest,
  type IProductInstanceDisplayFlagsMenu,
  type IProductInstanceDisplayFlagsOrder,
  type IProductInstanceDisplayFlagsPos,
  type KeyValue,
  type ProductInstanceModifierEntry,
} from '@wcp/wario-shared/types';

// Type definition for Form State
export interface ProductInstanceFormState {
  displayName: string;
  description: string;
  shortcode: string;
  externalIds: KeyValue[];
  modifiers: ProductInstanceModifierEntry[];

  // Display Flags - POS
  posHide: boolean;
  posName: string;
  posSkipCustomization: boolean;

  // Display Flags - Menu
  menuOrdinal: number;
  menuHide: boolean;
  menuPriceDisplay: PriceDisplay;
  menuAdornment: string;
  menuSuppressExhaustiveModifierList: boolean;
  menuShowModifierOptions: boolean;

  // Display Flags - Order
  orderOrdinal: number;
  orderHide: boolean;
  orderSkipCustomization: boolean;
  orderPriceDisplay: PriceDisplay;
  orderAdornment: string;
  orderSuppressExhaustiveModifierList: boolean;
}

export const DEFAULT_PRODUCT_INSTANCE_FORM: ProductInstanceFormState = {
  displayName: '',
  description: '',
  shortcode: '',
  externalIds: [],
  modifiers: [],

  posHide: false,
  posName: '',
  posSkipCustomization: true,

  menuOrdinal: 0,
  menuHide: false,
  menuPriceDisplay: PriceDisplay.ALWAYS,
  menuAdornment: '',
  menuSuppressExhaustiveModifierList: false,
  menuShowModifierOptions: false,

  orderOrdinal: 0,
  orderHide: false,
  orderSkipCustomization: true,
  orderPriceDisplay: PriceDisplay.ALWAYS,
  orderAdornment: '',
  orderSuppressExhaustiveModifierList: false,
};

// ===================================
// Single Instance Atoms (for Add/Edit)
// ===================================

export const productInstanceFormAtom = atom<ProductInstanceFormState | null>(null);

/** Dirty fields tracking - marks which fields have been modified in edit mode */
export const productInstanceFormDirtyFieldsAtom = atom<Set<keyof ProductInstanceFormState>>(new Set<keyof ProductInstanceFormState>());

export const productInstanceFormProcessingAtom = atom(false);

export const validateProductInstanceForm = (form: ProductInstanceFormState | null) => {
  if (!form) return false;

  if (!form.displayName) return false;
  if (!form.shortcode) return false;

  return true;
};

export const productInstanceFormIsValidAtom = atom((get) => {
  const form = get(productInstanceFormAtom);
  return validateProductInstanceForm(form);
});

// ===================================
// Collection Atoms (for Batch/Copy)
// ===================================

/**
 * Family of atoms for managing multiple product instances by ID (e.g. during Copy).
 * Param can be the instance ID (string) or an index if IDs aren't available yet.
 */
export const productInstanceFormFamily = atomFamily((_param: string | number) =>
  atom<ProductInstanceFormState | null>(null),
);

/** Family for 'Copy' toggle state in Copy Container */
export const productInstanceCopyFlagFamily = atomFamily((_param: string | number) => atom(true));

/** Family for 'Expanded' accordion state in Copy Container */
export const productInstanceExpandedFamily = atomFamily((_param: string | number) => atom(false));

// ===================================
// Converters
// ===================================

/**
 * Convert form state to API request body.
 * 
 * Overload 1: When dirtyFields is omitted, returns the FULL body (for POST/create).
 * Overload 2: When dirtyFields is provided, returns only dirty fields (for PATCH/update).
 */
export function toProductInstanceApiBody(form: ProductInstanceFormState): CreateIProductInstanceRequest;
export function toProductInstanceApiBody(
  form: ProductInstanceFormState,
  dirtyFields: Set<keyof ProductInstanceFormState>
): Partial<CreateIProductInstanceRequest>;
export function toProductInstanceApiBody(
  form: ProductInstanceFormState,
  dirtyFields?: Set<keyof ProductInstanceFormState>
): CreateIProductInstanceRequest | Partial<CreateIProductInstanceRequest> {
  const fullBody: CreateIProductInstanceRequest = {
    displayName: form.displayName,
    description: form.description,
    shortcode: form.shortcode,
    externalIDs: form.externalIds,
    modifiers: form.modifiers,
    displayFlags: {
      pos: {
        hide: form.posHide,
        name: form.posName,
        skip_customization: form.posSkipCustomization,
      } as IProductInstanceDisplayFlagsPos,
      menu: {
        ordinal: form.menuOrdinal,
        hide: form.menuHide,
        price_display: form.menuPriceDisplay,
        adornment: form.menuAdornment,
        suppress_exhaustive_modifier_list: form.menuSuppressExhaustiveModifierList,
        show_modifier_options: form.menuShowModifierOptions,
      } as IProductInstanceDisplayFlagsMenu,
      order: {
        ordinal: form.orderOrdinal,
        hide: form.orderHide,
        skip_customization: form.orderSkipCustomization,
        price_display: form.orderPriceDisplay,
        adornment: form.orderAdornment,
        suppress_exhaustive_modifier_list: form.orderSuppressExhaustiveModifierList,
      } as IProductInstanceDisplayFlagsOrder,
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

  // Check if field is dirty, including mapping nested fields to their parent
  const isDirty = (apiField: keyof CreateIProductInstanceRequest): boolean => {
    if (dirtyFields.has(apiField as keyof ProductInstanceFormState)) return true;

    // Map API field names to form field names
    if (apiField === 'externalIDs') return dirtyFields.has('externalIds');

    // Special handling for displayFlags - check all related form fields
    if (apiField === 'displayFlags') {
      return (
        dirtyFields.has('posHide') ||
        dirtyFields.has('posName') ||
        dirtyFields.has('posSkipCustomization') ||
        dirtyFields.has('menuOrdinal') ||
        dirtyFields.has('menuHide') ||
        dirtyFields.has('menuPriceDisplay') ||
        dirtyFields.has('menuAdornment') ||
        dirtyFields.has('menuSuppressExhaustiveModifierList') ||
        dirtyFields.has('menuShowModifierOptions') ||
        dirtyFields.has('orderOrdinal') ||
        dirtyFields.has('orderHide') ||
        dirtyFields.has('orderSkipCustomization') ||
        dirtyFields.has('orderPriceDisplay') ||
        dirtyFields.has('orderAdornment') ||
        dirtyFields.has('orderSuppressExhaustiveModifierList')
      );
    }

    return false;
  };

  // Filter to only dirty fields
  const result: Partial<CreateIProductInstanceRequest> = {};
  for (const key of Object.keys(fullBody)) {
    if (isDirty(key as keyof CreateIProductInstanceRequest)) {
      const typedKey = key as keyof CreateIProductInstanceRequest;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (result as any)[typedKey] = fullBody[typedKey];
    }
  }
  return result;
}

/** Convert API entity to form state */
export const fromProductInstanceEntity = (entity: CreateIProductInstanceRequest): ProductInstanceFormState => ({
  displayName: entity.displayName,
  description: entity.description,
  shortcode: entity.shortcode,
  externalIds: entity.externalIDs,
  modifiers: entity.modifiers,

  posHide: entity.displayFlags.pos.hide,
  posName: entity.displayFlags.pos.name,
  posSkipCustomization: entity.displayFlags.pos.skip_customization,

  menuOrdinal: entity.displayFlags.menu.ordinal,
  menuHide: entity.displayFlags.menu.hide,
  menuPriceDisplay: entity.displayFlags.menu.price_display,
  menuAdornment: entity.displayFlags.menu.adornment ?? '',
  menuSuppressExhaustiveModifierList: entity.displayFlags.menu.suppress_exhaustive_modifier_list,
  menuShowModifierOptions: entity.displayFlags.menu.show_modifier_options,

  orderOrdinal: entity.displayFlags.order.ordinal,
  orderHide: entity.displayFlags.order.hide,
  orderSkipCustomization: entity.displayFlags.order.skip_customization,
  orderPriceDisplay: entity.displayFlags.order.price_display,
  orderAdornment: entity.displayFlags.order.adornment ?? '',
  orderSuppressExhaustiveModifierList: entity.displayFlags.order.suppress_exhaustive_modifier_list,
});

export const useProductInstanceForm = () => {
  const form = useAtomValue(productInstanceFormAtom);
  const isValid = useAtomValue(productInstanceFormIsValidAtom);
  const isProcessing = useAtomValue(productInstanceFormProcessingAtom);
  return { form, isValid, isProcessing };
};
