import { createSelector } from '@reduxjs/toolkit';
import { useSnackbar } from 'notistack';
import React, { forwardRef, useMemo } from 'react';

import Circle from '@mui/icons-material/Circle';
import CircleOutlined from '@mui/icons-material/CircleOutlined';
import SettingsTwoTone from '@mui/icons-material/SettingsTwoTone';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl, { type FormControlProps } from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

import {
  type CatalogModifierEntry, DISABLE_REASON, type ICatalogSelectors, type IOption, type IOptionState, type MTID_MOID, OptionPlacement,
  OptionQualifier, type ProductModifierEntry, type Selector, SortAndFilterModifierOptions, SortProductModifierEntries, SortProductModifierOptions,
  type WCPProduct, WCPProductGenerateMetadata, type WProduct
} from '@wcp/wario-shared';
import {
  CustomizerFormControlLabel, DialogContainer, getModifierOptionById, getModifierTypeEntryById, getProductEntryById, scrollToIdOffsetAfterDelay,
  SelectBaseProductByProductId, SelectCatalogSelectors, Separator, StageTitle, WarioButton
} from '@wcp/wario-ux-shared';

import {
  selectAllowAdvancedPrompt,
  selectCartEntryBeingCustomized,
  selectIProductOfSelectedProduct,
  SelectModifierTypeNameFromModifierTypeId,
  SelectProductMetadataFromCustomProductWithCurrentFulfillmentData,
  SelectShouldFilterModifierTypeDisplay
} from '@/app/selectors';
import { addToCart, FindDuplicateInCart, getCart, removeFromCart, unlockCartEntry, updateCartProduct, updateCartQuantity } from '@/app/slices/WCartSlice';
import {
  clearCustomizer,
  selectOptionState,
  selectSelectedWProduct,
  selectShowAdvanced,
  setAdvancedModifierOption,
  setShowAdvanced,
  updateCustomizerProduct
} from '@/app/slices/WCustomizerSlice';
import { SelectServiceDateTime } from '@/app/slices/WFulfillmentSlice';
import { setTimeToFirstProductIfUnset } from '@/app/slices/WMetricsSlice';
import { type RootState } from '@/app/store';
import { useAppDispatch, useAppSelector } from '@/app/useHooks';

import { ModifierOptionTooltip } from './ModifierOptionTooltip';
import { OrderGuideErrorsComponent, OrderGuideMessagesComponent, OrderGuideWarningsComponent } from './WOrderGuideMessages';
import { ProductDisplay } from './WProductComponent';

interface IModifierOptionToggle {
  toggleOptionChecked: IOption;
  toggleOptionUnchecked: IOption;
}

const UpdateModifierOptionStateToggleOrRadio = (mtId: string, moId: string, selectedProduct: WProduct, catalogSelectors: ICatalogSelectors, serviceTime: number | Date, fulfillmentId: string) => {
  const newModifierOptions = [{ placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR, optionId: moId }];
  const modifierEntryIndex = selectedProduct.p.modifiers.findIndex(x => x.modifierTypeId === mtId);
  const newProductModifiers = structuredClone(selectedProduct.p.modifiers);
  if (modifierEntryIndex === -1) {
    newProductModifiers.push({ modifierTypeId: mtId, options: newModifierOptions });
    SortProductModifierEntries(newProductModifiers, catalogSelectors.modifierEntry);
  } else {
    newProductModifiers[modifierEntryIndex].options = newModifierOptions;
  }
  // regenerate metadata and return new product object
  return ({ m: WCPProductGenerateMetadata(selectedProduct.p.productId, newProductModifiers, catalogSelectors, serviceTime, fulfillmentId), p: { productId: selectedProduct.p.productId, modifiers: newProductModifiers } }) as WProduct;
}

