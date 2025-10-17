import { createSlice, type PayloadAction, createEntityAdapter, type EntityState } from "@reduxjs/toolkit";
import { type CartEntry, type CatalogModifierEntry, type CatalogProductEntry, type Selector, type WCPProduct, type WProduct, WProductCompare, WProductEquals } from "@wcp/wario-shared";


const DeadCartAdapter = createEntityAdapter<CartEntry>();

const WCartAdapter = createEntityAdapter<CartEntry>();

export interface WCartState {
  indexCounter: number;
  cart: EntityState<CartEntry, string>,
  deadCart: EntityState<CartEntry, string>
}

const initialState: WCartState = {
  indexCounter: 1,
  cart: WCartAdapter.getInitialState(),
  deadCart: DeadCartAdapter.getInitialState()
}

const WCartSlice = createSlice({
  name: 'cart',
  initialState: initialState,
  reducers: {
    addToCart(state, action: PayloadAction<{ categoryId: string, product: WProduct }>) {
      // PRECONDITION: we've already checked for duplicates
      const id = Number(state.indexCounter++).toString(10);
      // should not need a deep copy here per customizer working on mutable data, but it might be not how redux works and this needs to be a deep copy
      const newEntry = { categoryId: action.payload.categoryId, product: action.payload.product, id, isLocked: false, quantity: 1 };
      WCartAdapter.addOne(state.cart, newEntry);
    },
    removeFromCart(state, action: PayloadAction<string>) {
      // async dispatch toast.create({message: `Removed ${action.payload.product.m.name} from order.`} );
      WCartAdapter.removeOne(state.cart, action.payload);
    },
    updateCartQuantity(state, action: PayloadAction<{ id: string; newQuantity: number }>) {
      // async dispatch of toast.create({message: `Changed ${pi.processed_name} quantity to ${this.s.cart[cid][i].quantity}.`} );
      WCartAdapter.updateOne(state.cart, { id: action.payload.id, changes: { quantity: action.payload.newQuantity } });
    },
    updateCartProduct(state, action: PayloadAction<{ id: string, product: WProduct }>) {
      // PRECONDITION: we've already checked for duplicates in other products
      WCartAdapter.updateOne(state.cart, { id: action.payload.id, changes: { product: action.payload.product } });
    },
    updateManyCartProducts(state, action: PayloadAction<{ id: string, product: WProduct }[]>) {
      WCartAdapter.updateMany(state.cart, action.payload.map(x => ({ id: x.id, changes: { product: x.product } })));
    },
    lockCartEntry(state, action: PayloadAction<string>) {
      WCartAdapter.updateOne(state.cart, { id: action.payload, changes: { isLocked: true } });
    },
    unlockCartEntry(state, action: PayloadAction<string>) {
      WCartAdapter.updateOne(state.cart, { id: action.payload, changes: { isLocked: false } });
    },
    killAllCartEntries(state, action: PayloadAction<CartEntry[]>) {
      DeadCartAdapter.addMany(state.deadCart, action.payload);
      WCartAdapter.removeMany(state.cart, action.payload.map(x => x.id));
    },
    reviveAllCartEntries(state, action: PayloadAction<CartEntry[]>) {
      DeadCartAdapter.removeMany(state.deadCart, action.payload.map(x => x.id));
      // unlock all entries before adding them
      WCartAdapter.addMany(state.cart, action.payload.map(x => ({ ...x, isLocked: false })));
    }
  }
});

export const {
  addToCart,
  removeFromCart,
  lockCartEntry,
  unlockCartEntry,
  updateCartQuantity,
  updateCartProduct,
  updateManyCartProducts,
  killAllCartEntries,
  reviveAllCartEntries } = WCartSlice.actions;

/**
 * Looks through the cart for a duplicate product 
 * @param cart the entries in the cart
 * @param catalogModifierEntrySelector: Selector<CatalogModifierEntry> modifiers type access
 * @param productEntrySelector: Selector<CatalogProductEntry> modifiers type access
 * @param categoryId categoryId of product to add/update
 * @param product the product we're attempting to add
 * @param skipId the cart entry ID to ignore in a search for a match
 * @returns the CartEntry if a match is found for the product attempting to be added, otherwise null
 */
export const FindDuplicateInCart = (cart: CartEntry[], catalogModifierEntrySelector: Selector<CatalogModifierEntry>, productEntrySelector: Selector<CatalogProductEntry>, categoryId: string, product: WCPProduct, skipId: string | null = null) => {
  for (let i = 0; i < cart.length; ++i) {
    const entry = cart[i];
    if (categoryId === entry.categoryId) {
      if (skipId !== entry.id && WProductEquals(WProductCompare(entry.product.p, product, { modifierEntry: catalogModifierEntrySelector, productEntry: productEntrySelector }))) {
        return entry;
      }
    }
  }
  // it's a new entry!
  return null;
}

export const { selectAll: getCart, selectById: getCartEntry } =
  WCartAdapter.getSelectors();

export const { selectAll: getDeadCart, selectById: getDeadCartEntry } =
  DeadCartAdapter.getSelectors();

export default WCartSlice.reducer;
