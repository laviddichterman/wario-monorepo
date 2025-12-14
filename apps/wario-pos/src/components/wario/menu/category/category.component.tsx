import { useAtom, useAtomValue } from 'jotai';

import { Autocomplete, Grid, TextField, Typography } from '@mui/material';

import { CALL_LINE_DISPLAY, CategoryDisplay, type ICatalogSelectors } from '@wcp/wario-shared';
import { useCatalogSelectors, useCategoryIds, useFulfillments } from '@wcp/wario-ux-shared/query';

import {
  categoryFormAtom,
  categoryFormIsValidAtom,
  categoryFormProcessingAtom,
  type CategoryFormState,
} from '@/atoms/forms/categoryFormAtoms';

import { StringEnumPropertyComponent } from '../../property-components/StringEnumPropertyComponent';
import { StringPropertyComponent } from '../../property-components/StringPropertyComponent';

/**
 * Hook to access Category form state and validation.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useCategoryForm = () => {
  const form = useAtomValue(categoryFormAtom);
  const isValid = useAtomValue(categoryFormIsValidAtom);
  const isProcessing = useAtomValue(categoryFormProcessingAtom);

  return { form, isValid, isProcessing };
};

interface CategoryFormBodyProps {
  excludeCategoryId?: string;
}

/**
 * Inner form body for Category.
 * Reads/writes directly from Jotai atoms.
 */
export const CategoryFormBody = ({ excludeCategoryId }: CategoryFormBodyProps) => {
  const [form, setForm] = useAtom(categoryFormAtom);
  const isProcessing = useAtomValue(categoryFormProcessingAtom);
  const { category } = useCatalogSelectors() as ICatalogSelectors;
  const fulfillments = useFulfillments();
  const allCategoryIds = useCategoryIds();

  // Filter out the current category from potential parents to prevent cycles
  const categoryIds = excludeCategoryId ? allCategoryIds.filter((id) => id !== excludeCategoryId) : allCategoryIds;

  if (!form) return null;

  const updateField = <K extends keyof CategoryFormState>(field: K, value: CategoryFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  return (
    <Grid container spacing={2}>
      {/* ==============================
          IDENTITY
         ============================== */}
      <Grid size={12}>
        <Typography variant="overline" color="text.secondary">
          Identity
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Category Name"
          value={form.name}
          setValue={(v) => {
            updateField('name', v);
          }}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Autocomplete
          multiple
          filterSelectedOptions
          options={categoryIds}
          value={form.children}
          onChange={(_e, v) => {
            updateField('children', v);
          }}
          getOptionLabel={(option) => category(option)?.name ?? option}
          isOptionEqualToValue={(option, value) => option === value}
          renderInput={(params) => <TextField {...params} label="Children" />}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 9 }}>
        <Autocomplete
          multiple
          fullWidth
          filterSelectedOptions
          options={fulfillments.map((x) => x.id)}
          value={form.serviceDisable}
          onChange={(_, v) => {
            updateField('serviceDisable', v);
          }}
          getOptionLabel={(option) => fulfillments.find((v) => v.id === option)?.displayName ?? 'INVALID'}
          isOptionEqualToValue={(option, value) => option === value}
          renderInput={(params) => <TextField {...params} label="Disabled Services" />}
        />
      </Grid>

      {/* ==============================
          DISPLAY
         ============================== */}
      <Grid size={12} sx={{ mt: 2 }}>
        <Typography variant="overline" color="text.secondary">
          Display
        </Typography>
      </Grid>
      <Grid size={12}>
        <TextField
          multiline
          fullWidth
          minRows={form.description ? 4 : 1}
          label="Category Description (Optional, HTML allowed)"
          type="text"
          value={form.description}
          onChange={(e) => {
            updateField('description', e.target.value);
          }}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          multiline
          fullWidth
          minRows={form.subheading ? 4 : 1}
          label="Subheading (Optional, HTML allowed)"
          type="text"
          value={form.subheading}
          onChange={(e) => {
            updateField('subheading', e.target.value);
          }}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          multiline
          rows={form.footnotes ? 4 : 1}
          fullWidth
          label="Footnotes (Optional, HTML allowed)"
          type="text"
          value={form.footnotes}
          onChange={(e) => {
            updateField('footnotes', e.target.value);
          }}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Call Line Name"
          value={form.callLineName}
          setValue={(v) => {
            updateField('callLineName', v);
          }}
        />
      </Grid>
      <Grid container size={{ xs: 12, md: 3 }}>
        <StringEnumPropertyComponent
          disabled={isProcessing}
          label="Call Line Display"
          value={form.callLineDisplay}
          setValue={(v) => {
            updateField('callLineDisplay', v);
          }}
          options={Object.values(CALL_LINE_DISPLAY)}
        />
      </Grid>
      <Grid container size={{ xs: 12, md: 3 }}>
        <StringEnumPropertyComponent
          disabled={isProcessing}
          label="Nested Display"
          value={form.nestedDisplay}
          setValue={(v) => {
            updateField('nestedDisplay', v);
          }}
          options={Object.values(CategoryDisplay)}
        />
      </Grid>
    </Grid>
  );
};
