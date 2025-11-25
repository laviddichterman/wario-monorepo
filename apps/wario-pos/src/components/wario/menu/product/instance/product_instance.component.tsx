import { useMemo } from "react";

import { Card, CardContent, Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel, Grid, Radio, RadioGroup, useMediaQuery, useTheme } from '@mui/material';

import type { CreateIProduct, ICatalogModifiers, KeyValue, ProductModifierEntry } from "@wcp/wario-shared";
import { OptionPlacement, OptionQualifier, PriceDisplay } from "@wcp/wario-shared";
import type { ValSetValNamed } from "@wcp/wario-ux-shared";

import { useAppSelector } from "@/hooks/useRedux";

import { ExternalIdsExpansionPanelComponent } from "@/components/wario/ExternalIdsExpansionPanelComponent";
import { ElementActionComponent } from "@/components/wario/menu/element.action.component";
import { IntNumericPropertyComponent } from "@/components/wario/property-components/IntNumericPropertyComponent";
import { StringEnumPropertyComponent } from "@/components/wario/property-components/StringEnumPropertyComponent";
import { StringPropertyComponent } from "@/components/wario/property-components/StringPropertyComponent";
import { ToggleBooleanPropertyComponent } from "@/components/wario/property-components/ToggleBooleanPropertyComponent";

export type ProductInstanceComponentProps =
  ValSetValNamed<string, 'displayName'> &
  ValSetValNamed<string, 'description'> &
  ValSetValNamed<string, 'shortcode'> &
  ValSetValNamed<number, 'ordinal'> &
  ValSetValNamed<ProductModifierEntry[], 'modifiers'> &
  // pos
  ValSetValNamed<boolean, 'hideFromPos'> &
  ValSetValNamed<string, 'posName'> &
  ValSetValNamed<boolean, 'posSkipCustomization'> &
  // menu
  ValSetValNamed<number, 'menuOrdinal'> &
  ValSetValNamed<boolean, 'menuHide'> &
  ValSetValNamed<PriceDisplay, 'menuPriceDisplay'> &
  ValSetValNamed<string, 'menuAdornment'> &
  ValSetValNamed<boolean, 'menuSuppressExhaustiveModifierList'> &
  ValSetValNamed<boolean, 'menuShowModifierOptions'> &
  // order
  ValSetValNamed<number, 'orderOrdinal'> &
  ValSetValNamed<boolean, 'orderMenuHide'> &
  ValSetValNamed<boolean, 'orderSkipCustomization'> &
  ValSetValNamed<PriceDisplay, 'orderPriceDisplay'> &
  ValSetValNamed<string, 'orderAdornment'> &
  ValSetValNamed<boolean, 'orderSuppressExhaustiveModifierList'> &

  ValSetValNamed<KeyValue[], 'externalIds'> &

  {
    parent_product: CreateIProduct;
    isProcessing: boolean;
  };

