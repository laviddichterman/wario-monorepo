import type { IOption, ICatalog, IWSettings, IProductInstance, FulfillmentConfig, CatalogProductEntry, CatalogCategoryEntry, CatalogModifierEntry, ProductModifierEntry, OrderInstanceFunction, IProductInstanceFunction } from "@wcp/wario-shared";
import type { EntityState, PayloadAction } from "@reduxjs/toolkit";

import { GetMenuHideDisplayFlag, IgnoreHideDisplayFlags, GetOrderHideDisplayFlag, FilterProductUsingCatalog, WCPProductGenerateMetadata } from "@wcp/wario-shared";
import { parseISO } from 'date-fns';
import { createSlice, createSelector, createEntityAdapter } from "@reduxjs/toolkit";

import { weakMapCreateSelector, lruMemoizeOptionsWithSize } from "./selectorHelpers";

export const TIMING_POLLING_INTERVAL = 30000;

export interface CurrentTimes {
  loadTime: number;
  currentLocalTime: number;
}

export const ProductInstanceFunctionsAdapter = createEntityAdapter<IProductInstanceFunction>();
export const OrderInstanceFunctionsAdapter = createEntityAdapter<OrderInstanceFunction>();
export const IProductEntriesAdapter = createEntityAdapter<CatalogProductEntry, string>({ selectId: entry => entry.product.id });
export const IProductInstancesAdapter = createEntityAdapter<IProductInstance>();
export const ICategoryEntriesAdapter = createEntityAdapter<CatalogCategoryEntry, string>({ selectId: entry => entry.category.id });
export const ModifierTypeEntriesAdapter = createEntityAdapter<CatalogModifierEntry, string>({ selectId: entry => entry.modifierType.id });
export const ModifierOptionsAdapter = createEntityAdapter<IOption>();
export const FulfillmentsAdapter = createEntityAdapter<FulfillmentConfig>();

export const { selectAll: getProductInstanceFunctions, selectById: getProductInstanceFunctionById, selectIds: getProductInstanceFunctionIds } =
  ProductInstanceFunctionsAdapter.getSelectors();
export const { selectAll: getOrderInstanceFunctions, selectById: getOrderInstanceFunctionById, selectIds: getOrderInstanceFunctionIds } =
  OrderInstanceFunctionsAdapter.getSelectors();
export const { selectAll: getProductEntries, selectById: getProductEntryById, selectIds: getProductEntryIds } =
  IProductEntriesAdapter.getSelectors();
export const { selectAll: getProductInstances, selectById: getProductInstanceById, selectIds: getProductInstanceIds } =
  IProductInstancesAdapter.getSelectors();
export const { selectAll: getCategoryEntries, selectById: getCategoryEntryById, selectIds: getCategoryEntryIds } =
  ICategoryEntriesAdapter.getSelectors();
export const { selectAll: getModifierTypeEntries, selectById: getModifierTypeEntryById, selectIds: getModifierTypeEntryIds } =
  ModifierTypeEntriesAdapter.getSelectors();
export const { selectAll: getModifierOptions, selectById: getModifierOptionById, selectIds: getModifierOptionIds } =
  ModifierOptionsAdapter.getSelectors();
export const { selectAll: getFulfillments, selectById: getFulfillmentById, selectIds: getFulfillmentIds } =
  FulfillmentsAdapter.getSelectors();

export interface SocketIoState {
  pageLoadTime: number;
  pageLoadTimeLocal: number;
  roughTicksSinceLoad: number;
  currentTime: number;
  currentLocalTime: number;
  serverTime: { time: string, tz: string } | null; // ISO formatted string

  catalog: ICatalog | null;
  modifierEntries: EntityState<CatalogModifierEntry, string>;
  modifierOptions: EntityState<IOption, string>;
  products: EntityState<CatalogProductEntry, string>;
  productInstances: EntityState<IProductInstance, string>;
  categories: EntityState<CatalogCategoryEntry, string>;
  productInstanceFunctions: EntityState<IProductInstanceFunction, string>;
  orderInstanceFunctions: EntityState<OrderInstanceFunction, string>;
  fulfillments: EntityState<FulfillmentConfig, string>;
  settings: IWSettings | null;
  status: 'NONE' | 'START' | 'CONNECTED' | 'FAILED';
}

