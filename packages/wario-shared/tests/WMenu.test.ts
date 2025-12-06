import { describe, expect, it } from '@jest/globals';

import type {
  CatalogCategoryEntry,
  CatalogModifierEntry,
  CatalogProductEntry,
  IProductInstanceDisplayFlags,
  IProductModifier,
  ProductModifierEntry,
} from '../src/lib/derived-types';
import {
  CategoryDisplay,
  CURRENCY,
  OptionPlacement,
  OptionQualifier,
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
  createMockCatalogSelectors,
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
    const category: CatalogCategoryEntry = {
      category: createMockCategory({
        id: 'cat1',
        name: 'Test Category',
        description: '',
        parent_id: null,
        ordinal: 0,
        serviceDisable: [],
        display_flags: createMockCategoryDisplayFlags({ nesting: CategoryDisplay.FLAT }),
      }),
      products: [],
      children: [],
    };
    const categorySelector = (id: string) => id === 'cat1' ? category : undefined;

    expect(IsThisCategoryVisibleForFulfillment(categorySelector, 'cat1', 'pickup')).toBe(true);
  });

  it('should return false when category does not exist', () => {
    const categorySelector = () => undefined;

    expect(IsThisCategoryVisibleForFulfillment(categorySelector, 'cat1', 'pickup')).toBe(false);
  });

  it('should return false when category is disabled for fulfillment', () => {
    const category: CatalogCategoryEntry = {
      category: createMockCategory({
        id: 'cat1',
        name: 'Test Category',
        description: '',
        parent_id: null,
        ordinal: 0,
        serviceDisable: ['pickup'],
        display_flags: createMockCategoryDisplayFlags({ nesting: CategoryDisplay.FLAT }),
      }),
      products: [],
      children: [],
    };
    const categorySelector = (id: string) => id === 'cat1' ? category : undefined;

    expect(IsThisCategoryVisibleForFulfillment(categorySelector, 'cat1', 'pickup')).toBe(false);
  });

  it('should check parent category visibility recursively', () => {
    const parentCategory: CatalogCategoryEntry = {
      category: createMockCategory({
        id: 'parent',
        name: 'Parent Category',
        description: '',
        parent_id: null,
        ordinal: 0,
        serviceDisable: ['pickup'],
      }),
      products: [],
      children: ['cat1'],
    };
    const childCategory: CatalogCategoryEntry = {
      category: createMockCategory({
        id: 'cat1',
        name: 'Child Category',
        description: '',
        parent_id: 'parent',
        ordinal: 0,
        serviceDisable: [],
        display_flags: createMockCategoryDisplayFlags({ nesting: CategoryDisplay.FLAT }),
      }),
      products: [],
      children: [],
    };
    const categorySelector = (id: string) => {
      if (id === 'cat1') return childCategory;
      if (id === 'parent') return parentCategory;
      return undefined;
    };

    // Child is visible, but parent is disabled for pickup
    expect(IsThisCategoryVisibleForFulfillment(categorySelector, 'cat1', 'pickup')).toBe(false);
  });
});

describe('FilterProductUsingCatalog', () => {
  const orderTime = Date.now();
  const fulfillmentId = 'pickup';

  it('should return false when product entry does not exist', () => {
    const catalogs = createMockCatalogSelectors();
    const displayFlags = createMockProductInstance().displayFlags;

    expect(FilterProductUsingCatalog('prod1', [], displayFlags, catalogs, IgnoreHideDisplayFlags, orderTime, fulfillmentId)).toBe(false);
  });

  it('should return false when product is disabled for fulfillment', () => {
    const product = createMockProduct({ serviceDisable: ['pickup'] });
    const productEntry: CatalogProductEntry = { product, instances: ['pi1'] };
    const catalogs = createMockCatalogSelectors({ prod1: productEntry });
    const displayFlags = createMockProductInstance().displayFlags;

    expect(FilterProductUsingCatalog('prod1', [], displayFlags, catalogs, IgnoreHideDisplayFlags, orderTime, fulfillmentId)).toBe(false);
  });

  it('should return false when hide flag is true', () => {
    const product = createMockProduct();
    const productEntry: CatalogProductEntry = { product, instances: ['pi1'] };
    const catalogs = createMockCatalogSelectors({ prod1: productEntry });
    const displayFlags: IProductInstanceDisplayFlags = {
      menu: { show_modifier_options: true, adornment: '', suppress_exhaustive_modifier_list: false, price_display: 'ALWAYS' as const, hide: true },
      order: { hide: false, skip_customization: false, adornment: '', suppress_exhaustive_modifier_list: false, price_display: 'ALWAYS' as const },
    };

    expect(FilterProductUsingCatalog('prod1', [], displayFlags, catalogs, GetMenuHideDisplayFlag, orderTime, fulfillmentId)).toBe(false);
  });

  it('should return true when product is enabled and visible', () => {
    const product = createMockProduct();
    const productEntry: CatalogProductEntry = { product, instances: ['pi1'] };
    const catalogs = createMockCatalogSelectors({ prod1: productEntry });
    const displayFlags = createMockProductInstance().displayFlags;

    expect(FilterProductUsingCatalog('prod1', [], displayFlags, catalogs, IgnoreHideDisplayFlags, orderTime, fulfillmentId)).toBe(true);
  });
});

describe('FilterProductInstanceUsingCatalog', () => {
  const orderTime = Date.now();
  const fulfillmentId = 'pickup';

  it('should delegate to FilterProductUsingCatalog with instance properties', () => {
    const product = createMockProduct();
    const productEntry: CatalogProductEntry = { product, instances: ['pi1'] };
    const productInstance = createMockProductInstance({ productId: 'prod1' });
    const catalogs = createMockCatalogSelectors({ prod1: productEntry });

    expect(FilterProductInstanceUsingCatalog(productInstance, catalogs, IgnoreHideDisplayFlags, orderTime, fulfillmentId)).toBe(true);
  });
});

