import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CartEntry, WProduct, IOptionState, MTID_MOID, OptionPlacement, OptionQualifier } from "@wcp/wcpshared";
import { cloneDeep } from 'lodash';


// TODO: move product modification into a shared library so backend and FE can use it.

export interface WCustomizerState {
  // allow the prompt to enable advanced options to appear (basically, this should be a memoized check on if there could be any advanced options)
  // which means it should probably just be a selector on selectedProduct?.m.advanced_option_eligible ?? false;
  // anyway... todo remove this flag
  allowAdvanced: boolean;
  // the advanced option opt in state
  showAdvanced: boolean;
  cartId: string | null;
  categoryId: string | null;
  // NOTE: the selected product is allocated to either be edited or added directly to a cart entry
  selectedProduct: WProduct | null;
  advancedModifierOption: MTID_MOID | null;
  advancedModifierInitialState: IOptionState;
};

const initialState: WCustomizerState = {
  allowAdvanced: false,
  showAdvanced: false,
  cartId: null,
  categoryId: null,
  selectedProduct: null,
  advancedModifierOption: null,
  advancedModifierInitialState: { placement: OptionPlacement.NONE, qualifier: OptionQualifier.REGULAR }
};

export const WCustomizerSlice = createSlice({
  name: 'customizer',
  initialState,
  reducers: {
    editCartEntry(state, action: PayloadAction<CartEntry>) {
      state.allowAdvanced = action.payload.product.m.advanced_option_eligible;
      state.showAdvanced = action.payload.product.m.advanced_option_selected;
      state.cartId = action.payload.id;
      state.categoryId = action.payload.categoryId;
      state.selectedProduct = cloneDeep(action.payload.product);
    },
    customizeProduct(state, action: PayloadAction<{ product: WProduct, categoryId: string }>) {
      state.allowAdvanced = action.payload.product.m.advanced_option_eligible;
      state.showAdvanced = action.payload.product.m.advanced_option_selected;
      state.categoryId = action.payload.categoryId;
      state.selectedProduct = cloneDeep(action.payload.product);
    },
    setShowAdvanced(state, action: PayloadAction<boolean>) {
      state.showAdvanced = state.allowAdvanced && action.payload;
    },
    setAdvancedModifierOption(state, action: PayloadAction<MTID_MOID | null>) {
      if (state.selectedProduct !== null &&
        action.payload !== null &&
        Object.hasOwn(state.selectedProduct.m.modifier_map, action.payload[0]) &&
        Object.hasOwn(state.selectedProduct.m.modifier_map[action.payload[0]].options, action.payload[1])) {
        state.advancedModifierInitialState = state.selectedProduct.m.modifier_map[action.payload[0]].options[action.payload[1]];
      }
      else {
        state.advancedModifierInitialState = initialState.advancedModifierInitialState;
      }
      state.advancedModifierOption = action.payload;
    },
    clearCustomizer(state) {
      // todo: see if this can just be a shallow copy
      Object.assign(state, initialState);
    },
    updateCustomizerProduct(state, action: PayloadAction<WProduct>) {
      if (state.selectedProduct) {
        state.selectedProduct = action.payload;
      }
    },
  }
});

export const { editCartEntry, customizeProduct, setShowAdvanced, clearCustomizer, setAdvancedModifierOption, updateCustomizerProduct } = WCustomizerSlice.actions;

export default WCustomizerSlice.reducer;