const initialState: SocketIoState = {
  pageLoadTime: 0,
  pageLoadTimeLocal: 0,
  roughTicksSinceLoad: 0,
  currentTime: 0,
  currentLocalTime: 0,

  serverTime: null,
  catalog: null,
  fulfillments: FulfillmentsAdapter.getInitialState(),
  modifierEntries: ModifierTypeEntriesAdapter.getInitialState(),
  modifierOptions: ModifierOptionsAdapter.getInitialState(),
  products: IProductEntriesAdapter.getInitialState(),
  productInstances: IProductInstancesAdapter.getInitialState(),
  categories: ICategoryEntriesAdapter.getInitialState(),
  productInstanceFunctions: ProductInstanceFunctionsAdapter.getInitialState(),
  orderInstanceFunctions: OrderInstanceFunctionsAdapter.getInitialState(),
  settings: null,
  status: "NONE"
}

const SocketIoSlice = createSlice({
  name: 'ws',
  initialState,
  reducers: {
    startConnection(state) {
      state.status = 'START';
    },
    setFailed(state) {
      state.status = 'FAILED';
    },
    setConnected(state) {
      state.status = 'CONNECTED';
    },
    receiveServerTime(state, action: PayloadAction<{ time: string, tz: string }>) {
      if (state.serverTime === null) {
        state.serverTime = action.payload;
        const pageLoadTime = parseISO(action.payload.time).valueOf();
        state.pageLoadTime = pageLoadTime;
        state.currentTime = pageLoadTime;
        const pageLoadTimeLocal = Date.now();
        state.pageLoadTimeLocal = pageLoadTimeLocal;
        state.currentLocalTime = pageLoadTimeLocal;
      }

    },
    receiveCatalog(state, action: PayloadAction<ICatalog>) {
      state.catalog = action.payload;
      ModifierTypeEntriesAdapter.setAll(state.modifierEntries, action.payload.modifiers);
      ModifierOptionsAdapter.setAll(state.modifierOptions, action.payload.options);
      IProductEntriesAdapter.setAll(state.products, action.payload.products);
      IProductInstancesAdapter.setAll(state.productInstances, action.payload.productInstances);
      ICategoryEntriesAdapter.setAll(state.categories, action.payload.categories);
      ProductInstanceFunctionsAdapter.setAll(state.productInstanceFunctions, action.payload.productInstanceFunctions);
      OrderInstanceFunctionsAdapter.setAll(state.orderInstanceFunctions, action.payload.orderInstanceFunctions);
    },
    receiveFulfillments(state, action: PayloadAction<FulfillmentConfig[]>) {
      FulfillmentsAdapter.setAll(state.fulfillments, action.payload);
    },
    receiveSettings(state, action: PayloadAction<IWSettings>) {
      state.settings = action.payload;
    },
    // invoked by middleware
    setCurrentTime(state, action: PayloadAction<{ currentLocalTime: number; ticksElapsed: number; }>) {
      const { currentLocalTime, ticksElapsed } = action.payload;
      const ticksBetweenLocalTimeThisAndPreviousCall = currentLocalTime - state.currentLocalTime;
      const totalTicksBetweenLocalTime = currentLocalTime - state.pageLoadTimeLocal;
      const computedTicksElapsedBetweenCalls = Math.max(ticksElapsed, ticksBetweenLocalTimeThisAndPreviousCall);
      const computedTicksSinceLoad = state.roughTicksSinceLoad + computedTicksElapsedBetweenCalls;
      const ticks = Math.max(computedTicksSinceLoad, totalTicksBetweenLocalTime);
      state.currentLocalTime = currentLocalTime;
      state.currentTime = parseISO(state.serverTime!.time).valueOf() + ticks;
      state.roughTicksSinceLoad = ticks;
      console.log("Current Time: ", state.currentTime);
    },
  }
});

