import {
  type ICatalogSelectors,
  type IOption,
  type IOptionState,
  type IOptionType,
  OptionPlacement,
  OptionQualifier,
  SortByOrderingArray,
  SortProductModifierEntries,
  WCPProductGenerateMetadata,
  type WProduct,
} from '@wcp/wario-shared';

export const UpdateModifierOptionStateToggleOrRadio = (
  mtId: string,
  moId: string,
  selectedProduct: WProduct,
  catalogSelectors: ICatalogSelectors,
  serviceTime: number | Date,
  fulfillmentId: string,
) => {
  const newModifierOptions = [{ placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR, optionId: moId }];
  const modifierEntryIndex = selectedProduct.p.modifiers.findIndex((x) => x.modifierTypeId === mtId);
  const newProductModifiers = structuredClone(selectedProduct.p.modifiers);
  if (modifierEntryIndex === -1) {
    newProductModifiers.push({ modifierTypeId: mtId, options: newModifierOptions });
    SortProductModifierEntries(newProductModifiers, catalogSelectors.modifierEntry);
  } else {
    newProductModifiers[modifierEntryIndex].options = newModifierOptions;
  }
  // regenerate metadata and return new product object
  return {
    m: WCPProductGenerateMetadata(
      selectedProduct.p.productId,
      newProductModifiers,
      catalogSelectors,
      serviceTime,
      fulfillmentId,
    ),
    p: { productId: selectedProduct.p.productId, modifiers: newProductModifiers },
  } as WProduct;
};

export const UpdateModifierOptionStateCheckbox = (
  mt: IOptionType,
  mo: IOption,
  optionState: IOptionState,
  selectedProduct: WProduct,
  catalogSelectors: ICatalogSelectors,
  serviceTime: number | Date,
  fulfillmentId: string,
) => {
  const newOptInstance = { ...optionState, optionId: mo.id };
  const modifierEntryIndex = selectedProduct.p.modifiers.findIndex((x) => x.modifierTypeId === mt.id);
  const newProductModifiers = structuredClone(selectedProduct.p.modifiers);
  let newModifierOptions = modifierEntryIndex !== -1 ? newProductModifiers[modifierEntryIndex].options : [];
  if (optionState.placement === OptionPlacement.NONE) {
    newModifierOptions = newModifierOptions.filter((x) => x.optionId !== mo.id);
  } else {
    if (mt.min_selected === 0 && mt.max_selected === 1) {
      // checkbox that requires we unselect any other values since it kinda functions like a radio
      newModifierOptions = [];
    }
    const moIdX = newModifierOptions.findIndex((x) => x.optionId === mo.id);
    if (moIdX === -1) {
      newModifierOptions.push(newOptInstance);
      newModifierOptions = SortByOrderingArray(newModifierOptions, mt.options, (x) => x.optionId);
    } else {
      newModifierOptions[moIdX] = newOptInstance;
    }
  }
  if (modifierEntryIndex === -1 && newModifierOptions.length > 0) {
    newProductModifiers.push({ modifierTypeId: mt.id, options: newModifierOptions });
    SortProductModifierEntries(newProductModifiers, catalogSelectors.modifierEntry);
  } else {
    if (newModifierOptions.length > 0) {
      newProductModifiers[modifierEntryIndex].options = newModifierOptions;
    } else {
      newProductModifiers.splice(modifierEntryIndex, 1);
    }
  }
  // regenerate metadata required after this call. handled by ListeningMiddleware
  return {
    m: WCPProductGenerateMetadata(
      selectedProduct.p.productId,
      newProductModifiers,
      catalogSelectors,
      serviceTime,
      fulfillmentId,
    ),
    p: { productId: selectedProduct.p.productId, modifiers: newProductModifiers },
  } as WProduct;
};
