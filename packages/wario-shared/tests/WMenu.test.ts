import { describe, expect, it } from '@jest/globals';

import type {
  IProductInstanceDisplayFlags,
  IProductModifier,
  ProductModifierEntry,
} from '../src/lib/derived-types';
import {
  CategoryDisplay,
  CURRENCY,
  OptionPlacement,
  OptionQualifier,
  PriceDisplay,
} from '../src/lib/enums';
import {
  CheckRequiredModifiersAreAvailable,
  DoesProductExistInCatalog,
  FilterProductInstanceUsingCatalog,
  FilterProductSelector,
  FilterProductUsingCatalog,
  GetMenuHideDisplayFlag,
  GetOrderHideDisplayFlag,
  IgnoreHideDisplayFlags,
  IsThisCategoryVisibleForFulfillment,
  SelectProductInstancesInCategory,
  SortProductModifierEntries,
  SortProductModifierOptions,
} from '../src/lib/objects/WMenu';
import type { WProductMetadata } from '../src/lib/types';

import {
  createMockCatalogSelectorsFromArrays,
  createMockCategory,
  createMockCategoryDisplayFlags,
  createMockOption,
  createMockOptionType,
  createMockOptionTypeDisplayFlags,
  createMockProduct,
  createMockProductInstance,
  createMockProductInstanceDisplayFlags,
  createMockProductInstanceDisplayFlagsMenu,
  createMockProductInstanceDisplayFlagsOrder,
} from './mocks';

describe('Display Flag Getters', () => {
  describe('GetMenuHideDisplayFlag', () => {
    it('should return true when menu.hide is false', () => {
      const displayFlags = createMockProductInstanceDisplayFlags({ menu: createMockProductInstanceDisplayFlagsMenu({ hide: false }) });
      expect(GetMenuHideDisplayFlag(displayFlags)).toBe(true);
    });

    it('should return false when menu.hide is true', () => {
      const displayFlags = createMockProductInstanceDisplayFlags({ menu: createMockProductInstanceDisplayFlagsMenu({ hide: true }) });
      expect(GetMenuHideDisplayFlag(displayFlags)).toBe(false);
    });
  });

  describe('GetOrderHideDisplayFlag', () => {
    it('should return true when order.hide is false', () => {
      const displayFlags = createMockProductInstanceDisplayFlags({ order: createMockProductInstanceDisplayFlagsOrder({ hide: false }) });
      expect(GetOrderHideDisplayFlag(displayFlags)).toBe(true);
    });

    it('should return false when order.hide is true', () => {
      const displayFlags = createMockProductInstanceDisplayFlags({ order: createMockProductInstanceDisplayFlagsOrder({ hide: true }) });
      expect(GetOrderHideDisplayFlag(displayFlags)).toBe(false);
    });
  });

  describe('IgnoreHideDisplayFlags', () => {
    it('should always return true regardless of flags', () => {
      expect(IgnoreHideDisplayFlags(createMockProductInstanceDisplayFlags({ menu: createMockProductInstanceDisplayFlagsMenu({ hide: true }) }))).toBe(true);
      expect(IgnoreHideDisplayFlags(createMockProductInstanceDisplayFlags({ order: createMockProductInstanceDisplayFlagsOrder({ hide: true }) }))).toBe(true);
    });
  });
});

