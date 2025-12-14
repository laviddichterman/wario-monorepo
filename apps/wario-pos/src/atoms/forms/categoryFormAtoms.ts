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

/** API processing state */
export const categoryFormProcessingAtom = atom(false);

/** Validation derived atom */
export const categoryFormIsValidAtom = atom((get) => {
  const form = get(categoryFormAtom);
  if (!form) return false;

  if (form.name.length === 0) return false;

  return true;
});

/** Convert form state to API request body */
export const toCategoryApiBody = (form: CategoryFormState): Omit<ICategory, 'id'> => ({
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
});

/** Convert API entity to form state */
export const fromCategoryEntity = (entity: ICategory): CategoryFormState => ({
  name: entity.name,
  description: entity.description || '',
  subheading: entity.subheading || '',
  footnotes: entity.footnotes || '',
  callLineName: entity.display_flags.call_line_name,
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  serviceDisable: entity.serviceDisable || [],
  callLineDisplay: entity.display_flags.call_line_display,
  nestedDisplay: entity.display_flags.nesting,
  children: entity.children,
  products: entity.products,
});