const UpdateModifierOptionStateCheckbox = (mt: CatalogModifierEntry, mo: IOption, optionState: IOptionState, selectedProduct: WProduct, catalogSelectors: ICatalogSelectors, serviceTime: number | Date, fulfillmentId: string) => {
  const newOptInstance = { ...optionState, optionId: mo.id };
  const modifierEntryIndex = selectedProduct.p.modifiers.findIndex(x => x.modifierTypeId === mo.modifierTypeId);
  const newProductModifiers = structuredClone(selectedProduct.p.modifiers);
  let newModifierOptions = modifierEntryIndex !== -1 ? newProductModifiers[modifierEntryIndex].options : [];
  if (optionState.placement === OptionPlacement.NONE) {
    newModifierOptions = newModifierOptions.filter(x => x.optionId !== mo.id);
  } else {
    if (mt.modifierType.min_selected === 0 && mt.modifierType.max_selected === 1) {
      // checkbox that requires we unselect any other values since it kinda functions like a radio
      newModifierOptions = [];
    }
    const moIdX = newModifierOptions.findIndex(x => x.optionId === mo.id);
    if (moIdX === -1) {
      newModifierOptions.push(newOptInstance);
      SortProductModifierOptions(newModifierOptions, catalogSelectors.option);
    }
    else {
      newModifierOptions[moIdX] = newOptInstance;
    }
  }
  if (modifierEntryIndex === -1 && newModifierOptions.length > 0) {
    newProductModifiers.push({ modifierTypeId: mo.modifierTypeId, options: newModifierOptions });
    SortProductModifierEntries(newProductModifiers, catalogSelectors.modifierEntry);
  } else {
    if (newModifierOptions.length > 0) {
      newProductModifiers[modifierEntryIndex].options = newModifierOptions;
    } else {
      newProductModifiers.splice(modifierEntryIndex, 1);
    }
  }
  // regenerate metadata required after this call. handled by ListeningMiddleware
  return ({ m: WCPProductGenerateMetadata(selectedProduct.p.productId, newProductModifiers, catalogSelectors, serviceTime, fulfillmentId), p: { productId: selectedProduct.p.productId, modifiers: newProductModifiers } }) as WProduct;
}

function WModifierOptionToggle({ toggleOptionChecked, toggleOptionUnchecked }: IModifierOptionToggle) {
  const dispatch = useAppDispatch();
  const selectedProduct = useAppSelector(s => s.customizer.selectedProduct);
  const catalogSelectors = useAppSelector(s => SelectCatalogSelectors(s.ws));
  const serviceDateTime = useAppSelector(s => SelectServiceDateTime(s.fulfillment));
  const fulfillmentId = useAppSelector(s => s.fulfillment.selectedService);
  const optionUncheckedState = useAppSelector(s => selectOptionState(s.customizer, toggleOptionUnchecked.modifierTypeId, toggleOptionUnchecked.id));
  const optionCheckedState = useAppSelector(s => selectOptionState(s.customizer, toggleOptionChecked.modifierTypeId, toggleOptionChecked.id));
  const optionValue = useMemo(() => optionCheckedState?.placement === OptionPlacement.WHOLE, [optionCheckedState?.placement]);
  if (!optionUncheckedState || !optionCheckedState || !serviceDateTime || !selectedProduct || !fulfillmentId) {
    return null;
  }
  const toggleOption = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    dispatch(updateCustomizerProduct(UpdateModifierOptionStateToggleOrRadio(
      toggleOptionChecked.modifierTypeId,
      e.target.checked ? toggleOptionChecked.id : toggleOptionUnchecked.id,
      selectedProduct,
      catalogSelectors,
      serviceDateTime,
      fulfillmentId)));
  }
  return (
    <ModifierOptionTooltip
      product={selectedProduct.p}
      option={optionValue ? toggleOptionUnchecked : toggleOptionChecked}
      enableState={optionValue ? optionUncheckedState.enable_whole : optionUncheckedState.enable_whole}
    >
      <CustomizerFormControlLabel
        control={<Checkbox
          checkedIcon={<Circle />}
          icon={<CircleOutlined />}
          disableRipple
          disableFocusRipple
          disableTouchRipple
          disabled={(optionValue ? optionUncheckedState.enable_whole : optionUncheckedState.enable_whole).enable !== DISABLE_REASON.ENABLED}
          value={optionValue}
          onChange={toggleOption} />}
        label={toggleOptionChecked.displayName} />
    </ModifierOptionTooltip>
  );
}

interface IModifierRadioCustomizerComponent {
  options: IOption[];
}