describe('CheckRequiredModifiersAreAvailable', () => {
  const orderTime = Date.now();
  const fulfillmentId = 'pickup';

  it('should return true when no modifiers are required', () => {
    const product = createMockProduct({ modifiers: [] });
    const modifiers: ProductModifierEntry[] = [];
    const optionSelector = () => undefined;

    expect(CheckRequiredModifiersAreAvailable(product, modifiers, optionSelector, orderTime, fulfillmentId)).toBe(true);
  });

  it('should return true when all required modifier options are enabled', () => {
    const productModifier: IProductModifier = { mtid: 'mt1', enable: null, serviceDisable: [] };
    const product = createMockProduct({ modifiers: [productModifier] });
    const option = createMockOption({ id: 'opt1' });
    const modifiers: ProductModifierEntry[] = [
      { modifierTypeId: 'mt1', options: [{ optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }] },
    ];
    const optionSelector = (id: string) => id === 'opt1' ? option : undefined;

    expect(CheckRequiredModifiersAreAvailable(product, modifiers, optionSelector, orderTime, fulfillmentId)).toBe(true);
  });

  it('should return false when modifier service is disabled for fulfillment', () => {
    const productModifier: IProductModifier = { mtid: 'mt1', enable: null, serviceDisable: ['pickup'] };
    const product = createMockProduct({ modifiers: [productModifier] });
    const option = createMockOption({ id: 'opt1' });
    const modifiers: ProductModifierEntry[] = [
      { modifierTypeId: 'mt1', options: [{ optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }] },
    ];
    const optionSelector = (id: string) => id === 'opt1' ? option : undefined;

    expect(CheckRequiredModifiersAreAvailable(product, modifiers, optionSelector, orderTime, fulfillmentId)).toBe(false);
  });

  it('should return false when modifier option is not found', () => {
    const productModifier: IProductModifier = { mtid: 'mt1', enable: null, serviceDisable: [] };
    const product = createMockProduct({ modifiers: [productModifier] });
    const modifiers: ProductModifierEntry[] = [
      { modifierTypeId: 'mt1', options: [{ optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }] },
    ];
    const optionSelector = () => undefined;

    expect(CheckRequiredModifiersAreAvailable(product, modifiers, optionSelector, orderTime, fulfillmentId)).toBe(false);
  });
});

describe('IsThisCategoryVisibleForFulfillment', () => {
  it('should return true when category exists and is not disabled for fulfillment', () => {
    const category = createMockCategory({
      id: 'cat1',
      name: 'Test Category',
      description: '',
      parent_id: null,
      ordinal: 0,
      serviceDisable: [],
      display_flags: createMockCategoryDisplayFlags({ nesting: CategoryDisplay.FLAT }),
    });
    const catalog = createMockCatalogSelectorsFromArrays({ categories: [category] });

    expect(IsThisCategoryVisibleForFulfillment(catalog.category, 'cat1', 'pickup')).toBe(true);
  });

  it('should return false when category does not exist', () => {
    const catalog = createMockCatalogSelectorsFromArrays();

    expect(IsThisCategoryVisibleForFulfillment(catalog.category, 'cat1', 'pickup')).toBe(false);
  });

  it('should return false when category is disabled for fulfillment', () => {
    const category = createMockCategory({
      id: 'cat1',
      name: 'Test Category',
      description: '',
      parent_id: null,
      ordinal: 0,
      serviceDisable: ['pickup'],
      display_flags: createMockCategoryDisplayFlags({ nesting: CategoryDisplay.FLAT }),
    });
    const catalog = createMockCatalogSelectorsFromArrays({ categories: [category] });

    expect(IsThisCategoryVisibleForFulfillment(catalog.category, 'cat1', 'pickup')).toBe(false);
  });

  it('should check parent category visibility recursively', () => {
    const parentCategory = createMockCategory({
      id: 'parent',
      name: 'Parent Category',
      description: '',
      parent_id: null,
      ordinal: 0,
      serviceDisable: ['pickup'],
    });
    const childCategory = createMockCategory({
      id: 'cat1',
      name: 'Child Category',
      description: '',
      parent_id: 'parent',
      ordinal: 0,
      serviceDisable: [],
      display_flags: createMockCategoryDisplayFlags({ nesting: CategoryDisplay.FLAT }),
    });
    const catalog = createMockCatalogSelectorsFromArrays({ categories: [parentCategory, childCategory] });

    // Child is visible, but parent is disabled for pickup
    expect(IsThisCategoryVisibleForFulfillment(catalog.category, 'cat1', 'pickup')).toBe(false);
  });
});

