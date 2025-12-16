import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';

import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Box, Grid, Tab, TextField, Typography } from '@mui/material';

import { CALL_LINE_DISPLAY, CategoryDisplay } from '@wcp/wario-shared/logic';
import { useFulfillments } from '@wcp/wario-ux-shared/query';

import {
  categoryFormAtom,
  categoryFormDirtyFieldsAtom,
  categoryFormIsValidAtom,
  categoryFormProcessingAtom,
  type CategoryFormState,
} from '@/atoms/forms/categoryFormAtoms';

import { StringEnumPropertyComponent } from '../../property-components/StringEnumPropertyComponent';
import { StringPropertyComponent } from '../../property-components/StringPropertyComponent';

import { CategoryChildrenList } from './category.children.component';
import { DisabledServicesAutocomplete } from './category.disabled-services.component';
import { CategoryProductList } from './category.products.component';

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
 * Uses tabs to organize Settings and Contents (children/products).
 */
export const CategoryFormBody = ({ excludeCategoryId }: CategoryFormBodyProps) => {
  const [form, setForm] = useAtom(categoryFormAtom);
  const isProcessing = useAtomValue(categoryFormProcessingAtom);
  const setDirtyFields = useSetAtom(categoryFormDirtyFieldsAtom);
  const fulfillments = useFulfillments();

  const [activeTab, setActiveTab] = useState('settings');

  if (!form) return null;

  const updateField = <K extends keyof CategoryFormState>(field: K, value: CategoryFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setDirtyFields((prev) => new Set(prev).add(field));
  };

  return (
    <TabContext value={activeTab}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <TabList
          onChange={(_e, v: string) => {
            setActiveTab(v);
          }}
        >
          <Tab label="Settings" value="settings" />
          <Tab label="Contents" value="contents" />
        </TabList>
      </Box>

      <TabPanel value="settings" sx={{ p: 0 }}>
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
            <DisabledServicesAutocomplete
              value={form.serviceDisable}
              onChange={(v: string[]) => {
                updateField('serviceDisable', v);
              }}
              fulfillments={fulfillments}
              disabled={isProcessing}
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
      </TabPanel>

      <TabPanel value="contents" sx={{ p: 0 }}>
        <Grid container spacing={3}>
          {/* ==============================
              CHILDREN CATEGORIES
             ============================== */}
          <Grid size={12}>
            <Typography variant="overline" color="text.secondary">
              Child Categories
            </Typography>
          </Grid>
          <Grid size={12}>
            <CategoryChildrenList excludeCategoryId={excludeCategoryId} />
          </Grid>

          {/* ==============================
              PRODUCTS
             ============================== */}
          <Grid size={12} sx={{ mt: 2 }}>
            <Typography variant="overline" color="text.secondary">
              Products
            </Typography>
          </Grid>
          <Grid size={12}>
            <CategoryProductList />
          </Grid>
        </Grid>
      </TabPanel>
    </TabContext>
  );
};
