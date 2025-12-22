import { atom } from 'jotai';

import { CALL_LINE_DISPLAY, CategoryDisplay } from '@wcp/wario-shared/logic';
import type { ICategory } from '@wcp/wario-shared/types';

/**
 * Form state for Category add/edit operations.
 * Uses flat field names internally, converted to nested structure for API.
 */
export interface CategoryFormState {
  name: string;
  description: string;
  subheading: string;
  footnotes: string;
  callLineName: string;
  serviceDisable: string[];
  callLineDisplay: CALL_LINE_DISPLAY;
  nestedDisplay: CategoryDisplay;
  children: string[];
  products: string[];
}

/** Default values for "Add" mode */
export const DEFAULT_CATEGORY_FORM: CategoryFormState = {
  name: '',
  description: '',
  subheading: '',
  footnotes: '',
  callLineName: '',
  serviceDisable: [],
  callLineDisplay: CALL_LINE_DISPLAY.SHORTNAME,
  nestedDisplay: CategoryDisplay.TAB,
  children: [],
  products: [],
};

/** Main form atom - null when no form is open */
export const categoryFormAtom = atom<CategoryFormState | null>(null);

/** Dirty fields tracking - marks which fields have been modified in edit mode */
export const categoryFormDirtyFieldsAtom = atom<Set<keyof CategoryFormState>>(new Set<keyof CategoryFormState>());

/** API processing state */
export const categoryFormProcessingAtom = atom(false);

/** Validation derived atom */
export const categoryFormIsValidAtom = atom((get) => {
  const form = get(categoryFormAtom);
  if (!form) return false;

  if (form.name.length === 0) return false;

  return true;
});

type CategoryApiBody = Omit<ICategory, 'id'>;

/**
 * Convert form state to API request body.
 *
 * Overload 1: When dirtyFields is omitted, returns the FULL body (for POST/create).
 * Overload 2: When dirtyFields is provided, returns only dirty fields (for PATCH/update).
 */
export function toCategoryApiBody(form: CategoryFormState): CategoryApiBody;
export function toCategoryApiBody(
  form: CategoryFormState,
  dirtyFields: Set<keyof CategoryFormState>,
): Partial<CategoryApiBody>;
export function toCategoryApiBody(
  form: CategoryFormState,
  dirtyFields?: Set<keyof CategoryFormState>,
): CategoryApiBody | Partial<CategoryApiBody> {
  const fullBody: CategoryApiBody = {
    name: form.name,
    description: form.description || null,
    subheading: form.subheading || null,
    footnotes: form.footnotes || null,
    serviceDisable: form.serviceDisable,
    display_flags: {
      call_line_name: form.callLineName,
      call_line_display: form.callLineDisplay,
      nesting: form.nestedDisplay,
    },
    children: form.children,
    products: form.products,
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
  const isDirty = (apiField: keyof CategoryApiBody): boolean => {
    if (dirtyFields.has(apiField as keyof CategoryFormState)) return true;

    // Special handling for display_flags - check all related form fields
    if (apiField === 'display_flags') {
      return dirtyFields.has('callLineName') || dirtyFields.has('callLineDisplay') || dirtyFields.has('nestedDisplay');
    }

    return false;
  };

  // Filter to only dirty fields
  const result: Partial<CategoryApiBody> = {};
  for (const key of Object.keys(fullBody)) {
    if (isDirty(key as keyof CategoryApiBody)) {
      const typedKey = key as keyof CategoryApiBody;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (result as any)[typedKey] = fullBody[typedKey];
    }
  }
  return result;
}

/** Convert API entity to form state */
export const fromCategoryEntity = (entity: ICategory): CategoryFormState => ({
  name: entity.name,
  description: entity.description || '',
  subheading: entity.subheading || '',
  footnotes: entity.footnotes || '',
  callLineName: entity.display_flags.call_line_name,
  serviceDisable: entity.serviceDisable,
  callLineDisplay: entity.display_flags.call_line_display,
  nestedDisplay: entity.display_flags.nesting,
  children: entity.children,
  products: entity.products,
});
