/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { atom, useAtomValue } from 'jotai';

import type {
  IMoney,
  IProduct,
  IProductModifier,
  IRecurringInterval,
  IWInterval,
  KeyValue,
  PrepTiming,
  UpdateIProductRequest,
} from '@wcp/wario-shared';

// Removed bad import
const DEFAULT_MONEY: IMoney = { amount: 0, currency: 'USD' };

/**
 * Form state for Product add/edit operations.
 * Flattens the nested structure of product DTOs for easier form handling.
 */
export interface ProductFormState {
  price: IMoney;
  externalIds: KeyValue[];
  disabled: IWInterval | null;
  availability: IRecurringInterval[];
  timing: PrepTiming | null;
  serviceDisable: string[];
  // Display Flags
  flavorMax: number;
  bakeMax: number;
  bakeDifferentialMax: number;
  is3p: boolean;
  orderGuideWarningFunctions: string[];
  orderGuideSuggestionFunctions: string[];
  showNameOfBaseProduct: boolean;
  singularNoun: string;
  printerGroup: string | null;
  modifiers: IProductModifier[];
}

export const DEFAULT_PRODUCT_FORM: ProductFormState = {
  price: DEFAULT_MONEY,
  externalIds: [],
  disabled: null,
  availability: [],
  timing: null,
  serviceDisable: [],
  flavorMax: 0,
  bakeMax: 0,
  bakeDifferentialMax: 0,
  is3p: false,
  orderGuideWarningFunctions: [],
  orderGuideSuggestionFunctions: [],
  showNameOfBaseProduct: false,
  singularNoun: '',
  printerGroup: null,
  modifiers: [],
};

export const productFormAtom = atom<ProductFormState | null>(null);
export const productFormProcessingAtom = atom(false);

export const productFormIsValidAtom = atom((get) => {
  const form = get(productFormAtom);
  if (!form) return false;

  // Basic validation rules
  if (form.price.amount < 0) return false;
  // singularNoun might be required? DTO says @IsNotEmpty
  if (!form.singularNoun) return false;

  return true;
});

/** Convert form state to API request body for PATCH/update operations */
export const toProductApiBody = (form: ProductFormState): Omit<UpdateIProductRequest, 'id'> => ({
  price: form.price,
  externalIDs: form.externalIds,
  disabled: form.disabled,
  availability: form.availability,
  timing: form.timing,
  serviceDisable: form.serviceDisable,
  displayFlags: {
    flavor_max: form.flavorMax,
    bake_max: form.bakeMax,
    bake_differential: form.bakeDifferentialMax,
    is3p: form.is3p,
    order_guide: {
      warnings: form.orderGuideWarningFunctions,
      suggestions: form.orderGuideSuggestionFunctions,
      errors: [], // Not yet implemented in product management UI
    },
    show_name_of_base_product: form.showNameOfBaseProduct,
    singular_noun: form.singularNoun,
  },
  printerGroup: form.printerGroup,
  modifiers: form.modifiers,
});

/** Convert API entity to form state */
// We need baseProductId from the entity if it's an existing product (IProduct)
export const fromProductEntity = (entity: IProduct): ProductFormState => ({
  price: entity.price,
  externalIds: entity.externalIDs || [],
  disabled: entity.disabled || null,
  availability: entity.availability || [],
  timing: entity.timing || null,
  serviceDisable: entity.serviceDisable || [],
  flavorMax: entity.displayFlags?.flavor_max ?? 0,
  bakeMax: entity.displayFlags?.bake_max ?? 0,
  bakeDifferentialMax: entity.displayFlags?.bake_differential ?? 0,
  is3p: entity.displayFlags?.is3p ?? false,
  orderGuideWarningFunctions: entity.displayFlags?.order_guide?.warnings || [],
  orderGuideSuggestionFunctions: entity.displayFlags?.order_guide?.suggestions || [],
  showNameOfBaseProduct: entity.displayFlags?.show_name_of_base_product ?? false,
  singularNoun: entity.displayFlags?.singular_noun ?? '',

  printerGroup: entity.printerGroup || null,
  modifiers: entity.modifiers || [],
});

export const useProductForm = () => {
  const form = useAtomValue(productFormAtom);
  const isValid = useAtomValue(productFormIsValidAtom);
  const isProcessing = useAtomValue(productFormProcessingAtom);
  return { form, isValid, isProcessing };
};