export function WModifierRadioComponent({ options }: IModifierRadioCustomizerComponent) {
  const dispatch = useAppDispatch();
  const selectedProduct = useAppSelector(s => s.customizer.selectedProduct);
  const catalogSelectors = useAppSelector(s => SelectCatalogSelectors(s.ws));
  const fulfillmentId = useAppSelector(s => s.fulfillment.selectedService);
  const serviceDateTime = useAppSelector(s => SelectServiceDateTime(s.fulfillment));
  const getOptionState = useAppSelector(s => (moId: string) => selectOptionState(s.customizer, options[0].modifierTypeId, moId));
  const modifierOptionState = useAppSelector(s => s.customizer.selectedProduct?.p.modifiers.find(x => x.modifierTypeId === options[0].modifierTypeId)?.options ?? [])
  if (!serviceDateTime || !selectedProduct || !fulfillmentId) {
    return null;
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    dispatch(updateCustomizerProduct(UpdateModifierOptionStateToggleOrRadio(
      options[0].modifierTypeId, e.target.value, selectedProduct, catalogSelectors, serviceDateTime, fulfillmentId)));
  }
  return (
    <RadioGroup
      sx={{ width: '100%' }}
      onChange={onChange}
      value={modifierOptionState.length === 1 ? modifierOptionState[0].optionId : null}
      aria-labelledby={`modifier_control_${options[0].modifierTypeId}`}>
      <Grid container>
        {options.map((opt, i) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const optionState = getOptionState(opt.id)!;
          return (
            <Grid
              key={i}
              size={{
                xs: 12,
                sm: 6,
                md: 4,
                lg: 3
              }}>
              <ModifierOptionTooltip product={selectedProduct.p} option={opt} enableState={optionState.enable_whole} >
                <CustomizerFormControlLabel
                  value={opt.id}
                  control={<Radio
                    checkedIcon={<Circle />}
                    icon={<CircleOutlined />}
                    disableRipple
                    disableFocusRipple
                    disableTouchRipple
                    disabled={optionState.enable_whole.enable !== DISABLE_REASON.ENABLED}
                  />}
                  label={opt.displayName} />
              </ModifierOptionTooltip>
            </Grid>
          );
        })}
      </Grid>
    </RadioGroup>
  );
}

function useModifierOptionCheckbox(option: IOption) {
  const dispatch = useAppDispatch();
  const optionState = useAppSelector(s => selectOptionState(s.customizer, option.modifierTypeId, option.id));
  const modifierTypeEntry = useAppSelector(s => getModifierTypeEntryById(s.ws.modifierEntries, option.modifierTypeId))
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const isWhole = useMemo(() => optionState!.placement === OptionPlacement.WHOLE, [optionState]);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const isLeft = useMemo(() => optionState!.placement === OptionPlacement.LEFT, [optionState]);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const isRight = useMemo(() => optionState!.placement === OptionPlacement.RIGHT, [optionState]);
  const selectedProduct = useAppSelector(s => s.customizer.selectedProduct);
  const catalogSelectors = useAppSelector(s => SelectCatalogSelectors(s.ws));
  const serviceDateTime = useAppSelector(s => SelectServiceDateTime(s.fulfillment));
  const fulfillmentId = useAppSelector(s => s.fulfillment.selectedService);

  const onUpdateOption = (newState: IOptionState) => {
    if (selectedProduct && serviceDateTime && fulfillmentId) {
      dispatch(updateCustomizerProduct(UpdateModifierOptionStateCheckbox(modifierTypeEntry, option, newState, selectedProduct, catalogSelectors, serviceDateTime, fulfillmentId)));
    }
  };
  const onClickWhole = () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    onUpdateOption({ placement: +!isWhole * OptionPlacement.WHOLE, qualifier: optionState!.qualifier });
  }
  const onClickLeft = () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    onUpdateOption({ placement: +!isLeft * OptionPlacement.LEFT, qualifier: optionState!.qualifier });
  }
  const onClickRight = () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    onUpdateOption({ placement: +!isRight * OptionPlacement.RIGHT, qualifier: optionState!.qualifier });
  }
  return {
    onClickWhole,
    onClickLeft,
    onClickRight,
    onUpdateOption,
    isWhole,
    isLeft,
    isRight,
    optionState
  }
}

interface IModifierOptionCheckboxCustomizerComponent {
  option: IOption;
}

