import { type PrimitiveAtom, useAtom, useAtomValue } from 'jotai';
import { useMemo } from 'react';

import {
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import {
  type ICatalog,
  type ICatalogModifiers,
  OptionPlacement,
  OptionQualifier,
  PriceDisplay,
  type ProductModifierEntry,
  type UncommittedIProduct,
} from '@wcp/wario-shared';
import { useCatalogQuery } from '@wcp/wario-ux-shared/query';

import { ExternalIdsExpansionPanelComponent } from '@/components/wario/ExternalIdsExpansionPanelComponent';
import { ElementActionComponent } from '@/components/wario/menu/element.action.component';
import { IntNumericPropertyComponent } from '@/components/wario/property-components/IntNumericPropertyComponent';
import { StringEnumPropertyComponent } from '@/components/wario/property-components/StringEnumPropertyComponent';
import { StringPropertyComponent } from '@/components/wario/property-components/StringPropertyComponent';
import { ToggleBooleanPropertyComponent } from '@/components/wario/property-components/ToggleBooleanPropertyComponent';

import {
  productInstanceFormAtom,
  productInstanceFormProcessingAtom,
  type ProductInstanceFormState,
  useProductInstanceForm,
} from '@/atoms/forms/productInstanceFormAtoms';

// =============================================================================
// Helper Functions
// =============================================================================

const normalizeModifiersAndOptions = (
  parent_product: UncommittedIProduct,
  modifier_types_map: ICatalogModifiers,
  minimizedModifiers: ProductModifierEntry[],
): ProductModifierEntry[] =>
  parent_product.modifiers.map((modifier_entry) => {
    const modEntry = minimizedModifiers.find((x) => x.modifierTypeId === modifier_entry.mtid);
    const modOptions = modEntry ? modEntry.options : [];
    return {
      modifierTypeId: modifier_entry.mtid,
      options: modifier_types_map[modifier_entry.mtid].options.map((option) => {
        const foundOptionState = modOptions.find((x) => x.optionId === option);
        return {
          optionId: option,
          placement: foundOptionState ? foundOptionState.placement : OptionPlacement.NONE,
          qualifier: foundOptionState ? foundOptionState.qualifier : OptionQualifier.REGULAR,
        };
      }),
    };
  });

const minimizeModifiers = (normalized_modifiers: ProductModifierEntry[]): ProductModifierEntry[] =>
  normalized_modifiers.reduce<ProductModifierEntry[]>((acc, modifier) => {
    const filtered_options = modifier.options.filter((x) => x.placement !== OptionPlacement.NONE);
    return filtered_options.length ? [...acc, { ...modifier, options: filtered_options }] : acc;
  }, []);

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

  const theme = useTheme();
  const useToggleEndLabel = !useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const modifierOptionsMap = catalog.options;
  const modifier_types_map = catalog.modifiers;

  const updateField = <K extends keyof ProductInstanceFormState>(field: K, value: ProductInstanceFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const normalizedModifers = useMemo(
    () => normalizeModifiersAndOptions(parent_product, catalog.modifiers, form.modifiers),
    [parent_product, form.modifiers, catalog],
  );

  const handleSetModifiers = (mods: ProductModifierEntry[]) => {
    updateField('modifiers', minimizeModifiers(mods));
  };

  const handlePosNameChange = (posName: string) => {
    updateField('posName', posName === form.displayName ? '' : posName);
  };

  const handleToggle = (mtid: string, oidx: number) => {
    const foundModifierEntryIndex = normalizedModifers.findIndex((x) => x.modifierTypeId === mtid);
    const currentOption = normalizedModifers[foundModifierEntryIndex].options[oidx];

    handleSetModifiers([
      ...normalizedModifers.slice(0, foundModifierEntryIndex),
      {
        modifierTypeId: mtid,
        options: [
          ...normalizedModifers[foundModifierEntryIndex].options.slice(0, oidx),
          {
            optionId: currentOption.optionId,
            qualifier: currentOption.qualifier,
            placement: currentOption.placement === OptionPlacement.WHOLE ? OptionPlacement.NONE : OptionPlacement.WHOLE,
          },
          ...normalizedModifers[foundModifierEntryIndex].options.slice(oidx + 1),
        ],
      },
      ...normalizedModifers.slice(foundModifierEntryIndex + 1),
    ]);
  };

  const handleRadioChange = (mtid: string, oidx: number) => {
    const foundModifierEntryIndex = normalizedModifers.findIndex((x) => x.modifierTypeId === mtid);
    handleSetModifiers([
      ...normalizedModifers.slice(0, foundModifierEntryIndex),
      {
        modifierTypeId: mtid,
        options: normalizedModifers[foundModifierEntryIndex].options.map((opt, idx) => ({
          optionId: opt.optionId,
          placement: idx === oidx ? OptionPlacement.WHOLE : OptionPlacement.NONE,
          qualifier: OptionQualifier.REGULAR,
        })),
      },
      ...normalizedModifers.slice(foundModifierEntryIndex + 1),
    ]);
  };

  return (
    <>
      <Grid
        size={{
          xs: 12,
          md: 4,
        }}
      >
        <StringPropertyComponent
          disabled={isProcessing}
          label="Display Name"
          value={form.displayName}
          setValue={(v) => {
            updateField('displayName', v);
          }}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          md: 8,
        }}
      >
        <StringPropertyComponent
          disabled={isProcessing}
          label="Description"
          value={form.description}
          setValue={(v) => {
            updateField('description', v);
          }}
        />
      </Grid>
      <Grid size={12}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="POS Name Override"
          value={form.posName === '' ? form.displayName : form.posName}
          setValue={handlePosNameChange}
        />
      </Grid>
      {/* universal break */}
      <Grid
        size={{
          xs: 3,
          sm: 2.5,
        }}
      >
        <IntNumericPropertyComponent
          disabled={isProcessing}
          label="Ordinal"
          value={form.ordinal}
          setValue={(v) => {
            updateField('ordinal', v);
          }}
        />
      </Grid>
      <Grid
        size={{
          xs: 9,
          sm: 9.5,
        }}
      >
        <StringPropertyComponent
          disabled={isProcessing}
          label="Short Code"
          value={form.shortcode}
          setValue={(v) => {
            updateField('shortcode', v);
          }}
        />
      </Grid>
      {/* universal break */}
      <Grid
        size={{
          xs: 3,
          sm: 2.5,
        }}
      >
        <IntNumericPropertyComponent
          disabled={isProcessing}
          label="Menu Ordinal"
          value={form.menuOrdinal}
          setValue={(v) => {
            updateField('menuOrdinal', v);
          }}
        />
      </Grid>
      <Grid
        size={{
          xs: 9,
          sm: 9.5,
        }}
      >
        <StringPropertyComponent
          disabled={isProcessing}
          label="Menu Adornment (Optional, HTML allowed)"
          value={form.menuAdornment}
          setValue={(v) => {
            updateField('menuAdornment', v);
          }}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4,
        }}
      >
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
      {/* universal break */}
      <Grid
        size={{
          xs: 12,
          sm: 4,
        }}
      >
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
      <Grid
        size={{
          xs: 12,
          sm: 4,
        }}
      >
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
      {/* universal break */}
      <Grid container size={12}>
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
      {/* universal break */}
      <Grid
        size={{
          xs: 3,
          sm: 2.5,
        }}
      >
        <IntNumericPropertyComponent
          disabled={isProcessing}
          label="Order Ordinal"
          value={form.orderOrdinal}
          setValue={(v) => {
            updateField('orderOrdinal', v);
          }}
        />
      </Grid>
      <Grid
        size={{
          xs: 9,
          sm: 9.5,
        }}
      >
        <StringPropertyComponent
          disabled={isProcessing}
          label="Order Menu Adornment (Optional, HTML allowed)"
          value={form.orderAdornment}
          setValue={(v) => {
            updateField('orderAdornment', v);
          }}
        />
      </Grid>
      {/* universal break */}
      <Grid
        size={{
          xs: 12,
          sm: 4,
        }}
      >
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
      <Grid
        size={{
          xs: 12,
          sm: 4,
        }}
      >
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
      <Grid
        size={{
          xs: 12,
          sm: 4,
        }}
      >
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
      {/* universal break */}
      <Grid
        container
        size={{
          xs: 12,
          sm: 6,
        }}
      >
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
      <Grid
        size={{
          xs: 12,
          sm: 3,
        }}
      >
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
      <Grid
        size={{
          xs: 12,
          sm: 3,
        }}
      >
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
      {/* universal break */}
      <Grid size={12}>
        <ExternalIdsExpansionPanelComponent
          title="External IDs"
          disabled={isProcessing}
          value={form.externalIds}
          setValue={(v) => {
            updateField('externalIds', v);
          }}
        />
      </Grid>
      {parent_product.modifiers.map((modifier_entry, i) => {
        const { mtid } = modifier_entry;
        const mt = modifier_types_map[mtid].modifierType;
        const mt_options = modifier_types_map[mtid].options;
        return (
          <Grid
            key={mtid}
            size={{
              xs: 12,
              lg: i === parent_product.modifiers.length - 1 && parent_product.modifiers.length % 2 === 1 ? 12 : 6,
            }}
          >
            <Card>
              <CardContent>
                <FormControl component="fieldset">
                  <FormLabel>{mt.name}</FormLabel>
                  <>
                    {mt.min_selected === 1 && mt.max_selected === 1 ? (
                      <RadioGroup
                        aria-label={mt.id}
                        name={mt.name}
                        row
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        value={normalizedModifers
                          .find((x) => x.modifierTypeId === mtid)!
                          .options.findIndex((o) => o.placement === OptionPlacement.WHOLE)}
                        onChange={(e) => {
                          handleRadioChange(mtid, parseInt(e.target.value));
                        }}
                      >
                        {mt_options.map((oId, oidx) => (
                          <FormControlLabel
                            key={oidx}
                            control={<Radio disableRipple />}
                            value={oidx}
                            label={modifierOptionsMap[oId].displayName}
                          />
                        ))}
                      </RadioGroup>
                    ) : (
                      <FormGroup row>
                        {mt_options.map((oId, oidx) => (
                          <FormControlLabel
                            key={oidx}
                            control={
                              <Checkbox
                                checked={
                                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                  normalizedModifers.find((x) => x.modifierTypeId === mtid)!.options[oidx].placement ===
                                  OptionPlacement.WHOLE
                                }
                                onChange={() => {
                                  handleToggle(mtid, oidx);
                                }}
                                disableRipple
                                slotProps={{
                                  input: {
                                    'aria-labelledby': String(oidx),
                                  },
                                }}
                              />
                            }
                            label={modifierOptionsMap[oId].displayName}
                          />
                        ))}
                      </FormGroup>
                    )}
                  </>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </>
  );
};

export const ProductInstanceContainer = ({ parent_product, formAtom }: ProductInstanceFormBodyProps) => {
  return <ProductInstanceFormBody parent_product={parent_product} formAtom={formAtom} />;
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
