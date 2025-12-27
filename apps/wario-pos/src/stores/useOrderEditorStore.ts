import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { CoreCartEntry, WProduct } from '@wcp/wario-shared/types';

// =============================================================================
// Types
// =============================================================================

/**
 * The order editor works with WProduct (full metadata) for the local editable state,
 * since we need the metadata for display and customization.
 * When saving (future API implementation), we'll convert back to WCPProductV2 format.
 */
export interface OrderEditorCartEntry {
  /** Unique ID for this cart entry */
  id: string;
  /** Category ID */
  categoryId: string;
  /** Quantity */
  quantity: number;
  /** Full product with metadata */
  product: WProduct;
}

export interface OrderEditorState {
  /** Order ID being edited */
  orderId: string | null;
  /** Local copy of order cart (editable, with full WProduct metadata) */
  orderCart: OrderEditorCartEntry[];
  /** Product being customized in modal (null = modal closed) */
  editingProduct: WProduct | null;
  /** Index in orderCart if editing existing, null if adding new */
  editingIndex: number | null;
  /** Category ID for new product additions */
  editingCategoryId: string | null;
  /** Track if cart has been modified */
  isDirty: boolean;
}

interface OrderEditorActions {
  /** Initialize editor with order's rebuilt cart data (already has WProduct) */
  initializeFromRebuiltCart: (orderId: string, cart: CoreCartEntry<WProduct>[]) => void;
  /** Add or update product (finish customization) */
  commitProduct: (product: WProduct, categoryId: string) => void;
  /** Remove item at index */
  removeItem: (index: number) => void;
  /** Update quantity for item at index */
  updateQuantity: (index: number, quantity: number) => void;
  /** Open edit modal for existing item */
  editItem: (index: number) => void;
  /** Start adding new product (opens modal if needs customization) */
  startAddProduct: (product: WProduct, categoryId: string) => void;
  /** Close modal without saving */
  cancelEditing: () => void;
  /** Update the product being edited (for modifier changes) */
  updateEditingProduct: (product: WProduct) => void;
  /** Add product directly without opening modal */
  addProductDirect: (product: WProduct, categoryId: string) => void;
  /** Clear editor state (when closing edit-contents mode) */
  clearEditor: () => void;
}

export type OrderEditorStore = OrderEditorState & OrderEditorActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: OrderEditorState = {
  orderId: null,
  orderCart: [],
  editingProduct: null,
  editingIndex: null,
  editingCategoryId: null,
  isDirty: false,
};

// =============================================================================
// Store
// =============================================================================

export const useOrderEditorStore = create<OrderEditorStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      initializeFromRebuiltCart: (orderId, cart) => {
        // Convert CoreCartEntry<WProduct> to our internal format with IDs
        const cartEntries: OrderEditorCartEntry[] = cart.map((item, index) => ({
          id: `order-item-${index.toString()}-${Date.now().toString()}`,
          categoryId: item.categoryId,
          quantity: item.quantity,
          product: item.product,
        }));

        set(
          {
            orderId,
            orderCart: cartEntries,
            editingProduct: null,
            editingIndex: null,
            editingCategoryId: null,
            isDirty: false,
          },
          false,
          'initializeFromRebuiltCart',
        );
      },

      commitProduct: (product, categoryId) => {
        const { editingIndex, orderCart } = get();
        const newCart = [...orderCart];

        if (editingIndex !== null) {
          // Updating existing item
          newCart[editingIndex] = {
            ...newCart[editingIndex],
            product,
            categoryId,
          };
        } else {
          // Adding new item
          newCart.push({
            id: `order-item-new-${Date.now().toString()}`,
            categoryId,
            quantity: 1,
            product,
          });
        }

        set(
          {
            orderCart: newCart,
            editingProduct: null,
            editingIndex: null,
            editingCategoryId: null,
            isDirty: true,
          },
          false,
          'commitProduct',
        );
      },

      removeItem: (index) => {
        const { orderCart } = get();
        const newCart = orderCart.filter((_, i) => i !== index);
        set({ orderCart: newCart, isDirty: true }, false, 'removeItem');
      },

      updateQuantity: (index, quantity) => {
        const { orderCart } = get();
        if (quantity < 1) return; // Minimum 1

        const newCart = [...orderCart];
        newCart[index] = { ...newCart[index], quantity };
        set({ orderCart: newCart, isDirty: true }, false, 'updateQuantity');
      },

      editItem: (index) => {
        const { orderCart } = get();
        const item = orderCart[index] as OrderEditorCartEntry | undefined;
        if (item === undefined) return;

        set(
          {
            editingProduct: structuredClone(item.product),
            editingIndex: index,
            editingCategoryId: item.categoryId,
          },
          false,
          'editItem',
        );
      },

      startAddProduct: (product, categoryId) => {
        set(
          {
            editingProduct: structuredClone(product),
            editingIndex: null,
            editingCategoryId: categoryId,
          },
          false,
          'startAddProduct',
        );
      },

      cancelEditing: () => {
        set(
          {
            editingProduct: null,
            editingIndex: null,
            editingCategoryId: null,
          },
          false,
          'cancelEditing',
        );
      },

      updateEditingProduct: (product) => {
        set({ editingProduct: product }, false, 'updateEditingProduct');
      },

      addProductDirect: (product, categoryId) => {
        const { orderCart } = get();
        const newCart = [
          ...orderCart,
          {
            id: `order-item-new-${Date.now().toString()}`,
            categoryId,
            quantity: 1,
            product,
          },
        ];
        set({ orderCart: newCart, isDirty: true }, false, 'addProductDirect');
      },

      clearEditor: () => {
        set(initialState, false, 'clearEditor');
      },
    }),
    { name: 'order-editor-store' },
  ),
);

// =============================================================================
// Selectors
// =============================================================================

export const selectOrderCart = (state: OrderEditorStore) => state.orderCart;
export const selectEditingProduct = (state: OrderEditorStore) => state.editingProduct;
export const selectEditingIndex = (state: OrderEditorStore) => state.editingIndex;
export const selectEditingCategoryId = (state: OrderEditorStore) => state.editingCategoryId;
export const selectIsDirty = (state: OrderEditorStore) => state.isDirty;
export const selectIsModalOpen = (state: OrderEditorStore) => state.editingProduct !== null;