function WModifierOptionCheckboxComponent({ option }: IModifierOptionCheckboxCustomizerComponent) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const selectedProduct = useAppSelector(s => s.customizer.selectedProduct!);
  const dispatch = useAppDispatch();
  const { onClickWhole, onClickLeft, onClickRight,
    isWhole, isLeft, isRight,
    optionState } = useModifierOptionCheckbox(option);
  const canShowAdvanced = useAppSelector(s => selectShowAdvanced(s.customizer));
  const showAdvanced = useMemo(() => optionState !== undefined && canShowAdvanced && (optionState.enable_left.enable === DISABLE_REASON.ENABLED || optionState.enable_right.enable === DISABLE_REASON.ENABLED), [canShowAdvanced, optionState]);
  const advancedOptionSelected = useMemo(() => optionState !== undefined && (optionState.placement === OptionPlacement.LEFT || optionState.placement === OptionPlacement.RIGHT || optionState.qualifier !== OptionQualifier.REGULAR), [optionState]);
  if (optionState === undefined) {
    return null;
  }
  const onClickAdvanced = () => {
    dispatch(setAdvancedModifierOption([option.modifierTypeId, option.id]));
  }

  return (
    <Grid
      size={{
        xs: 12,
        sm: 6,
        md: 4,
        lg: 3
      }}>
      <ModifierOptionTooltip option={option} enableState={optionState.enable_whole} product={selectedProduct.p} >
        <CustomizerFormControlLabel
          disabled={optionState.enable_whole.enable !== DISABLE_REASON.ENABLED}
          control={
            <span>
              {!advancedOptionSelected &&
                <Checkbox
                  checkedIcon={<Circle />}
                  icon={<CircleOutlined />}
                  disableRipple
                  disableFocusRipple
                  disableTouchRipple
                  disabled={optionState.enable_whole.enable !== DISABLE_REASON.ENABLED}
                  checked={isWhole}
                  onClick={() => { onClickWhole(); }} />}
              {(isLeft || (optionState.enable_whole.enable !== DISABLE_REASON.ENABLED && optionState.enable_left.enable === DISABLE_REASON.ENABLED)) &&
                <Checkbox
                  disableRipple
                  disableFocusRipple
                  disableTouchRipple
                  disabled={optionState.enable_left.enable !== DISABLE_REASON.ENABLED}
                  checked={isLeft}
                  onClick={() => { onClickLeft(); }} />}
              {(isRight || (optionState.enable_whole.enable !== DISABLE_REASON.ENABLED && optionState.enable_right.enable === DISABLE_REASON.ENABLED)) &&
                <Checkbox
                  disableRipple
                  disableFocusRipple
                  disableTouchRipple
                  disabled={optionState.enable_right.enable !== DISABLE_REASON.ENABLED}
                  checked={isRight}
                  onClick={() => { onClickRight(); }} />}
            </span>}
          // onClick={() => {
          //   console.log(optionState)

          // }}
          label={option.displayName} />
        {showAdvanced ? <IconButton onClick={onClickAdvanced} name={`${option.id}_advanced`} aria-label={`${option.id}_advanced`} size="small">
          <SettingsTwoTone fontSize="inherit" />
        </IconButton> : null}
      </ModifierOptionTooltip>
    </Grid>
  );
}


interface IModifierTypeCustomizerComponent {
  mtid: string;
  product: WCPProduct;
}

const SelectVisibleModifierOptions = createSelector(
  (s: RootState, productId: string, modifiers: ProductModifierEntry[], _mtId: string) => SelectProductMetadataFromCustomProductWithCurrentFulfillmentData(s, productId, modifiers),
  (s: RootState, _productId: string, _modifiers: ProductModifierEntry[], mtId: string) => getModifierTypeEntryById(s.ws.modifierEntries, mtId),
  (s: RootState, _productId: string, _modifiers: ProductModifierEntry[], _mtId: string) => SelectCatalogSelectors(s.ws).option,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  (s: RootState, _productId: string, _modifiers: ProductModifierEntry[], _mtId: string) => SelectServiceDateTime(s.fulfillment)!,

  (metadata, modifierType, modifierOptionSelector, serviceDateTime) => {

    return SortAndFilterModifierOptions(metadata, modifierType, modifierOptionSelector as Selector<IOption>, serviceDateTime);
  }
);


