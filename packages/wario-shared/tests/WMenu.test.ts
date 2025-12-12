import { describe, expect, it } from '@jest/globals';

import type { IProductModifier, ProductInstanceModifierEntry } from '../src/lib/derived-types';
import { CURRENCY, DISABLE_REASON, OptionPlacement, OptionQualifier } from '../src/lib/enums';
import {
  CheckRequiredModifiersAreAvailable,
  ComputeCategoryVisibilityMap,
  FilterProductSelector,
  GetMenuHideDisplayFlag,
  GetOrderHideDisplayFlag,
  IgnoreHideDisplayFlags,
  ShowTemporarilyDisabledProducts,
  SortByOrderingArray,
  SortProductModifierEntries
} from '../src/lib/objects/WMenu';
import type { WProductMetadata } from '../src/lib/types';

import {
  createMockCatalogSelectorsFromArrays,
  createMockCategory,
  createMockOption,
  createMockOptionType,
  createMockProduct,
  createMockProductInstance,
  createMockProductInstanceDisplayFlags,
  createMockProductInstanceDisplayFlagsMenu,
  createMockProductInstanceDisplayFlagsOrder,
} from './mocks';

describe('Display Flag Getters', () => {
  describe('GetMenuHideDisplayFlag', () => {
    it('should return true when menu.hide is false', () => {
      const displayFlags = createMockProductInstanceDisplayFlags({
        menu: createMockProductInstanceDisplayFlagsMenu({ hide: false }),
      });
      expect(GetMenuHideDisplayFlag(displayFlags)).toBe(false);
    });

    it('should return false when menu.hide is true', () => {
      const displayFlags = createMockProductInstanceDisplayFlags({
        menu: createMockProductInstanceDisplayFlagsMenu({ hide: true }),
      });
      expect(GetMenuHideDisplayFlag(displayFlags)).toBe(true);
    });
  });

  describe('GetOrderHideDisplayFlag', () => {
    it('should return true when order.hide is false', () => {
      const displayFlags = createMockProductInstanceDisplayFlags({
        order: createMockProductInstanceDisplayFlagsOrder({ hide: false }),
      });
      expect(GetOrderHideDisplayFlag(displayFlags)).toBe(false);
    });

    it('should return false when order.hide is true', () => {
      const displayFlags = createMockProductInstanceDisplayFlags({
        order: createMockProductInstanceDisplayFlagsOrder({ hide: true }),
      });
      expect(GetOrderHideDisplayFlag(displayFlags)).toBe(true);
    });
  });

  describe('IgnoreHideDisplayFlags', () => {
    it('should always return false regardless of flags', () => {
      expect(
        IgnoreHideDisplayFlags(
          createMockProductInstanceDisplayFlags({ menu: createMockProductInstanceDisplayFlagsMenu({ hide: true }) }),
        ),
      ).toBe(false);
      expect(
        IgnoreHideDisplayFlags(
          createMockProductInstanceDisplayFlags({ order: createMockProductInstanceDisplayFlagsOrder({ hide: true }) }),
        ),
      ).toBe(false);
    });
  });
});