export const SelectCatalogSelectors = createSelector(
  (state: SocketIoState) => state.categories,
  (state: SocketIoState) => state.modifierEntries,
  (state: SocketIoState) => state.modifierOptions,
  (state: SocketIoState) => state.products,
  (state: SocketIoState) => state.productInstances,
  (state: SocketIoState) => state.productInstanceFunctions,
  (state: SocketIoState) => state.orderInstanceFunctions,
  (categories, modifierEntries, modifierOptions, products, productInstances, productInstanceFunctions, orderInstanceFunctions) =>
  ({
    categories: () => getCategoryEntryIds(categories),
    category: (id: string) => getCategoryEntryById(categories, id),
    modifierEntries: () => getModifierTypeEntryIds(modifierEntries),
    modifierEntry: (id: string) => getModifierTypeEntryById(modifierEntries, id),
    options: () => getModifierOptionIds(modifierOptions),
    option: (id: string) => getModifierOptionById(modifierOptions, id),
    productEntries: () => getProductEntryIds(products),
    productEntry: (id: string) => getProductEntryById(products, id),
    productInstances: () => getProductInstanceIds(productInstances),
    productInstance: (id: string) => getProductInstanceById(productInstances, id),
    orderInstanceFunctions: () => getOrderInstanceFunctionIds(orderInstanceFunctions),
    orderInstanceFunction: (id: string) => getOrderInstanceFunctionById(orderInstanceFunctions, id),
    productInstanceFunctions: () => getProductInstanceFunctionIds(productInstanceFunctions),
    productInstanceFunction: (id: string) => getProductInstanceFunctionById(productInstanceFunctions, id)
  })
);

export const { receiveCatalog, receiveFulfillments, receiveServerTime, receiveSettings, setConnected, setCurrentTime, setFailed, startConnection } = SocketIoSlice.actions;
export const SocketIoReducer = SocketIoSlice.reducer;
export const IsSocketDataLoaded = (s: SocketIoState) => s.serverTime !== null && s.fulfillments !== null && s.catalog !== null && s.settings !== null;

export const SelectParentProductEntryFromProductInstanceId = weakMapCreateSelector(
  (s: SocketIoState) => s.products,
  (s: SocketIoState, productInstanceId: string) => getProductInstanceById(s.productInstances, productInstanceId),
  (products, productInstance) =>
    productInstance ? getProductEntryById(products, productInstance.productId) : undefined,
);

export const SelectBaseProductByProductId = weakMapCreateSelector(
  (s: SocketIoState, productClassId: string) => getProductEntryById(s.products, productClassId),
  (s: SocketIoState, _: string) => s.productInstances,
  (productEntry, productInstances) =>
    getProductInstanceById(productInstances, productEntry.product.baseProductId),
);

export const SelectBaseProductNameByProductId = weakMapCreateSelector(
  (s: SocketIoState, productClassId: string) => getProductEntryById(s.products, productClassId),
  (s: SocketIoState, _: string) => s.productInstances,
  (productEntry, productInstances) =>
    productEntry ? getProductInstanceById(productInstances, productEntry.product.baseProductId)?.displayName ?? "UNDEFINED" : "UNDEFINED",
);

export const SelectProductMetadata = createSelector(
  (_: SocketIoState, productId: string, __: ProductModifierEntry[], ___: Date | number, ____: string) => productId,
  (_: SocketIoState, __: string, modifiers: ProductModifierEntry[], ___: Date | number, ____: string) => modifiers,
  (_: SocketIoState, __: string, ___: ProductModifierEntry[], service_time: Date | number, ____: string) => service_time,
  (_: SocketIoState, __: string, ___: ProductModifierEntry[], ____: Date | number, fulfillmentId: string) => fulfillmentId,
  (s: SocketIoState, _: string, __: ProductModifierEntry[], ___: Date | number, ____: string) => SelectCatalogSelectors(s),
  (productId, modifiers, service_time, fulfillmentId, catalogSelectors) => WCPProductGenerateMetadata(productId, modifiers, catalogSelectors, service_time, fulfillmentId),
  lruMemoizeOptionsWithSize(1000)
)

export const SelectProductsNotPermanentlyDisabled = createSelector(
  (s: SocketIoState) => getProductEntries(s.products),
  (products) => products.filter((x) =>
    (!x.product.disabled || x.product.disabled.start <= x.product.disabled.end)),
  lruMemoizeOptionsWithSize(10)
);

export const SelectProductIdsNotPermanentlyDisabled = createSelector(
  (s: SocketIoState) => SelectProductsNotPermanentlyDisabled(s),
  (products) => products.map(x => x.product.id)
);


export type ProductCategoryFilter = "Menu" | "Order" | null;

/**
 * Selects product instance IDs that pass relevant filters and are immediate children of the given categoryID
 * Returns values in context order (Menu | Order)
 */
