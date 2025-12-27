import { type PrimitiveAtom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';

import { CallSplit, Link as LinkIcon } from '@mui/icons-material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Box, Grid, IconButton, InputAdornment, Tab, Tooltip, useMediaQuery, useTheme } from '@mui/material';

import { PriceDisplay } from '@wcp/wario-shared/logic';
import { type ICatalog, type IProduct, type ProductInstanceModifierEntry } from '@wcp/wario-shared/types';
import {
  minimizeModifierSelections,
  ProductModifierEditor,
  useModifierEditor,
} from '@wcp/wario-ux-shared/product-customizer';
import { useCatalogQuery } from '@wcp/wario-ux-shared/query';

type UncommittedIProduct = Omit<IProduct, 'id' | 'instances'>;

import { ExternalIdsExpansionPanelComponent } from '@/components/wario/ExternalIdsExpansionPanelComponent';
import { ElementActionComponent } from '@/components/wario/menu/element.action.component';
import { IntNumericPropertyComponent } from '@/components/wario/property-components/IntNumericPropertyComponent';
import { StringEnumPropertyComponent } from '@/components/wario/property-components/StringEnumPropertyComponent';
import { StringPropertyComponent } from '@/components/wario/property-components/StringPropertyComponent';
import { ToggleBooleanPropertyComponent } from '@/components/wario/property-components/ToggleBooleanPropertyComponent';

import { productInstancesDirtyAtom } from '@/atoms/forms/productFormAtoms';
import {
  productInstanceFormAtom,
  productInstanceFormDirtyFieldsAtom,
  productInstanceFormProcessingAtom,
  type ProductInstanceFormState,
  useProductInstanceForm,
} from '@/atoms/forms/productInstanceFormAtoms';

// =============================================================================
// Form Body
// =============================================================================

export interface ProductInstanceFormBodyProps {
  parent_product: UncommittedIProduct;
  formAtom?: PrimitiveAtom<ProductInstanceFormState | null>;
}

export const ProductInstanceFormBody = ({
  parent_product,
  formAtom = productInstanceFormAtom,
}: ProductInstanceFormBodyProps) => {
  const [form, setForm] = useAtom(formAtom);
  const { data: catalog } = useCatalogQuery();

  if (!catalog || !form) {
    return null;
  }
  return (
    <ProductInstanceFormBodyInner parent_product={parent_product} form={form} setForm={setForm} catalog={catalog} />
  );
};

const ProductInstanceFormBodyInner = ({
  parent_product,
  form,
  setForm,
  catalog,
}: {
  parent_product: UncommittedIProduct;
  form: ProductInstanceFormState;
  setForm: (
    update: ProductInstanceFormState | ((prev: ProductInstanceFormState | null) => ProductInstanceFormState | null),
  ) => void;
  catalog: ICatalog;
}) => {
  const isProcessing = useAtomValue(productInstanceFormProcessingAtom);
  const setDirtyFields = useSetAtom(productInstanceFormDirtyFieldsAtom);
  const setInstancesDirty = useSetAtom(productInstancesDirtyAtom);
  const theme = useTheme();
  const useToggleEndLabel = !useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const updateField = <K extends keyof ProductInstanceFormState>(field: K, value: ProductInstanceFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setDirtyFields((prev) => new Set(prev).add(field));
    setInstancesDirty(true);
  };

  // Use shared modifier editor hook
  const handleModifiersChange = (mods: ProductInstanceModifierEntry[]) => {
    updateField('modifiers', minimizeModifierSelections(mods));
  };

  const { normalizedModifiers, selectRadio, toggleCheckbox, getModifierType } = useModifierEditor({
    productModifiers: parent_product.modifiers,
    currentSelections: form.modifiers,
    onSelectionsChange: handleModifiersChange,
    catalog,
  });

  // Create getOption helper for ProductModifierEditor
  const getOption = (optionId: string) => catalog.options[optionId];

  return (
    <>
      <TabPanel value="identity">
        <Grid container spacing={2}>
          <Grid size={{ xs: form.posName !== '' ? 6 : 12 }}>
            <StringPropertyComponent
              label="Display Name"
              value={form.displayName}
              setValue={(val) => {
                updateField('displayName', val);
              }}
              disabled={isProcessing}
              slotProps={{
                input: {
                  endAdornment:
                    form.posName === '' ? (
                      <InputAdornment position="end">
                        <Tooltip title="Override POS Name">
                          <IconButton
                            onClick={() => {
                              updateField('posName', form.displayName);
                            }}
                            edge="end"
                            size="small"
                          >
                            <CallSplit />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ) : undefined,
                },
              }}
            />
          </Grid>
          {form.posName !== '' && (
            <Grid size={{ xs: 6 }}>
              <StringPropertyComponent
                label="POS Name"
                value={form.posName}
                setValue={(v) => {
                  updateField('posName', v);
                }}
                disabled={isProcessing}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Reset to match Display Name">
                          <IconButton
                            onClick={() => {
                              updateField('posName', '');
                            }}
                            edge="end"
                            size="small"
                          >
                            <LinkIcon />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
          )}
          <Grid size={{ xs: 12, md: 8 }}>
            <StringPropertyComponent
              disabled={isProcessing}
              label="Description"
              value={form.description}
              setValue={(v) => {
                updateField('description', v);
              }}
            />
          </Grid>
          {/* universal break */}
          <Grid size={{ xs: 9, sm: 9.5 }}>
            <StringPropertyComponent
              disabled={isProcessing}
              label="Short Code"
              value={form.shortcode}
              setValue={(v) => {
                updateField('shortcode', v);
              }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <ExternalIdsExpansionPanelComponent
              title="External IDs"
              disabled={isProcessing}
              value={form.externalIds}
              setValue={(v) => {
                updateField('externalIds', v);
              }}
            />
          </Grid>
        </Grid>
      </TabPanel>

      {/* ==============================
          TAB: DISPLAY
         ============================== */}
      <TabPanel value="display">
        <Grid container spacing={3}>
          {/* Menu Display Section */}
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 3, sm: 2.5 }}>
                <IntNumericPropertyComponent
                  disabled={isProcessing}
                  label="Menu Ordinal"
                  value={form.menuOrdinal}
                  setValue={(v) => {
                    updateField('menuOrdinal', v);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 9, sm: 9.5 }}>
                <StringPropertyComponent
                  disabled={isProcessing}
                  label="Menu Adornment"
                  value={form.menuAdornment}
                  setValue={(v) => {
                    updateField('menuAdornment', v);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <ToggleBooleanPropertyComponent
                  disabled={isProcessing}
                  label="Menu Hide"
                  value={form.menuHide}
                  setValue={(v) => {
                    updateField('menuHide', v);
                  }}
                  labelPlacement={useToggleEndLabel ? 'end' : 'top'}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <ToggleBooleanPropertyComponent
                  disabled={isProcessing}
                  label="Menu Suppress Exhaustive Modifiers"
                  value={form.menuSuppressExhaustiveModifierList}
                  setValue={(v) => {
                    updateField('menuSuppressExhaustiveModifierList', v);
                  }}
                  labelPlacement={useToggleEndLabel ? 'end' : 'top'}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <ToggleBooleanPropertyComponent
                  disabled={isProcessing}
                  label="Show Modifier Options in Menu Display"
                  value={form.menuShowModifierOptions}
                  setValue={(v) => {
                    updateField('menuShowModifierOptions', v);
                  }}
                  labelPlacement={useToggleEndLabel ? 'end' : 'top'}
                />
              </Grid>
              <Grid container size={{ xs: 12 }}>
                <StringEnumPropertyComponent
                  disabled={isProcessing}
                  label="Menu Price Display"
                  value={form.menuPriceDisplay}
                  setValue={(v) => {
                    updateField('menuPriceDisplay', v);
                  }}
                  options={Object.values(PriceDisplay)}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Order App Display Section */}
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 3, sm: 2.5 }}>
                <IntNumericPropertyComponent
                  disabled={isProcessing}
                  label="Order Ordinal"
                  value={form.orderOrdinal}
                  setValue={(v) => {
                    updateField('orderOrdinal', v);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 9, sm: 9.5 }}>
                <StringPropertyComponent
                  disabled={isProcessing}
                  label="Order Menu Adornment"
                  value={form.orderAdornment}
                  setValue={(v) => {
                    updateField('orderAdornment', v);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <ToggleBooleanPropertyComponent
                  disabled={isProcessing}
                  label="Order Menu Hide"
                  value={form.orderHide}
                  setValue={(v) => {
                    updateField('orderHide', v);
                  }}
                  labelPlacement={useToggleEndLabel ? 'end' : 'top'}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <ToggleBooleanPropertyComponent
                  disabled={isProcessing}
                  label="Order Menu Suppress Exhaustive Modifiers"
                  value={form.orderSuppressExhaustiveModifierList}
                  setValue={(v) => {
                    updateField('orderSuppressExhaustiveModifierList', v);
                  }}
                  labelPlacement={useToggleEndLabel ? 'end' : 'top'}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <ToggleBooleanPropertyComponent
                  disabled={parent_product.modifiers.length === 0 || isProcessing}
                  label="Skip Customization (Order)"
                  value={parent_product.modifiers.length === 0 || form.orderSkipCustomization}
                  setValue={(v) => {
                    updateField('orderSkipCustomization', v);
                  }}
                  labelPlacement={useToggleEndLabel ? 'end' : 'top'}
                />
              </Grid>
              <Grid container size={{ xs: 12, sm: 6 }}>
                <StringEnumPropertyComponent
                  disabled={isProcessing}
                  label="Order Menu Price Display"
                  value={form.orderPriceDisplay}
                  setValue={(v) => {
                    updateField('orderPriceDisplay', v);
                  }}
                  options={Object.values(PriceDisplay)}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* POS Display Section */}
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <ToggleBooleanPropertyComponent
                  disabled={isProcessing}
                  label="Hide From POS"
                  value={form.posHide}
                  setValue={(v) => {
                    updateField('posHide', v);
                  }}
                  labelPlacement={useToggleEndLabel ? 'end' : 'top'}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <ToggleBooleanPropertyComponent
                  disabled={parent_product.modifiers.length === 0 || isProcessing}
                  label="Skip Customization (POS)"
                  value={parent_product.modifiers.length === 0 || form.posSkipCustomization}
                  setValue={(v) => {
                    updateField('posSkipCustomization', v);
                  }}
                  labelPlacement={useToggleEndLabel ? 'end' : 'top'}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ==============================
          TAB: MODIFIERS
         ============================== */}
      <TabPanel value="modifiers">
        <ProductModifierEditor
          modifierEntries={normalizedModifiers}
          getModifierType={getModifierType}
          getOption={getOption}
          onSelectRadio={selectRadio}
          onToggleCheckbox={toggleCheckbox}
          layout="cards"
        />
      </TabPanel>
    </>
  );
};