describe('FilterProductUsingCatalog', () => {
  const orderTime = Date.now();
  const fulfillmentId = 'pickup';

  it('should return false when product entry does not exist', () => {
    const catalogs = createMockCatalogSelectorsFromArrays();
    const displayFlags = createMockProductInstance().displayFlags;

    expect(FilterProductUsingCatalog('prod1', [], displayFlags, catalogs, IgnoreHideDisplayFlags, orderTime, fulfillmentId)).toBe(false);
  });

  it('should return false when product is disabled for fulfillment', () => {
    const product = createMockProduct({ id: 'prod1', serviceDisable: ['pickup'], category_ids: [] });
    const productInstance = createMockProductInstance({ id: 'pi1', productId: 'prod1' });
    const catalogs = createMockCatalogSelectorsFromArrays({ products: [product], productInstances: [productInstance] });
    const displayFlags = createMockProductInstance().displayFlags;

    expect(FilterProductUsingCatalog('prod1', [], displayFlags, catalogs, IgnoreHideDisplayFlags, orderTime, fulfillmentId)).toBe(false);
  });

  it('should return false when hide flag is true', () => {
    const product = createMockProduct({ id: 'prod1', category_ids: [] });
    const productInstance = createMockProductInstance({ id: 'pi1', productId: 'prod1' });
    const catalogs = createMockCatalogSelectorsFromArrays({ products: [product], productInstances: [productInstance] });
    const displayFlags: IProductInstanceDisplayFlags = createMockProductInstanceDisplayFlags({
      menu: createMockProductInstanceDisplayFlagsMenu({ show_modifier_options: true, adornment: '', suppress_exhaustive_modifier_list: false, price_display: PriceDisplay.ALWAYS, hide: true }),
      order: createMockProductInstanceDisplayFlagsOrder({ hide: false, skip_customization: false, adornment: '', suppress_exhaustive_modifier_list: false, price_display: PriceDisplay.ALWAYS }),
    });

    expect(FilterProductUsingCatalog('prod1', [], displayFlags, catalogs, GetMenuHideDisplayFlag, orderTime, fulfillmentId)).toBe(false);
  });

  it('should return true when product is enabled and visible', () => {
    const product = createMockProduct({ id: 'prod1', category_ids: [] });
    const productInstance = createMockProductInstance({ id: 'pi1', productId: 'prod1' });
    const catalogs = createMockCatalogSelectorsFromArrays({ products: [product], productInstances: [productInstance] });
    const displayFlags = createMockProductInstance().displayFlags;

    expect(FilterProductUsingCatalog('prod1', [], displayFlags, catalogs, IgnoreHideDisplayFlags, orderTime, fulfillmentId)).toBe(true);
  });
});

describe('FilterProductInstanceUsingCatalog', () => {
  const orderTime = Date.now();
  const fulfillmentId = 'pickup';

  it('should delegate to FilterProductUsingCatalog with instance properties', () => {
    const product = createMockProduct({ id: 'prod1', category_ids: [] });
    const productInstance = createMockProductInstance({ id: 'pi1', productId: 'prod1' });
    const catalogs = createMockCatalogSelectorsFromArrays({ products: [product], productInstances: [productInstance] });

    expect(FilterProductInstanceUsingCatalog(productInstance, catalogs, IgnoreHideDisplayFlags, orderTime, fulfillmentId)).toBe(true);
  });
});

describe('DoesProductExistInCatalog', () => {
  const fulfillmentId = 'pickup';

  it('should return false when product does not exist', () => {
    const catalog = createMockCatalogSelectorsFromArrays();

    expect(DoesProductExistInCatalog('prod1', [], fulfillmentId, catalog)).toBe(false);
  });

  it('should return false when category is not visible for fulfillment', () => {
    const category = createMockCategory({
      id: 'cat1',
      name: 'Test Category',
      description: '',
      parent_id: null,
      ordinal: 0,
      serviceDisable: ['pickup'],
      display_flags: createMockCategoryDisplayFlags({ nesting: CategoryDisplay.FLAT }),
    });
    const product = createMockProduct({ id: 'prod1', category_ids: ['cat1'] });
    const productInstance = createMockProductInstance({ id: 'pi1', productId: 'prod1' });
    const catalog = createMockCatalogSelectorsFromArrays({ products: [product], productInstances: [productInstance], categories: [category] });

    expect(DoesProductExistInCatalog('prod1', [], fulfillmentId, catalog)).toBe(false);
  });

  it('should return true when product and all modifiers exist', () => {
    const category = createMockCategory({
      id: 'cat1',
      name: 'Test Category',
      description: '',
      parent_id: null,
      ordinal: 0,
      serviceDisable: [],
      display_flags: createMockCategoryDisplayFlags({ nesting: CategoryDisplay.FLAT }),
    });
    const modifierType = createMockOptionType({
      id: 'mt1',
      name: 'Toppings',
      ordinal: 0,
      min_selected: 0,
      max_selected: 10,
      displayFlags: createMockOptionTypeDisplayFlags(),
    });
    const option = createMockOption({ id: 'opt1', modifierTypeId: 'mt1' });
    const product = createMockProduct({ id: 'prod1', category_ids: ['cat1'] });
    const productInstance = createMockProductInstance({ id: 'pi1', productId: 'prod1' });
    const catalog = createMockCatalogSelectorsFromArrays({
      products: [product],
      productInstances: [productInstance],
      categories: [category],
      modifierTypes: [modifierType],
      options: [option]
    });

    const modifiers: ProductModifierEntry[] = [
      { modifierTypeId: 'mt1', options: [{ optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }] },
    ];

    expect(DoesProductExistInCatalog('prod1', modifiers, fulfillmentId, catalog)).toBe(true);
  });
});

