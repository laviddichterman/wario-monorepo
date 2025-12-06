import { atom } from 'jotai';

import type { ICategory } from '@wcp/wario-shared';
import { CALL_LINE_DISPLAY, CategoryDisplay } from '@wcp/wario-shared';


/**
 * Form state for Category add/edit operations.
 * Uses flat field names internally, converted to nested structure for API.
 */
export interface CategoryFormState {
  name: string;
  description: string;
  ordinal: number;
  subheading: string;
  footnotes: string;
  callLineName: string;
  serviceDisable: string[];
  callLineDisplay: CALL_LINE_DISPLAY;
  nestedDisplay: CategoryDisplay;
  parent: string | null;
}

/** Default values for "Add" mode */
export const DEFAULT_CATEGORY_FORM: CategoryFormState = {
  name: '',
  description: '',
  ordinal: 0,
  subheading: '',
  footnotes: '',
  callLineName: '',
  serviceDisable: [],
  callLineDisplay: CALL_LINE_DISPLAY.SHORTNAME,
  nestedDisplay: CategoryDisplay.TAB,
  parent: null,
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
  if (form.ordinal < 0) return false;

  return true;
});

/** Convert form state to API request body */
export const toCategoryApiBody = (form: CategoryFormState): Omit<ICategory, 'id' | 'products' | 'subCategories'> => ({
  name: form.name,
  description: form.description || null,
  ordinal: form.ordinal,
  subheading: form.subheading || null,
  footnotes: form.footnotes || null,
  serviceDisable: form.serviceDisable,
  parent_id: form.parent,
  display_flags: {
    call_line_name: form.callLineName,
    call_line_display: form.callLineDisplay,
    nesting: form.nestedDisplay,
  },
});

/** Convert API entity to form state */
export const fromCategoryEntity = (entity: ICategory): CategoryFormState => ({
  name: entity.name,
  description: entity.description || '',
  ordinal: entity.ordinal,
  subheading: entity.subheading || '',
  footnotes: entity.footnotes || '',
  callLineName: entity.display_flags.call_line_name,
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  serviceDisable: entity.serviceDisable || [],
  callLineDisplay: entity.display_flags.call_line_display,
  nestedDisplay: entity.display_flags.nesting,
  parent: entity.parent_id || null,
});