export function WModifierTypeCustomizerComponent({ mtid, product, ...other }: IModifierTypeCustomizerComponent & Omit<FormControlProps, 'children'>) {
  const baseProductInstance = useAppSelector(s => SelectBaseProductByProductId(s.ws, product.productId));
  const visibleOptions = useAppSelector(s => SelectVisibleModifierOptions(s, product.productId, product.modifiers, mtid));
  const modifierType = useAppSelector(s => getModifierTypeEntryById(s.ws.modifierEntries, mtid).modifierType);
  const modifierTypeName = useAppSelector(s => SelectModifierTypeNameFromModifierTypeId(s.ws.modifierEntries, mtid));
  const modifierOptionsHtml = useMemo(() => {
    if (modifierType.max_selected === 1) {
      if (modifierType.min_selected === 1) {
        if (modifierType.displayFlags.use_toggle_if_only_two_options && visibleOptions.length === 2) {
          // if we've found the modifier assigned to the base product, and the modifier option assigned to the base product is visible 
          const mtidx = baseProductInstance.modifiers.findIndex(x => x.modifierTypeId === mtid);
          if (mtidx !== -1 && baseProductInstance.modifiers[mtidx].options.length === 1) {
            const baseOptionIndex = visibleOptions.findIndex(x => x.id === baseProductInstance.modifiers[mtidx].options[0].optionId);
            if (baseOptionIndex !== -1) {
              // we togglin'!
              // since there are only two visible options, the base option is either at index 1 or 0
              return (
                <WModifierOptionToggle toggleOptionChecked={visibleOptions[baseOptionIndex === 0 ? 1 : 0]} toggleOptionUnchecked={visibleOptions[baseOptionIndex]} />
              );
            }
          }
          // the base product's option ${base_moid} isn't visible. switching to RADIO modifier display for ${this.mtid}`);
        }

        // return MODIFIER_DISPLAY.RADIO;
        return <WModifierRadioComponent options={visibleOptions} />;
      }
    }
    return <FormGroup row aria-labelledby={`modifier_control_${mtid}`}>{
      visibleOptions.map((option, i: number) =>
        <WModifierOptionCheckboxComponent key={i} option={option} />
      )}</FormGroup>
  }, [modifierType, mtid, baseProductInstance.modifiers, visibleOptions]);
  return (
    <FormControl fullWidth {...other}>
      <FormLabel id={`modifier_control_${mtid}`}>
        {modifierTypeName}:
      </FormLabel>
      {modifierOptionsHtml}
    </FormControl>);
}
interface IOptionDetailModal {
  mtid_moid: MTID_MOID;
}
function WOptionDetailModal({ mtid_moid }: IOptionDetailModal) {
  const dispatch = useAppDispatch();
  const option = useAppSelector(s => getModifierOptionById(s.ws.modifierOptions, mtid_moid[1]));
  const { onClickWhole, onClickLeft, onClickRight, onUpdateOption,
    isWhole, isLeft, isRight,
    optionState } = useModifierOptionCheckbox(option);
  const intitialOptionState = useAppSelector(s => s.customizer.advancedModifierInitialState);

  const onConfirmCallback = () => {
    dispatch(setAdvancedModifierOption(null));
  }
  const onCancelCallback = () => {
    // set the modifier option state to what it was before we opened this modal
    onUpdateOption(intitialOptionState);
    onConfirmCallback();
  };

  return (
    <DialogContainer
      title={`${option.displayName} options`}
      onClose={onCancelCallback} // TODO: handle the clicking outside the container but we've made changes in the modal case
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      open={option !== null}
      innerComponent={
        <Grid container spacing={3} justifyContent="center">
          <Grid size={12}>Placement:</Grid>
          <Grid>
            <FormControlLabel
              control={
                <Checkbox
                  disabled={!optionState?.enable_left}
                  checked={isLeft}
                  onChange={() => { onClickLeft(); }} />
              }
              label={null}
            />
          </Grid>
          <Grid>
            <FormControlLabel
              control={
                <Checkbox
                  disabled={!optionState?.enable_whole}
                  checked={isWhole}
                  onChange={() => { onClickWhole(); }} />
              }
              label={null}
            />
          </Grid>
          <Grid>
            <FormControlLabel
              control={
                <Checkbox
                  disabled={!optionState?.enable_right}
                  checked={isRight}
                  onChange={() => { onClickRight(); }} />
              }
              label={null}
            />
          </Grid>
          <Grid container justifyContent="flex-end" size={12}>
            <Grid>
              <Button onClick={onCancelCallback}>
                Cancel
              </Button>
            </Grid>
            <Grid>
              <Button
                onClick={onConfirmCallback}>
                Confirm
              </Button>
            </Grid>
          </Grid>
        </Grid>
      }
    />
  );
}