describe('DoesProductExistInCatalog', () => {
  const fulfillmentId = 'pickup';

  it('should return false when product does not exist', () => {
    const catalog = createMockCatalogSelectors();

    expect(DoesProductExistInCatalog('prod1', [], fulfillmentId, catalog)).toBe(false);
  });

  it('should return false when category is not visible for fulfillment', () => {
    const product = createMockProduct({ category_ids: ['cat1'] });
    const productEntry: CatalogProductEntry = { product, instances: ['pi1'] };
    const category: CatalogCategoryEntry = {
      category: {
        id: 'cat1',
        name: 'Test Category',
        description: '',
        parent_id: null,
        ordinal: 0,
        serviceDisable: ['pickup'],
        displayFlags: { nesting: 'FLAT' as const },
      },
      products: ['prod1'],
      children: [],
    };
    const catalog = createMockCatalogSelectors({ prod1: productEntry }, {}, {}, { cat1: category });

    expect(DoesProductExistInCatalog('prod1', [], fulfillmentId, catalog)).toBe(false);
  });

  it('should return true when product and all modifiers exist', () => {
    const product = createMockProduct({ category_ids: ['cat1'] });
    const productEntry: CatalogProductEntry = { product, instances: ['pi1'] };
    const category: CatalogCategoryEntry = {
      category: {
        id: 'cat1',
        name: 'Test Category',
        description: '',
        parent_id: null,
        ordinal: 0,
        serviceDisable: [],
        displayFlags: { nesting: 'FLAT' as const },
      },
      products: ['prod1'],
      children: [],
    };
    const modifierEntry: CatalogModifierEntry = {

      modifierType: createMockOptionType({
        id: 'mt1',
        name: 'Toppings',
        ordinal: 0,
        min_selected: 0,
        max_selected: 10,
        displayFlags: createMockOptionTypeDisplayFlags({}),
      }
      ),
      options: ['opt1'],
    };
    const option = createMockOption({ id: 'opt1' });
    const catalog = createMockCatalogSelectors({ prod1: productEntry }, { opt1: option }, { mt1: modifierEntry }, { cat1: category });

    const modifiers: ProductModifierEntry[] = [
      { modifierTypeId: 'mt1', options: [{ optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }] },
    ];

    expect(DoesProductExistInCatalog('prod1', modifiers, fulfillmentId, catalog)).toBe(true);
  });
});

describe('SelectProductInstancesInCategory', () => {
  it('should return empty array when category has no products', () => {
    const category: CatalogCategoryEntry = {
      category: {
        id: 'cat1',
        name: 'Test Category',
        description: '',
        parent_id: null,
        ordinal: 0,
        serviceDisable: [],
        displayFlags: { nesting: 'FLAT' as const },
      },
      products: [],
      children: [],
    };
    const productSelector = () => undefined;

    expect(SelectProductInstancesInCategory(category, productSelector)).toEqual([]);
  });

  it('should return all product instances from products in the category', () => {
    const category: CatalogCategoryEntry = {
      category: {
        id: 'cat1',
        name: 'Test Category',
        description: '',
        parent_id: null,
        ordinal: 0,
        serviceDisable: [],
        displayFlags: { nesting: 'FLAT' as const },
      },
      products: ['prod1', 'prod2'],
      children: [],
    };
    const productEntry1: CatalogProductEntry = {
      product: createMockProduct({ id: 'prod1' }),
      instances: ['pi1', 'pi2']
    };
    const productEntry2: CatalogProductEntry = {
      product: createMockProduct({ id: 'prod2' }),
      instances: ['pi3']
    };
    const productSelector = (id: string) => {
      if (id === 'prod1') return productEntry1;
      if (id === 'prod2') return productEntry2;
      return undefined;
    };

    expect(SelectProductInstancesInCategory(category, productSelector)).toEqual(['pi1', 'pi2', 'pi3']);
  });
});

describe('SortProductModifierEntries', () => {
  it('should sort modifiers by ordinal', () => {
    const modifiers: ProductModifierEntry[] = [
      { modifierTypeId: 'mt2', options: [] },
      { modifierTypeId: 'mt1', options: [] },
      { modifierTypeId: 'mt3', options: [] },
    ];
    const modifierEntry1: CatalogModifierEntry = {
      modifierType: { id: 'mt1', name: 'First', ordinal: 1 } as CatalogModifierEntry['modifierType'],
      options: [],
    };
    const modifierEntry2: CatalogModifierEntry = {
      modifierType: { id: 'mt2', name: 'Second', ordinal: 2 } as CatalogModifierEntry['modifierType'],
      options: [],
    };
    const modifierEntry3: CatalogModifierEntry = {
      modifierType: { id: 'mt3', name: 'Third', ordinal: 3 } as CatalogModifierEntry['modifierType'],
      options: [],
    };
    const modifierTypeSelector = (id: string) => {
      if (id === 'mt1') return modifierEntry1;
      if (id === 'mt2') return modifierEntry2;
      if (id === 'mt3') return modifierEntry3;
      return undefined;
    };

    const sorted = SortProductModifierEntries(modifiers, modifierTypeSelector);
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
    const optionSelector = (id: string) => {
      if (id === 'opt1') return createMockOption({ id: 'opt1', ordinal: 1 });
      if (id === 'opt2') return createMockOption({ id: 'opt2', ordinal: 2 });
      if (id === 'opt3') return createMockOption({ id: 'opt3', ordinal: 3 });
      return undefined;
    };

    const sorted = SortProductModifierOptions(options, optionSelector);
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