const ProductInstanceComponent = (props: ProductInstanceComponentProps) => {
  const theme = useTheme();
  const useToggleEndLabel = !useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const modifierOptionsMap = useAppSelector(s => s.ws.catalog?.options ?? {});
  const modifier_types_map = useAppSelector(s => s.ws.catalog?.modifiers ?? {});

  const handlePosNameChange = (posName: string) => {
    props.setPosName(posName === props.displayName ? "" : posName)
  }
  const handleToggle = (mtid: string, oidx: number) => {
    const foundModifierEntryIndex = props.modifiers.findIndex(x => x.modifierTypeId === mtid);

    props.setModifiers([
      ...props.modifiers.slice(0, foundModifierEntryIndex),
      {
        modifierTypeId: mtid, options: [
          ...props.modifiers[foundModifierEntryIndex].options.slice(0, oidx),
          // eslint-disable-next-line @typescript-eslint/no-misused-spread
          { ...props.modifiers[foundModifierEntryIndex].options[oidx], placement: props.modifiers[foundModifierEntryIndex].options[oidx].placement === OptionPlacement.WHOLE ? OptionPlacement.NONE : OptionPlacement.WHOLE },
          ...props.modifiers[foundModifierEntryIndex].options.slice(oidx + 1)]
      },
      ...props.modifiers.slice(foundModifierEntryIndex + 1)]);
  };

  const handleRadioChange = (mtid: string, oidx: number) => {
    const foundModifierEntryIndex = props.modifiers.findIndex(x => x.modifierTypeId === mtid);
    props.setModifiers([
      ...props.modifiers.slice(0, foundModifierEntryIndex),
      {
        modifierTypeId: mtid, options: props.modifiers[foundModifierEntryIndex].options.map((opt, idx) => (
          {
            optionId: opt.optionId,
            placement: idx === oidx ? OptionPlacement.WHOLE : OptionPlacement.NONE,
            qualifier: OptionQualifier.REGULAR

          }))
      },
      ...props.modifiers.slice(foundModifierEntryIndex + 1)]);
  };

  return (
    <>
      <Grid
        size={{
          xs: 12,
          md: 4
        }}>
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Display Name"
          value={props.displayName}
          setValue={props.setDisplayName}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          md: 8
        }}>
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Description"
          value={props.description}
          setValue={props.setDescription}
        />
      </Grid>
      <Grid size={12}>
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="POS Name Override"
          value={props.posName === "" ? props.displayName : props.posName}
          setValue={handlePosNameChange}
        />
      </Grid>
      {/* universal break */}
      <Grid
        size={{
          xs: 3,
          sm: 2.5
        }}>
        <IntNumericPropertyComponent
          disabled={props.isProcessing}
          label="Ordinal"
          value={props.ordinal}
          setValue={props.setOrdinal}
        />
      </Grid>
      <Grid
        size={{
          xs: 9,
          sm: 9.5
        }}>
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Short Code"
          value={props.shortcode}
          setValue={props.setShortcode}
        />
      </Grid>
      {/* universal break */}
      <Grid
        size={{
          xs: 3,
          sm: 2.5
        }}>
        <IntNumericPropertyComponent
          disabled={props.isProcessing}
          label="Menu Ordinal"
          value={props.menuOrdinal}
          setValue={props.setMenuOrdinal}
        />
      </Grid>
      <Grid
        size={{
          xs: 9,
          sm: 9.5
        }}>
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Menu Adornment (Optional, HTML allowed)"
          value={props.menuAdornment}
          setValue={props.setMenuAdornment}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Menu Hide"
          value={props.menuHide}
          setValue={props.setMenuHide}
          labelPlacement={useToggleEndLabel ? "end" : "top"}
        />
      </Grid>
      {/* universal break */}
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Menu Suppress Exhaustive Modifiers"
          value={props.menuSuppressExhaustiveModifierList}
          setValue={props.setMenuSuppressExhaustiveModifierList}
          labelPlacement={useToggleEndLabel ? "end" : "top"}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Show Modifier Options in Menu Display"
          value={props.menuShowModifierOptions}
          setValue={props.setMenuShowModifierOptions}
          labelPlacement={useToggleEndLabel ? "end" : "top"}
        />
      </Grid>
      {/* universal break */}
      <Grid container size={12}>
        <StringEnumPropertyComponent
          disabled={props.isProcessing}
          label="Menu Price Display"
          value={props.menuPriceDisplay}
          setValue={props.setMenuPriceDisplay}
          options={Object.values(PriceDisplay)}
        />
      </Grid>
      {/* universal break */}
      <Grid
        size={{
          xs: 3,
          sm: 2.5
        }}>
        <IntNumericPropertyComponent
          disabled={props.isProcessing}
          label="Order Ordinal"
          value={props.orderOrdinal}
          setValue={props.setOrderOrdinal}
        />
      </Grid>
      <Grid
        size={{
          xs: 9,
          sm: 9.5
        }}>
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Order Menu Adornment (Optional, HTML allowed)"
          value={props.orderAdornment}
          setValue={props.setOrderAdornment}
        />
      </Grid>
      {/* universal break */}
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Order Menu Hide"
          value={props.orderMenuHide}
          setValue={props.setOrderMenuHide}
          labelPlacement={useToggleEndLabel ? "end" : "top"}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Order Menu Suppress Exhaustive Modifiers"
          value={props.orderSuppressExhaustiveModifierList}
          setValue={props.setOrderSuppressExhaustiveModifierList}
          labelPlacement={useToggleEndLabel ? "end" : "top"}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <ToggleBooleanPropertyComponent
          disabled={props.parent_product.modifiers.length === 0 || props.isProcessing}
          label="Skip Customization (Order)"
          value={props.parent_product.modifiers.length === 0 || props.orderSkipCustomization}
          setValue={props.setOrderSkipCustomization}
          labelPlacement={useToggleEndLabel ? "end" : "top"}
        />
      </Grid>
      {/* universal break */}
      <Grid
        container
        size={{
          xs: 12,
          sm: 6
        }}>
        <StringEnumPropertyComponent
          disabled={props.isProcessing}
          label="Order Menu Price Display"
          value={props.orderPriceDisplay}
          setValue={props.setOrderPriceDisplay}
          options={Object.values(PriceDisplay)}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 3
        }}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Hide From POS"
          value={props.hideFromPos}
          setValue={props.setHideFromPos}
          labelPlacement={useToggleEndLabel ? "end" : "top"}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 3
        }}>
        <ToggleBooleanPropertyComponent
          disabled={props.parent_product.modifiers.length === 0 || props.isProcessing}
          label="Skip Customization (POS)"
          value={props.parent_product.modifiers.length === 0 || props.posSkipCustomization}
          setValue={props.setPosSkipCustomization}
          labelPlacement={useToggleEndLabel ? "end" : "top"}
        />
      </Grid>
      {/* universal break */}
      <Grid size={12}>
        <ExternalIdsExpansionPanelComponent
          title='External IDs'
          disabled={props.isProcessing}
          value={props.externalIds}
          setValue={props.setExternalIds}
        />
      </Grid>
      {props.parent_product.modifiers.map((modifier_entry, i) => {
        const { mtid } = modifier_entry;
        const mt = modifier_types_map[mtid].modifierType;
        const mt_options = modifier_types_map[mtid].options;
        return (
          <Grid
            key={mtid}
            size={{
              xs: 12,
              lg: (i === (props.parent_product.modifiers.length - 1) && props.parent_product.modifiers.length % 2 === 1) ? 12 : 6
            }}>
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
                        value={props.modifiers.find(x => x.modifierTypeId === mtid)!.options.findIndex(
                          (o) => o.placement === OptionPlacement.WHOLE
                        )}
                        onChange={(e) => { handleRadioChange(mtid, parseInt(e.target.value)); }}
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
                                  props.modifiers.find(x => x.modifierTypeId === mtid)!.options[oidx].placement === OptionPlacement.WHOLE
                                }
                                onChange={() => { handleToggle(mtid, oidx); }}
                                disableRipple
                                slotProps={{
                                  input: {
                                    "aria-labelledby": String(oidx)
                                  }
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
      })
      }
    </>
  );
};