const CustomizerSelectOrderedModifiersVisibleForCustomProduct = createSelector(
  (s: RootState) => s.customizer.selectedProduct !== null ? SelectProductMetadataFromCustomProductWithCurrentFulfillmentData(s, s.customizer.selectedProduct.p.productId, s.customizer.selectedProduct.p.modifiers) : null,
  (s: RootState) => s.customizer.selectedProduct !== null ? getProductEntryById(s.ws.products, s.customizer.selectedProduct.p.productId) : null,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  (s: RootState) => s.fulfillment.selectedService!,
  (s: RootState) => (modifierTypeId: string, hasSelectable: boolean) => SelectShouldFilterModifierTypeDisplay(s, modifierTypeId, hasSelectable),
  (s: RootState) => (modifierTypeId: string) => getModifierTypeEntryById(s.ws.modifierEntries, modifierTypeId).modifierType.ordinal,
  (metadata, productEntry, fulfillmentId, shouldFilter, getOrdinal) => productEntry && metadata ?
    // TODO: do we need/want to check the product modifier definition enable function?
    productEntry.product.modifiers
      .filter(x => x.serviceDisable.indexOf(fulfillmentId) === -1)
      .filter(x => shouldFilter(x.mtid, metadata.modifier_map[x.mtid].has_selectable))
      .sort((a, b) => getOrdinal(a.mtid) - getOrdinal(b.mtid)) : []
);

const SelectProductMetadataFromCustomSelectedProductWithCurrentFulfillmentData = (s: RootState) => s.customizer.selectedProduct ? SelectProductMetadataFromCustomProductWithCurrentFulfillmentData(s, s.customizer.selectedProduct.p.productId, s.customizer.selectedProduct.p.modifiers) : null;

