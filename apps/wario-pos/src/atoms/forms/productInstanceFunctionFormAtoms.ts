import { atom } from 'jotai';
import { useAtom, useAtomValue } from 'jotai';

import type { IAbstractExpression, IProductInstanceFunction } from '@wcp/wario-shared';

// =============================================================================
// FORM STATE
// =============================================================================

export interface ProductInstanceFunctionFormState {
  functionName: string;
  expression: IAbstractExpression | null;
}

export const DEFAULT_PRODUCT_INSTANCE_FUNCTION_FORM: ProductInstanceFunctionFormState = {
  functionName: '',
  expression: null,
};

// =============================================================================
// ATOMS
// =============================================================================

/** Main form atom - null when no form is open */
export const productInstanceFunctionFormAtom = atom<ProductInstanceFunctionFormState | null>(null);

/** API processing state */
export const productInstanceFunctionFormProcessingAtom = atom(false);

/** Validation derived atom */
export const productInstanceFunctionFormIsValidAtom = atom((get) => {
  const form = get(productInstanceFunctionFormAtom);
  if (!form) return false;

  if (form.functionName.length === 0) return false;
  if (form.expression === null) return false;

  return true;
});

// =============================================================================
// HOOK
// =============================================================================
export const useProductInstanceFunctionForm = () => {
  const [form, setForm] = useAtom(productInstanceFunctionFormAtom);
  const isValid = useAtomValue(productInstanceFunctionFormIsValidAtom);

  const updateField = <K extends keyof ProductInstanceFunctionFormState>(
    field: K,
    value: ProductInstanceFunctionFormState[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  return { form, setForm, updateField, isValid };
};

// =============================================================================
// CONVERTERS
// =============================================================================

/** Convert entity to form state */
export const fromProductInstanceFunctionEntity = (
  entity: IProductInstanceFunction,
): ProductInstanceFunctionFormState => ({
  functionName: entity.name,
  expression: entity.expression,
});

/** Convert form state to API request body */
export const toProductInstanceFunctionApiBody = (
  form: ProductInstanceFunctionFormState,
): Omit<IProductInstanceFunction, 'id'> => ({
  name: form.functionName,
  expression: form.expression as IAbstractExpression,
});
