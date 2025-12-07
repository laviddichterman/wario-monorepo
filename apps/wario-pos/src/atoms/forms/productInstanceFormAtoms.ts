/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import { atom, useAtomValue } from 'jotai';
import { atomFamily } from 'jotai/utils';

import {
  type IProductInstanceDisplayFlagsMenuDto,
  type IProductInstanceDisplayFlagsOrderDto,
  type IProductInstanceDisplayFlagsPosDto,
  type KeyValue,
  PriceDisplay,
  type ProductModifierEntry,
  type UncommittedIProductInstance,
} from '@wcp/wario-shared';

// Type definition for Form State
export interface ProductInstanceFormState {
  displayName: string;
  description: string;
  shortcode: string;
  ordinal: number;
  externalIds: KeyValue[];
  modifiers: ProductModifierEntry[];

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
  ordinal: 0,
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

/** Convert form state to API request body */
export const toProductInstanceApiBody = (form: ProductInstanceFormState): UncommittedIProductInstance => ({
  displayName: form.displayName,
  description: form.description,
  shortcode: form.shortcode,
  ordinal: form.ordinal,
  externalIDs: form.externalIds,
  modifiers: form.modifiers,
  displayFlags: {
    pos: {
      hide: form.posHide,
      name: form.posName,
      skip_customization: form.posSkipCustomization,
    } as IProductInstanceDisplayFlagsPosDto,
    menu: {
      ordinal: form.menuOrdinal,
      hide: form.menuHide,
      price_display: form.menuPriceDisplay,
      adornment: form.menuAdornment,
      suppress_exhaustive_modifier_list: form.menuSuppressExhaustiveModifierList,
      show_modifier_options: form.menuShowModifierOptions,
    } as IProductInstanceDisplayFlagsMenuDto,
    order: {
      ordinal: form.orderOrdinal,
      hide: form.orderHide,
      skip_customization: form.orderSkipCustomization,
      price_display: form.orderPriceDisplay,
      adornment: form.orderAdornment,
      suppress_exhaustive_modifier_list: form.orderSuppressExhaustiveModifierList,
    } as IProductInstanceDisplayFlagsOrderDto,
  },
});

/** Convert API entity to form state */
export const fromProductInstanceEntity = (entity: UncommittedIProductInstance): ProductInstanceFormState => ({
  displayName: entity.displayName,
  description: entity.description,
  shortcode: entity.shortcode,
  ordinal: entity.ordinal,
  externalIds: entity.externalIDs || [],
  modifiers: entity.modifiers || [],

  posHide: entity.displayFlags?.pos?.hide ?? false,
  posName: entity.displayFlags?.pos?.name ?? '',
  posSkipCustomization: entity.displayFlags?.pos?.skip_customization ?? true,

  menuOrdinal: entity.displayFlags?.menu?.ordinal ?? 0,
  menuHide: entity.displayFlags?.menu?.hide ?? false,
  menuPriceDisplay: entity.displayFlags?.menu?.price_display ?? PriceDisplay.ALWAYS,
  menuAdornment: entity.displayFlags?.menu?.adornment ?? '',
  menuSuppressExhaustiveModifierList: entity.displayFlags?.menu?.suppress_exhaustive_modifier_list ?? false,
  menuShowModifierOptions: entity.displayFlags?.menu?.show_modifier_options ?? false,

  orderOrdinal: entity.displayFlags?.order?.ordinal ?? 0,
  orderHide: entity.displayFlags?.order?.hide ?? false,
  orderSkipCustomization: entity.displayFlags?.order?.skip_customization ?? true,
  orderPriceDisplay: entity.displayFlags?.order?.price_display ?? PriceDisplay.ALWAYS,
  orderAdornment: entity.displayFlags?.order?.adornment ?? '',
  orderSuppressExhaustiveModifierList: entity.displayFlags?.order?.suppress_exhaustive_modifier_list ?? false,
});

export const useProductInstanceForm = () => {
  const form = useAtomValue(productInstanceFormAtom);
  const isValid = useAtomValue(productInstanceFormIsValidAtom);
  const isProcessing = useAtomValue(productInstanceFormProcessingAtom);
  return { form, isValid, isProcessing };
};