export const SelectProductInstanceIdsInCategory = weakMapCreateSelector(
  (categories: SocketIoState['categories'], _products: SocketIoState['products'], _productInstances: SocketIoState['productInstances'], _modifierOptions: SocketIoState['modifierOptions'], categoryId: string, _filter: ProductCategoryFilter, _order_time: Date | number, _fulfillmentId: string) => getCategoryEntryById(categories, categoryId),
  (_categories: SocketIoState['categories'], products: SocketIoState['products'], _productInstances: SocketIoState['productInstances'], _modifierOptions: SocketIoState['modifierOptions'], _categoryId: string, _filter: ProductCategoryFilter, _order_time: Date | number, _fulfillmentId: string) => products,
  (_categories: SocketIoState['categories'], _products: SocketIoState['products'], productInstances: SocketIoState['productInstances'], _modifierOptions: SocketIoState['modifierOptions'], _categoryId: string, _filter: ProductCategoryFilter, _order_time: Date | number, _fulfillmentId: string) => productInstances,
  (_categories: SocketIoState['categories'], _products: SocketIoState['products'], _productInstances: SocketIoState['productInstances'], modifierOptions: SocketIoState['modifierOptions'], _categoryId: string, _filter: ProductCategoryFilter, _order_time: Date | number, _fulfillmentId: string) => modifierOptions,
  (_categories: SocketIoState['categories'], _products: SocketIoState['products'], _productInstances: SocketIoState['productInstances'], _modifierOptions: SocketIoState['modifierOptions'], _categoryId: string, filter: ProductCategoryFilter, _order_time: Date | number, _fulfillmentId: string) => filter,
  (_categories: SocketIoState['categories'], _products: SocketIoState['products'], _productInstances: SocketIoState['productInstances'], _modifierOptions: SocketIoState['modifierOptions'], _categoryId: string, _filter: ProductCategoryFilter, order_time: Date | number, _fulfillmentId: string) => order_time,
  (_categories: SocketIoState['categories'], _products: SocketIoState['products'], _productInstances: SocketIoState['productInstances'], _modifierOptions: SocketIoState['modifierOptions'], _categoryId: string, _filter: ProductCategoryFilter, _order_time: Date | number, fulfillmentId: string) => fulfillmentId,
  (category, products, productInstances, options, filter, order_time, fulfillmentId) => {
    if (category.category.serviceDisable.indexOf(fulfillmentId) !== -1) {
      return [];
    }
    const categoryProductInstances = category.products.reduce((acc: IProductInstance[], productId) => {
      const product = getProductEntryById(products, productId);
      if (!product.product.disabled || product.product.disabled.start <= product.product.disabled.end) {
        return [...acc, ...product.instances.reduce((accB, pIId) => {
          const pi = getProductInstanceById(productInstances, pIId) satisfies IProductInstance;
          const passesFilter = FilterProductUsingCatalog(productId, pi.modifiers, pi.displayFlags, { option: id => getModifierOptionById(options, id), productEntry: id => getProductEntryById(products, id) }, filter === 'Menu' ? GetMenuHideDisplayFlag : (filter === "Order" ? GetOrderHideDisplayFlag : IgnoreHideDisplayFlags), order_time, fulfillmentId);
          return passesFilter ? [...accB, pi] : accB;
        }, [] as IProductInstance[])];
      }
      return acc;
    }, [] as IProductInstance[]);
    switch (filter) {
      case 'Menu':
        categoryProductInstances.sort((a, b) => (a.displayFlags.menu.ordinal - b.displayFlags.menu.ordinal)); break;
      case 'Order':
        categoryProductInstances.sort((a, b) => (a.displayFlags.order.ordinal - b.displayFlags.order.ordinal)); break;
      default:
        break;
    }
    return categoryProductInstances.map(x => x.id);
  }
);

/**
 * For a given categoryId, selects the sub category IDs that, somewhere down their tree, contain a product that is meant to be displayed
 * with the passed context (product availability, time of order, fulfillment, display (menu/order))
 * Returns values in context order (Menu | Order)
 */
