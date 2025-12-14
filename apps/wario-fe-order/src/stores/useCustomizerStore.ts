import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { OptionPlacement, OptionQualifier } from '@wcp/wario-shared/logic';
import type { CartEntry, IOptionState, MetadataModifierMap, MTID_MOID, WProduct } from '@wcp/wario-shared/types';

export interface CustomizerState {
  /** Whether advanced options are allowed for current product */
  allowAdvanced: boolean;
  /** Whether to show advanced options UI */
  showAdvanced: boolean;
  /** Cart entry ID if editing existing cart item */
  cartId: string | null;
  /** Category ID for the product being customized */
  categoryId: string | null;
  /** The product being customized */
  selectedProduct: WProduct | null;
  /** Currently selected advanced modifier option [modifierTypeId, optionId] */
  advancedModifierOption: MTID_MOID | null;
  /** Initial state of the advanced modifier option before editing */
  advancedModifierInitialState: IOptionState;
}

interface CustomizerActions {
  editCartEntry: (entry: CartEntry) => void;
  customizeProduct: (product: WProduct, categoryId: string) => void;
  setShowAdvanced: (show: boolean) => void;
  setAdvancedModifierOption: (option: MTID_MOID | null) => void;
  clearCustomizer: () => void;
  updateCustomizerProduct: (product: WProduct) => void;
}

export type CustomizerStore = CustomizerState & CustomizerActions;

const defaultOptionState: IOptionState = {
  placement: OptionPlacement.NONE,
  qualifier: OptionQualifier.REGULAR,
};

const initialState: CustomizerState = {
  allowAdvanced: false,
  showAdvanced: false,
  cartId: null,
  categoryId: null,
  selectedProduct: null,
  advancedModifierOption: null,
  advancedModifierInitialState: defaultOptionState,
};

export const useCustomizerStore = create<CustomizerStore>()(
  devtools(
    (set) => ({
      // State
      ...initialState,

      // Actions
      editCartEntry: (entry) => {
        set(
          {
            allowAdvanced: entry.product.m.advanced_option_eligible,
            showAdvanced: entry.product.m.advanced_option_selected,
            cartId: entry.id,
            categoryId: entry.categoryId,
            selectedProduct: structuredClone(entry.product),
            advancedModifierOption: null,
            advancedModifierInitialState: defaultOptionState,
          },
          false,
          'editCartEntry',
        );
      },

      customizeProduct: (product, categoryId) => {
        set(
          {
            allowAdvanced: product.m.advanced_option_eligible,
            showAdvanced: product.m.advanced_option_selected,
            cartId: null,
            categoryId,
            selectedProduct: structuredClone(product),
            advancedModifierOption: null,
            advancedModifierInitialState: defaultOptionState,
          },
          false,
          'customizeProduct',
        );
      },

      setShowAdvanced: (show) => {
        set(
          (state) => ({
            showAdvanced: state.allowAdvanced && show,
          }),
          false,
          'setShowAdvanced',
        );
      },

      setAdvancedModifierOption: (option) => {
        set(
          (state) => {
            if (
              state.selectedProduct !== null &&
              option !== null &&
              Object.hasOwn(state.selectedProduct.m.modifier_map, option[0]) &&
              Object.hasOwn(state.selectedProduct.m.modifier_map[option[0]].options, option[1])
            ) {
              return {
                advancedModifierOption: option,
                advancedModifierInitialState: state.selectedProduct.m.modifier_map[option[0]].options[option[1]],
              };
            }
            return {
              advancedModifierOption: option,
              advancedModifierInitialState: defaultOptionState,
            };
          },
          false,
          'setAdvancedModifierOption',
        );
      },

      clearCustomizer: () => {
        set(initialState, false, 'clearCustomizer');
      },

      updateCustomizerProduct: (product) => {
        set(
          (state) => {
            if (state.selectedProduct) {
              return { selectedProduct: product };
            }
            return {};
          },
          false,
          'updateCustomizerProduct',
        );
      },
    }),
    { name: 'customizer-store' },
  ),
);

// Selectors
export const selectShowAdvanced = (state: CustomizerStore) => state.showAdvanced;
export const selectSelectedWProduct = (state: CustomizerStore) => state.selectedProduct;
export const selectCartId = (state: CustomizerStore) => state.cartId;
export const selectCategoryId = (state: CustomizerStore) => state.categoryId;

export const selectOptionState = (modifierMap: MetadataModifierMap, mtId: string, moId: string) => {
  if (Object.hasOwn(modifierMap, mtId)) {
    return modifierMap[mtId].options[moId];
  }
  return undefined;
};