const normalizeModifiersAndOptions = (
  parent_product: CreateIProduct,
  modifier_types_map: ICatalogModifiers,
  minimizedModifiers: ProductModifierEntry[]
): ProductModifierEntry[] => parent_product.modifiers.map(
  (modifier_entry) => {
    const modEntry = minimizedModifiers.find(x => x.modifierTypeId === modifier_entry.mtid);
    const modOptions = modEntry ? modEntry.options : [];
    return {
      modifierTypeId: modifier_entry.mtid,
      options: modifier_types_map[modifier_entry.mtid].options.map((option) => {
        const foundOptionState = modOptions.find(x => x.optionId === option);
        return {
          optionId: option,
          placement: foundOptionState ? foundOptionState.placement : OptionPlacement.NONE,
          qualifier: foundOptionState ? foundOptionState.qualifier : OptionQualifier.REGULAR
        }
      })
    };
  });

const minimizeModifiers = (normalized_modifiers: ProductModifierEntry[]): ProductModifierEntry[] =>
  normalized_modifiers.reduce<ProductModifierEntry[]>((acc, modifier) => {
    const filtered_options = modifier.options.filter(x => x.placement !== OptionPlacement.NONE);
    return filtered_options.length ? [...acc, { ...modifier, options: filtered_options }] : acc;
  }, []);


export const ProductInstanceContainer = ({ parent_product, modifiers, setModifiers, ...otherProps }: ProductInstanceComponentProps) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const modifier_types_map = useAppSelector(s => s.ws.catalog!.modifiers);
  const normalizedModifers = useMemo(() => normalizeModifiersAndOptions(parent_product, modifier_types_map, modifiers), [parent_product, modifier_types_map, modifiers]);

  const setNormalizedModifiersIntermediate = (mods: ProductModifierEntry[]) => {
    setModifiers(minimizeModifiers(mods));
  };

  return (
    <ProductInstanceComponent
      parent_product={parent_product}
      modifiers={normalizedModifers}
      setModifiers={setNormalizedModifiersIntermediate}
      {...otherProps}
    />
  );
};

interface ProductInstanceActionContainerProps {
  confirmText: string;
  onCloseCallback: VoidFunction;
  onConfirmClick: VoidFunction;
  isProcessing: boolean;
  displayName: string;
  shortcode: string;
}

export const ProductInstanceActionContainer = ({
  confirmText,
  onCloseCallback,
  onConfirmClick,
  isProcessing,
  displayName,
  shortcode,
  ...otherProps
}: ProductInstanceActionContainerProps & ProductInstanceComponentProps) => (
  <ElementActionComponent
    onCloseCallback={onCloseCallback}
    onConfirmClick={onConfirmClick}
    isProcessing={isProcessing}
    disableConfirmOn={displayName.length === 0 || shortcode.length === 0 || isProcessing}
    confirmText={confirmText}
    body={
      <ProductInstanceContainer
        {...otherProps}
        isProcessing={isProcessing}
        displayName={displayName}
        shortcode={shortcode}
      />}
  />
)