describe('SelectProductInstancesInCategory', () => {
  it('should return empty array when category has no products', () => {
    const category = createMockCategory({
      id: 'cat1',
      name: 'Test Category',
      description: '',
      parent_id: null,
      ordinal: 0,
      serviceDisable: [],
      display_flags: createMockCategoryDisplayFlags({ nesting: CategoryDisplay.FLAT }),
    });
    const catalog = createMockCatalogSelectorsFromArrays({ categories: [category] });
    const categoryEntry = catalog.category('cat1');
    if (!categoryEntry) throw new Error('Category not found');

    expect(SelectProductInstancesInCategory(categoryEntry, catalog.productEntry)).toEqual([]);
  });

  it('should return all product instances from products in the category', () => {
    const category = createMockCategory({
      id: 'cat1',
      name: 'Test Category',
      description: '',
      parent_id: null,
      ordinal: 0,
      serviceDisable: [],
      display_flags: createMockCategoryDisplayFlags({ nesting: CategoryDisplay.FLAT }),
    });
    const product1 = createMockProduct({ id: 'prod1', category_ids: ['cat1'] });
    const product2 = createMockProduct({ id: 'prod2', category_ids: ['cat1'] });
    const pi1 = createMockProductInstance({ id: 'pi1', productId: 'prod1' });
    const pi2 = createMockProductInstance({ id: 'pi2', productId: 'prod1' });
    const pi3 = createMockProductInstance({ id: 'pi3', productId: 'prod2' });
    const catalog = createMockCatalogSelectorsFromArrays({
      categories: [category],
      products: [product1, product2],
      productInstances: [pi1, pi2, pi3]
    });
    const categoryEntry = catalog.category('cat1');
    if (!categoryEntry) throw new Error('Category not found');

    expect(SelectProductInstancesInCategory(categoryEntry, catalog.productEntry)).toEqual(['pi1', 'pi2', 'pi3']);
  });
});

describe('SortProductModifierEntries', () => {
  it('should sort modifiers by ordinal', () => {
    const modifiers: ProductModifierEntry[] = [
      { modifierTypeId: 'mt2', options: [] },
      { modifierTypeId: 'mt1', options: [] },
      { modifierTypeId: 'mt3', options: [] },
    ];
    const mt1 = createMockOptionType({ id: 'mt1', name: 'First', ordinal: 1 });
    const mt2 = createMockOptionType({ id: 'mt2', name: 'Second', ordinal: 2 });
    const mt3 = createMockOptionType({ id: 'mt3', name: 'Third', ordinal: 3 });
    const catalog = createMockCatalogSelectorsFromArrays({ modifierTypes: [mt1, mt2, mt3] });

    const sorted = SortProductModifierEntries(modifiers, catalog.modifierEntry);
    expect(sorted.map(m => m.modifierTypeId)).toEqual(['mt1', 'mt2', 'mt3']);
  });
});