describe('CheckRequiredModifiersAreAvailable', () => {
  const orderTime = Date.now();
  const fulfillmentId = 'pickup';

  it('should return true when no modifiers are required', () => {
    const product = createMockProduct({ modifiers: [] });
    const modifiers: ProductInstanceModifierEntry[] = [];
    const optionSelector = () => undefined;

    expect(CheckRequiredModifiersAreAvailable(product, modifiers, optionSelector, orderTime, fulfillmentId)).toBe(true);
  });

  it('should return true when all required modifier options are enabled', () => {
    const productModifier: IProductModifier = { mtid: 'mt1', enable: null, serviceDisable: [] };
    const product = createMockProduct({ modifiers: [productModifier] });
    const option = createMockOption({ id: 'opt1' });
    const modifiers: ProductInstanceModifierEntry[] = [
      {
        modifierTypeId: 'mt1',
        options: [{ optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
      },
    ];
    const optionSelector = (id: string) => (id === 'opt1' ? option : undefined);

    expect(CheckRequiredModifiersAreAvailable(product, modifiers, optionSelector, orderTime, fulfillmentId)).toBe(true);
  });

  it('should return false when modifier service is disabled for fulfillment', () => {
    const productModifier: IProductModifier = { mtid: 'mt1', enable: null, serviceDisable: ['pickup'] };
    const product = createMockProduct({ modifiers: [productModifier] });
    const option = createMockOption({ id: 'opt1' });
    const modifiers: ProductInstanceModifierEntry[] = [
      {
        modifierTypeId: 'mt1',
        options: [{ optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
      },
    ];
    const optionSelector = (id: string) => (id === 'opt1' ? option : undefined);

    expect(CheckRequiredModifiersAreAvailable(product, modifiers, optionSelector, orderTime, fulfillmentId)).toBe(
      false,
    );
  });

  it('should return false when modifier option is not found', () => {
    const productModifier: IProductModifier = { mtid: 'mt1', enable: null, serviceDisable: [] };
    const product = createMockProduct({ modifiers: [productModifier] });
    const modifiers: ProductInstanceModifierEntry[] = [
      {
        modifierTypeId: 'mt1',
        options: [{ optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
      },
    ];
    const optionSelector = () => undefined;

    expect(CheckRequiredModifiersAreAvailable(product, modifiers, optionSelector, orderTime, fulfillmentId)).toBe(
      false,
    );
  });
});

describe('SortProductModifierEntries', () => {
  it('should sort modifiers by ordinal', () => {
    const modifiers: ProductInstanceModifierEntry[] = [
      { modifierTypeId: 'mt2', options: [] },
      { modifierTypeId: 'mt1', options: [] },
      { modifierTypeId: 'mt3', options: [] },
    ];
    const mt1 = createMockOptionType({ id: 'mt1', name: 'First', ordinal: 1, options: [] });
    const mt2 = createMockOptionType({ id: 'mt2', name: 'Second', ordinal: 2, options: [] });
    const mt3 = createMockOptionType({ id: 'mt3', name: 'Third', ordinal: 3, options: [] });
    const catalog = createMockCatalogSelectorsFromArrays({ modifierTypes: [mt1, mt2, mt3] });

    const sorted = SortProductModifierEntries(modifiers, catalog.modifierEntry);
    expect(sorted.map((m) => m.modifierTypeId)).toEqual(['mt1', 'mt2', 'mt3']);
  });
});

describe('SortProductModifierOptions', () => {
  it('should sort options by ordinal', () => {
    const options = [
      { optionId: 'opt3', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
      { optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
      { optionId: 'opt2', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
    ];
    const opt1 = createMockOption({ id: 'opt1' });
    const opt2 = createMockOption({ id: 'opt2' });
    const opt3 = createMockOption({ id: 'opt3' });
    const mt1 = createMockOptionType({ id: 'mt1', name: 'First', ordinal: 1, options: [opt1.id, opt2.id, opt3.id] });

    const sorted = SortByOrderingArray(options, mt1.options, (o) => o.optionId);
    expect(sorted.map((o) => o.optionId)).toEqual(['opt1', 'opt2', 'opt3']);
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

describe('ComputeCategoryVisibilityMap', () => {
  const orderTime = Date.now();
  const fulfillmentId = 'pickup';

  it('should return empty maps for category with no products and no children', () => {
    const rootCategory = createMockCategory({ id: 'root', products: [], children: [] });
    const catalogSelectors = createMockCatalogSelectorsFromArrays({
      categories: [rootCategory],
    });

    const result = ComputeCategoryVisibilityMap(
      catalogSelectors,
      'root',
      fulfillmentId,
      orderTime,
      'menu',
      ShowTemporarilyDisabledProducts,
    );

    expect(result.products.get('root')).toEqual([]);
    expect(result.populatedChildren.get('root')).toEqual([]);
  });

  it('should find visible products in a category', () => {
    const productInstance = createMockProductInstance({
      id: 'pi1',
      displayFlags: createMockProductInstanceDisplayFlags({
        menu: createMockProductInstanceDisplayFlagsMenu({ hide: false }),
      }),
    });
    const product = createMockProduct({
      id: 'prod1',
      instances: ['pi1'],
    });
    const rootCategory = createMockCategory({
      id: 'root',
      products: ['prod1'],
      children: [],
    });
    const catalogSelectors = createMockCatalogSelectorsFromArrays({
      categories: [rootCategory],
      products: [product],
      productInstances: [productInstance],
    });

    const result = ComputeCategoryVisibilityMap(
      catalogSelectors,
      'root',
      fulfillmentId,
      orderTime,
      'menu',
      ShowTemporarilyDisabledProducts,
    );

    expect(result.products.get('root')?.length).toBe(1);
    expect(result.products.get('root')?.[0].product.id).toBe('prod1');
    expect(result.populatedChildren.get('root')).toEqual([]);
  });

  it('should track populated children correctly in nested structure', () => {
    const productInstance = createMockProductInstance({
      id: 'pi1',
      displayFlags: createMockProductInstanceDisplayFlags({
        menu: createMockProductInstanceDisplayFlagsMenu({ hide: false }),
      }),
    });
    const product = createMockProduct({
      id: 'prod1',
      instances: ['pi1'],
    });
    const childCategory = createMockCategory({
      id: 'child',
      products: ['prod1'],
      children: [],
    });
    const rootCategory = createMockCategory({
      id: 'root',
      products: [],
      children: ['child'],
    });
    const catalogSelectors = createMockCatalogSelectorsFromArrays({
      categories: [rootCategory, childCategory],
      products: [product],
      productInstances: [productInstance],
    });

    const result = ComputeCategoryVisibilityMap(
      catalogSelectors,
      'root',
      fulfillmentId,
      orderTime,
      'menu',
      ShowTemporarilyDisabledProducts,
    );

    expect(result.products.get('root')).toEqual([]);
    expect(result.populatedChildren.get('root')).toEqual(['child']);
    expect(result.products.get('child')?.length).toBe(1);
  });

  it('should exclude service-disabled categories', () => {
    const productInstance = createMockProductInstance({
      id: 'pi1',
      displayFlags: createMockProductInstanceDisplayFlags({
        menu: createMockProductInstanceDisplayFlagsMenu({ hide: false }),
      }),
    });
    const product = createMockProduct({
      id: 'prod1',
      instances: ['pi1'],
    });
    const disabledChild = createMockCategory({
      id: 'disabled-child',
      products: ['prod1'],
      children: [],
      serviceDisable: ['pickup'], // Disabled for this fulfillment
    });
    const rootCategory = createMockCategory({
      id: 'root',
      products: [],
      children: ['disabled-child'],
    });
    const catalogSelectors = createMockCatalogSelectorsFromArrays({
      categories: [rootCategory, disabledChild],
      products: [product],
      productInstances: [productInstance],
    });

    const result = ComputeCategoryVisibilityMap(
      catalogSelectors,
      'root',
      fulfillmentId,
      orderTime,
      'menu',
      ShowTemporarilyDisabledProducts,
    );

    // Disabled child should not be in populated children
    expect(result.populatedChildren.get('root')).toEqual([]);
  });

  it('should respect visibility logic for filtering products', () => {
    const productInstance = createMockProductInstance({
      id: 'pi1',
      displayFlags: createMockProductInstanceDisplayFlags({
        menu: createMockProductInstanceDisplayFlagsMenu({ hide: false }),
      }),
    });
    const product = createMockProduct({
      id: 'prod1',
      instances: ['pi1'],
      // Product has a time-based disable
      disabled: { start: orderTime - 10000, end: orderTime + 10000 },
    });
    const rootCategory = createMockCategory({
      id: 'root',
      products: ['prod1'],
      children: [],
    });
    const catalogSelectors = createMockCatalogSelectorsFromArrays({
      categories: [rootCategory],
      products: [product],
      productInstances: [productInstance],
    });

    // ShowTemporarilyDisabledProducts allows time-disabled products
    const resultWithDisabled = ComputeCategoryVisibilityMap(
      catalogSelectors,
      'root',
      fulfillmentId,
      orderTime,
      'menu',
      ShowTemporarilyDisabledProducts,
    );
    expect(resultWithDisabled.products.get('root')?.length).toBe(1);

    // Strict filter that only shows enabled products
    const strictFilter = (reason: DISABLE_REASON) => reason === DISABLE_REASON.ENABLED;
    const resultStrict = ComputeCategoryVisibilityMap(
      catalogSelectors,
      'root',
      fulfillmentId,
      orderTime,
      'menu',
      strictFilter,
    );
    expect(resultStrict.products.get('root')?.length).toBe(0);
  });
});