interface IProductCustomizerComponentProps {
  suppressGuide?: boolean;
  scrollToWhenDone: string;
}
export const WProductCustomizerComponent = forwardRef<HTMLDivElement, IProductCustomizerComponentProps>(({ suppressGuide, scrollToWhenDone }, ref) => {
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useAppDispatch();
  const catalog = useAppSelector(s => SelectCatalogSelectors(s.ws));
  const categoryId = useAppSelector(s => s.customizer.categoryId);
  const selectedProduct = useAppSelector(s => selectSelectedWProduct(s.customizer));
  const selectedProductMetadata = useAppSelector(SelectProductMetadataFromCustomSelectedProductWithCurrentFulfillmentData)
  const customizerTitle = useAppSelector(s => {
    const selectedIProduct = selectIProductOfSelectedProduct(s);
    return selectedIProduct?.displayFlags.singular_noun ? `your ${selectedIProduct.displayFlags.singular_noun}` : "it";
  });
  const filteredModifiers = useAppSelector(CustomizerSelectOrderedModifiersVisibleForCustomProduct);
  const cartEntry = useAppSelector(selectCartEntryBeingCustomized);
  const allowAdvancedOptionPrompt = useAppSelector(s => selectAllowAdvancedPrompt(s));
  const cart = useAppSelector(s => getCart(s.cart.cart));
  const showAdvanced = useAppSelector(s => selectShowAdvanced(s.customizer));
  const mtid_moid = useAppSelector(s => s.customizer.advancedModifierOption);
  const hasAdvancedOptionSelected = useMemo(() => selectedProductMetadata?.advanced_option_selected ?? false, [selectedProductMetadata?.advanced_option_selected]);
  if (categoryId === null || selectedProduct === null || selectedProductMetadata === null) {
    return null;
  }
  const toggleAllowAdvancedOption = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setShowAdvanced(e.target.checked));
  }
  const unselectProduct = () => {
    scrollToIdOffsetAfterDelay(scrollToWhenDone, 200);
    if (cartEntry) {
      dispatch(unlockCartEntry(cartEntry.id));
    }
    dispatch(clearCustomizer());
  }
  const confirmCustomization = () => {
    const matchingCartEntry = FindDuplicateInCart(cart, catalog.modifierEntry, catalog.productEntry, categoryId, selectedProduct.p, cartEntry?.id);
    if (matchingCartEntry) {
      const amountToAdd = cartEntry?.quantity ?? 1;
      const newQuantity = matchingCartEntry.quantity + amountToAdd;
      dispatch(updateCartQuantity({ id: matchingCartEntry.id, newQuantity }));
      if (cartEntry) {
        dispatch(removeFromCart(cartEntry.id));
        enqueueSnackbar(`Merged duplicate ${selectedProductMetadata.name} in your order.`, { variant: 'success', autoHideDuration: 3000 });
      }
      else {
        enqueueSnackbar(`Updated quantity of ${selectedProductMetadata.name} to ${newQuantity.toString()}`, { variant: 'success', autoHideDuration: 3000 });
      }
    }
    else {
      // cartEntry being undefined means it's an addition 
      if (cartEntry === undefined) {
        dispatch(setTimeToFirstProductIfUnset(Date.now()));
        dispatch(addToCart({ categoryId, product: selectedProduct }))
        enqueueSnackbar(`Added ${selectedProductMetadata.name} to your order.`, { variant: 'success', autoHideDuration: 3000, disableWindowBlurListener: true });
      }
      else {
        dispatch(updateCartProduct({ id: cartEntry.id, product: selectedProduct }))
        dispatch(unlockCartEntry(cartEntry.id));
        enqueueSnackbar(`Updated ${selectedProductMetadata.name} in your order.`, { variant: 'success', autoHideDuration: 3000, disableWindowBlurListener: true });
      }
    }
    unselectProduct();
  }
  return (
    <div ref={ref}>
      {mtid_moid !== null && <WOptionDetailModal mtid_moid={mtid_moid} />}
      <StageTitle>Customize {customizerTitle}!</StageTitle>
      <Separator sx={{ pb: 3 }} />
      <ProductDisplay productMetadata={selectedProductMetadata} description price displayContext="order" />
      <Separator />
      <Grid container>
        {filteredModifiers.map((productModifier, i) =>
          <Grid container key={i} size={12}><WModifierTypeCustomizerComponent mtid={productModifier.mtid} product={selectedProduct.p} /></Grid>
        )}
      </Grid>
      {suppressGuide === true ? <></> : <OrderGuideMessagesComponent productId={selectedProduct.p.productId} productModifierEntries={selectedProduct.p.modifiers} />}
      <OrderGuideWarningsComponent productId={selectedProduct.p.productId} productModifierEntries={selectedProduct.p.modifiers} />
      <OrderGuideErrorsComponent modifierMap={selectedProductMetadata.modifier_map} />
      {allowAdvancedOptionPrompt ? <FormControlLabel
        control={<Checkbox disabled={hasAdvancedOptionSelected} value={showAdvanced} onChange={toggleAllowAdvancedOption} />}
        label="I really, really want to do some advanced customization of my pizza. I absolutely know what I'm doing and won't complain if I later find out I didn't know what I was doing." /> : ""}
      <Grid container sx={{ py: 3, flexDirection: 'row-reverse' }} size={12}>
        <Grid sx={{ display: "flex", width: "200px", justifyContent: "flex-end" }}>
          {/* We don't need to check for orderGuideErrors.length > 0 as selectedProduct.m.incomplete is the same check */}
          {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
          <WarioButton disabled={!selectedProduct || selectedProductMetadata.incomplete}
            onClick={confirmCustomization}>
            {cartEntry === undefined ? "Add to order" : "Save changes"}
          </WarioButton>
        </Grid>
        <Grid sx={{ display: "flex", justifyContent: "flex-end" }} size={4}>
          <WarioButton onClick={unselectProduct}>
            Cancel
          </WarioButton>
        </Grid>

        <Grid sx={{ display: 'flex' }} size="grow" />
      </Grid>
    </div>
  );
})