import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { CartEntry, CatalogModifierEntry, CatalogProductEntry, CoreCartEntry, Selector, WCPProduct, WCPProductV2Dto, WProduct } from '@wcp/wario-shared';
import { WProductCompare, WProductEquals } from '@wcp/wario-shared';

export interface CartState {
  indexCounter: number;
  cart: CartEntry[];
  deadCart: CartEntry[];
}

interface CartActions {
  addToCart: (categoryId: string, product: WProduct) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, newQuantity: number) => void;
  updateCartProduct: (id: string, product: WProduct) => void;
  updateManyCartProducts: (updates: { id: string; product: WProduct }[]) => void;
  lockCartEntry: (id: string) => void;
  unlockCartEntry: (id: string) => void;
  killAllCartEntries: (entries: CartEntry[]) => void;
  reviveAllCartEntries: (entries: CartEntry[]) => void;
}

export type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>()(
  devtools(
    (set) => ({
      // State
      indexCounter: 1,
      cart: [],
      deadCart: [],

      // Actions
      addToCart: (categoryId, product) => {
        set(
          (state) => {
            const id = state.indexCounter.toString(10);
            const newEntry: CartEntry = {
              categoryId,
              product,
              id,
              isLocked: false,
              quantity: 1,
            };
            return {
              indexCounter: state.indexCounter + 1,
              cart: [...state.cart, newEntry],
            };
          },
          false,
          'addToCart'
        );
      },

      removeFromCart: (id) => {
        set(
          (state) => ({
            cart: state.cart.filter((entry) => entry.id !== id),
          }),
          false,
          'removeFromCart'
        );
      },

      updateCartQuantity: (id, newQuantity) => {
        set(
          (state) => ({
            cart: state.cart.map((entry) =>
              entry.id === id ? { ...entry, quantity: newQuantity } : entry
            ),
          }),
          false,
          'updateCartQuantity'
        );
      },

      updateCartProduct: (id, product) => {
        set(
          (state) => ({
            cart: state.cart.map((entry) =>
              entry.id === id ? { ...entry, product } : entry
            ),
          }),
          false,
          'updateCartProduct'
        );
      },

      updateManyCartProducts: (updates) => {
        set(
          (state) => {
            const updateMap = new Map(updates.map((u) => [u.id, u.product]));
            return {
              cart: state.cart.map((entry) => {
                const updatedProduct = updateMap.get(entry.id);
                return updatedProduct ? { ...entry, product: updatedProduct } : entry;
              }),
            };
          },
          false,
          'updateManyCartProducts'
        );
      },

      lockCartEntry: (id) => {
        set(
          (state) => ({
            cart: state.cart.map((entry) =>
              entry.id === id ? { ...entry, isLocked: true } : entry
            ),
          }),
          false,
          'lockCartEntry'
        );
      },

      unlockCartEntry: (id) => {
        set(
          (state) => ({
            cart: state.cart.map((entry) =>
              entry.id === id ? { ...entry, isLocked: false } : entry
            ),
          }),
          false,
          'unlockCartEntry'
        );
      },

      killAllCartEntries: (entries) => {
        set(
          (state) => {
            const idsToKill = new Set(entries.map((e) => e.id));
            return {
              cart: state.cart.filter((entry) => !idsToKill.has(entry.id)),
              deadCart: [...state.deadCart, ...entries],
            };
          },
          false,
          'killAllCartEntries'
        );
      },

      reviveAllCartEntries: (entries) => {
        set(
          (state) => {
            const idsToRevive = new Set(entries.map((e) => e.id));
            return {
              deadCart: state.deadCart.filter((entry) => !idsToRevive.has(entry.id)),
              cart: [...state.cart, ...entries.map((e) => ({ ...e, isLocked: false }))],
            };
          },
          false,
          'reviveAllCartEntries'
        );
      },
    }),
    { name: 'cart-store' }
  )
);

// Selectors
export const selectCart = (state: CartStore) => state.cart;
export const selectDeadCart = (state: CartStore) => state.deadCart;
export const selectCartEntry = (state: CartStore, id: string) =>
  state.cart.find((entry) => entry.id === id);

/**
 * Looks through the cart for a duplicate product
 * @param cart the entries in the cart
 * @param catalogModifierEntrySelector modifiers type access
 * @param productEntrySelector product entry access
 * @param categoryId categoryId of product to add/update
 * @param product the product we're attempting to add
 * @param skipId the cart entry ID to ignore in a search for a match
 * @returns the CartEntry if a match is found for the product attempting to be added, otherwise null
 */
export const findDuplicateInCart = (
  cart: CartEntry[],
  catalogModifierEntrySelector: Selector<CatalogModifierEntry>,
  productEntrySelector: Selector<CatalogProductEntry>,
  categoryId: string,
  product: WCPProduct,
  skipId: string | null = null
): CartEntry | null => {
  for (const entry of cart) {
    if (categoryId === entry.categoryId) {
      if (
        skipId !== entry.id &&
        WProductEquals(
          WProductCompare(entry.product.p, product, {
            modifierEntry: catalogModifierEntrySelector,
            productEntry: productEntrySelector,
          })
        )
      ) {
        return entry;
      }
    }
  }
  return null;
};

/**
 * Convert cart to DTO format for submission
 */
export const selectCartAsDto = (cart: CartEntry[]): CoreCartEntry<WCPProductV2Dto>[] =>
  cart.map((x) => ({
    ...x,
    product: { modifiers: x.product.p.modifiers, pid: x.product.p.productId },
  }));