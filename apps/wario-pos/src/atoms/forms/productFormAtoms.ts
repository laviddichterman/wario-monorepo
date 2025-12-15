/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { atom, useAtomValue } from 'jotai';

import type {
  CreateIProductRequest,
  IMoney,
  IProduct,
  IProductModifier,
  IRecurringInterval,
  IWInterval,
  KeyValue,
  PrepTiming,
} from '@wcp/wario-shared/types';

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
  orderGuideErrorsFunctions: string[];
  showNameOfBaseProduct: boolean;
  singularNoun: string;
  printerGroup: string | null;
  modifiers: IProductModifier[];
  instances: string[];
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
  orderGuideErrorsFunctions: [],
  showNameOfBaseProduct: false,
  singularNoun: '',
  printerGroup: null,
  modifiers: [],
  instances: [],
};

export const productFormAtom = atom<ProductFormState | null>(null);

/** Dirty fields tracking - marks which fields have been modified in edit mode */
export const productFormDirtyFieldsAtom = atom<Set<keyof ProductFormState>>(new Set<keyof ProductFormState>());

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

// Return type for toProductApiBody - omits instances since form only has IDs, not full objects
export type ProductApiBodyWithoutInstances = Omit<CreateIProductRequest, 'instances'>;

/**
 * Convert form state to API request body.
 * Note: This does NOT include instances. Callers should add instances separately.
 * The form.instances only contains string IDs, but the API expects full instance objects.
 * 
 * Overload 1: When dirtyFields is omitted, returns the FULL body (for POST/create).
 * Overload 2: When dirtyFields is provided, returns only dirty fields (for PATCH/update).
 */
export function toProductApiBody(form: ProductFormState): ProductApiBodyWithoutInstances;
export function toProductApiBody(
  form: ProductFormState,
  dirtyFields: Set<keyof ProductFormState>
): Partial<ProductApiBodyWithoutInstances>;
export function toProductApiBody(
  form: ProductFormState,
  dirtyFields?: Set<keyof ProductFormState>
): ProductApiBodyWithoutInstances | Partial<ProductApiBodyWithoutInstances> {
  const fullBody: ProductApiBodyWithoutInstances = {
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
        errors: form.orderGuideErrorsFunctions,
      },
      show_name_of_base_product: form.showNameOfBaseProduct,
      singular_noun: form.singularNoun,
    },
    printerGroup: form.printerGroup,
    modifiers: form.modifiers,
    // Note: instances are NOT included here - form.instances is string[] (IDs)
    // but CreateIProductRequest.instances is CreateIProductInstanceRequest[]
    // Callers should add instances separately when making create requests
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
  const isDirty = (apiField: keyof CreateIProductRequest): boolean => {
    if (dirtyFields.has(apiField as keyof ProductFormState)) return true;

    // Map API field names to form field names
    if (apiField === 'externalIDs') return dirtyFields.has('externalIds');

    // Special handling for displayFlags - check all related form fields
    if (apiField === 'displayFlags') {
      return (
        dirtyFields.has('flavorMax') ||
        dirtyFields.has('bakeMax') ||
        dirtyFields.has('bakeDifferentialMax') ||
        dirtyFields.has('is3p') ||
        dirtyFields.has('orderGuideWarningFunctions') ||
        dirtyFields.has('orderGuideSuggestionFunctions') ||
        dirtyFields.has('orderGuideErrorsFunctions') ||
        dirtyFields.has('showNameOfBaseProduct') ||
        dirtyFields.has('singularNoun')
      );
    }

    return false;
  };

  // Filter to only dirty fields
  const result: Partial<ProductApiBodyWithoutInstances> = {};
  for (const key of Object.keys(fullBody)) {
    if (isDirty(key as keyof ProductApiBodyWithoutInstances)) {
      const typedKey = key as keyof ProductApiBodyWithoutInstances;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (result as any)[typedKey] = fullBody[typedKey];
    }
  }
  return result;
}

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
  orderGuideErrorsFunctions: entity.displayFlags?.order_guide?.errors || [],
  showNameOfBaseProduct: entity.displayFlags?.show_name_of_base_product ?? false,
  singularNoun: entity.displayFlags?.singular_noun ?? '',

  printerGroup: entity.printerGroup || null,
  modifiers: entity.modifiers || [],
  instances: entity.instances || [],
});

export const useProductForm = () => {
  const form = useAtomValue(productFormAtom);
  const isValid = useAtomValue(productFormIsValidAtom);
  const isProcessing = useAtomValue(productFormProcessingAtom);
  return { form, isValid, isProcessing };
};