export const ProductInstanceContainer = ({ parent_product, formAtom }: ProductInstanceFormBodyProps) => {
  const [tab, setTab] = useState('identity');

  return (
    <TabContext value={tab}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <TabList
          onChange={(_: unknown, v: string) => {
            setTab(v);
          }}
          aria-label="Product instance tabs"
        >
          <Tab label="Identity" value="identity" />
          <Tab label="Display" value="display" />
          <Tab label="Modifiers" value="modifiers" />
        </TabList>
      </Box>
      <ProductInstanceFormBody parent_product={parent_product} formAtom={formAtom} />
    </TabContext>
  );
};

export interface ProductInstanceActionContainerProps {
  confirmText: string;
  onCloseCallback: VoidFunction;
  onConfirmClick: VoidFunction;
  disableConfirm?: boolean;
  parent_product: UncommittedIProduct;
}

export const ProductInstanceActionContainer = ({
  confirmText,
  onCloseCallback,
  onConfirmClick,
  disableConfirm = false,
  parent_product,
}: ProductInstanceActionContainerProps) => {
  const { isValid, isProcessing } = useProductInstanceForm();

  return (
    <ElementActionComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={onConfirmClick}
      isProcessing={isProcessing}
      disableConfirmOn={disableConfirm || !isValid || isProcessing}
      confirmText={confirmText}
      body={<ProductInstanceContainer parent_product={parent_product} />}
    />
  );
};