describe('SortProductModifierOptions', () => {
  it('should sort options by ordinal', () => {
    const options = [
      { optionId: 'opt3', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
      { optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
      { optionId: 'opt2', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
    ];
    const mt1 = createMockOptionType({ id: 'mt1', name: 'First', ordinal: 1 });
    const opt1 = createMockOption({ id: 'opt1', modifierTypeId: 'mt1', ordinal: 1 });
    const opt2 = createMockOption({ id: 'opt2', modifierTypeId: 'mt1', ordinal: 2 });
    const opt3 = createMockOption({ id: 'opt3', modifierTypeId: 'mt1', ordinal: 3 });
    const catalog = createMockCatalogSelectorsFromArrays({ modifierTypes: [mt1], options: [opt1, opt2, opt3] });

    const sorted = SortProductModifierOptions(options, catalog.option);
    expect(sorted.map(o => o.optionId)).toEqual(['opt1', 'opt2', 'opt3']);
  });
});

describe('FilterProductSelector', () => {
  const orderTime = Date.now();
  const fulfillmentId = 'pickup';

  it('should return false when product is disabled for fulfillment', () => {
    const product = createMockProduct({ serviceDisable: ['pickup'] });
    const metadata: WProductMetadata = {
      name: 'Test',
      description: '',
      shortname: 'T',
      pi: ['pi1', 'pi1'],
      is_split: false,
      price: { amount: 1000, currency: CURRENCY.USD },
      incomplete: false,
      modifier_map: {},
      advanced_option_eligible: false,
      advanced_option_selected: false,
      additional_modifiers: { left: [], right: [], whole: [] },
      exhaustive_modifiers: { left: [], right: [], whole: [] },
      bake_count: [0, 0],
      flavor_count: [0, 0],
    };

    expect(FilterProductSelector(product, [], metadata, () => undefined, orderTime, fulfillmentId, true)).toBe(false);
  });

  it('should return true when product is enabled and complete', () => {
    const product = createMockProduct();
    const metadata: WProductMetadata = {
      name: 'Test',
      description: '',
      shortname: 'T',
      pi: ['pi1', 'pi1'],
      is_split: false,
      price: { amount: 1000, currency: CURRENCY.USD },
      incomplete: false,
      modifier_map: {},
      advanced_option_eligible: false,
      advanced_option_selected: false,
      additional_modifiers: { left: [], right: [], whole: [] },
      exhaustive_modifiers: { left: [], right: [], whole: [] },
      bake_count: [0, 0],
      flavor_count: [0, 0],
    };

    expect(FilterProductSelector(product, [], metadata, () => undefined, orderTime, fulfillmentId, true)).toBe(true);
  });

  it('should return false when filterIncomplete is true and product is incomplete', () => {
    const product = createMockProduct();
    const metadata: WProductMetadata = {
      name: 'Test',
      description: '',
      shortname: 'T',
      pi: ['pi1', 'pi1'],
      is_split: false,
      price: { amount: 1000, currency: CURRENCY.USD },
      incomplete: true,
      modifier_map: {},
      advanced_option_eligible: false,
      advanced_option_selected: false,
      additional_modifiers: { left: [], right: [], whole: [] },
      exhaustive_modifiers: { left: [], right: [], whole: [] },
      bake_count: [0, 0],
      flavor_count: [0, 0],
    };

    expect(FilterProductSelector(product, [], metadata, () => undefined, orderTime, fulfillmentId, true)).toBe(false);
  });

  it('should return true when filterIncomplete is false even if product is incomplete', () => {
    const product = createMockProduct();
    const metadata: WProductMetadata = {
      name: 'Test',
      description: '',
      shortname: 'T',
      pi: ['pi1', 'pi1'],
      is_split: false,
      price: { amount: 1000, currency: CURRENCY.USD },
      incomplete: true,
      modifier_map: {},
      advanced_option_eligible: false,
      advanced_option_selected: false,
      additional_modifiers: { left: [], right: [], whole: [] },
      exhaustive_modifiers: { left: [], right: [], whole: [] },
      bake_count: [0, 0],
      flavor_count: [0, 0],
    };

    expect(FilterProductSelector(product, [], metadata, () => undefined, orderTime, fulfillmentId, false)).toBe(true);
  });
});