export const SelectPopulatedSubcategoryIdsInCategory = weakMapCreateSelector(
  (categories: SocketIoState['categories'], _products: SocketIoState['products'], _productInstances: SocketIoState['productInstances'], _modifierOptions: SocketIoState['modifierOptions'], _categoryId: string, _filter: ProductCategoryFilter, _order_time: Date | number, _fulfillmentId: string) => categories,
  (_categories: SocketIoState['categories'], products: SocketIoState['products'], _productInstances: SocketIoState['productInstances'], _modifierOptions: SocketIoState['modifierOptions'], _categoryId: string, _filter: ProductCategoryFilter, _order_time: Date | number, _fulfillmentId: string) => products,
  (_categories: SocketIoState['categories'], _products: SocketIoState['products'], productInstances: SocketIoState['productInstances'], _modifierOptions: SocketIoState['modifierOptions'], _categoryId: string, _filter: ProductCategoryFilter, _order_time: Date | number, _fulfillmentId: string) => productInstances,
  (_categories: SocketIoState['categories'], _products: SocketIoState['products'], _productInstances: SocketIoState['productInstances'], modifierOptions: SocketIoState['modifierOptions'], _categoryId: string, _filter: ProductCategoryFilter, _order_time: Date | number, _fulfillmentId: string) => modifierOptions,
  (_categories: SocketIoState['categories'], _products: SocketIoState['products'], _productInstances: SocketIoState['productInstances'], _modifierOptions: SocketIoState['modifierOptions'], categoryId: string, _filter: ProductCategoryFilter, _order_time: Date | number, _fulfillmentId: string) => categoryId,
  (_categories: SocketIoState['categories'], _products: SocketIoState['products'], _productInstances: SocketIoState['productInstances'], _modifierOptions: SocketIoState['modifierOptions'], _categoryId: string, filter: ProductCategoryFilter, _order_time: Date | number, _fulfillmentId: string) => filter,
  (_categories: SocketIoState['categories'], _products: SocketIoState['products'], _productInstances: SocketIoState['productInstances'], _modifierOptions: SocketIoState['modifierOptions'], _categoryId: string, _filter: ProductCategoryFilter, order_time: Date | number, _fulfillmentId: string) => order_time,
  (_categories: SocketIoState['categories'], _products: SocketIoState['products'], _productInstances: SocketIoState['productInstances'], _modifierOptions: SocketIoState['modifierOptions'], _categoryId: string, _filter: ProductCategoryFilter, _order_time: Date | number, fulfillmentId: string) => fulfillmentId,
  (categories, products, productInstances, options, categoryId, filter, order_time, fulfillmentId) => {
    const categoryEntry = getCategoryEntryById(categories, categoryId);
    if (categoryEntry.category.serviceDisable.indexOf(fulfillmentId) !== -1) {
      return [];
    }
    const subcats = categoryEntry.children.reduce((acc: CatalogCategoryEntry[], subcatId) => {
      const subcategory = getCategoryEntryById(categories, subcatId);
      const instances = SelectProductInstanceIdsInCategory(categories, products, productInstances, options, subcatId, filter, order_time, fulfillmentId);
      if (instances.length > 0 || SelectPopulatedSubcategoryIdsInCategory(categories, products, productInstances, options, subcatId, filter, order_time, fulfillmentId).length > 0) {
        return [...acc, subcategory];
      }
      else {
        return acc;
      }
    }, []);
    subcats.sort((a, b) => a.category.ordinal - b.category.ordinal);
    return subcats.map(x => x.category.id);
  }
);


// export const selectProductsAfterDisableFilter = (catalogCategory: CatalogCategoryEntry, productSelector: ICatalogSelectors['productEntry']) {
//   return catalogCategory.products.reduce((acc, productId) => {
//     const product = productSelector(productId);
//     if (product) {
//       return [...acc, ...product.instances];
//     }
//     return acc;
//   }, [] as string[])
// }
// // type ProductFilter = "Order" | "Menu" | null;

// // export const SelectProductInstancesInCategory = weakMapCreateSelector(
// //   (s: SocketIoState, categoryId: string, filter: ProductFilter) => 
// // )

// export const selectProductIdsInCategoryAfterDisableFilter = weakMapCreateSelector(
//   (s: RootState, _: string) => selectProductsAfterDisableFilter(s),
//   (_: RootState, categoryId: string) => categoryId,
//   (productsAfterDisableFilter, categoryId) => Object.values(productsAfterDisableFilter).filter((x) =>
//     x.product.category_ids.includes(categoryId)).map(x => x.product.id)
// );
