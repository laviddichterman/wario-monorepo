
import { describe, expect, it } from '@jest/globals';

import type {
  CatalogProductEntry,
  ProductModifierEntry,
} from '../src/lib/derived-types';
import {
  CURRENCY,
  DISABLE_REASON,
  MODIFIER_MATCH,
  OptionPlacement,
  OptionQualifier,
} from '../src/lib/enums';
import {
  ComputePotentialPrices,
  CreateWCPProduct,
  SortModifersAndOptions,
  WProductCompare,
  WProductDisplayOptions,
  WProductEquals,
  WProductMetadataCompareProducts,
} from '../src/lib/objects/WCPProduct';
import type { MetadataModifierMap, WProductMetadata } from '../src/lib/types';

import {
  createMockCatalogSelectorsFromArrays,
  createMockOption,
  createMockOptionType,
  createMockProduct,
} from './mocks';

describe('CreateWCPProduct', () => {
  it('should create a product with given productId and modifiers', () => {
    const modifiers: ProductModifierEntry[] = [
      { modifierTypeId: 'mt1', options: [{ optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }] },
    ];
    const product = CreateWCPProduct('prod1', modifiers);

    expect(product.productId).toBe('prod1');
    expect(product.modifiers).toEqual(modifiers);
  });

  it('should create a deep copy of modifiers', () => {
    const modifiers: ProductModifierEntry[] = [
      { modifierTypeId: 'mt1', options: [{ optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }] },
    ];
    const product = CreateWCPProduct('prod1', modifiers);

    // Modify original
    modifiers[0].options[0].placement = OptionPlacement.LEFT;

    // Product should still have WHOLE
    expect(product.modifiers[0].options[0].placement).toBe(OptionPlacement.WHOLE);
  });
});

describe('SortModifersAndOptions', () => {
  it('should sort modifiers by ordinal and options within each modifier', () => {
    const modifiers: ProductModifierEntry[] = [
      { modifierTypeId: 'mt2', options: [{ optionId: 'opt3', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }, { optionId: 'opt1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }] },
      { modifierTypeId: 'mt1', options: [{ optionId: 'opt2', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }] },
    ];

    const selectors = createMockCatalogSelectorsFromArrays({
      options: [
        createMockOption({ id: 'opt1', ordinal: 1 }),
        createMockOption({ id: 'opt2', ordinal: 2 }),
        createMockOption({ id: 'opt3', ordinal: 3 }),
      ],
      modifierTypes: [
        createMockOptionType({ id: 'mt1', ordinal: 1 }),
        createMockOptionType({ id: 'mt2', ordinal: 2 }),
      ],
    });

    const sorted = SortModifersAndOptions(modifiers, selectors);

    expect(sorted[0].modifierTypeId).toBe('mt1');
    expect(sorted[1].modifierTypeId).toBe('mt2');
    expect(sorted[1].options[0].optionId).toBe('opt1');
    expect(sorted[1].options[1].optionId).toBe('opt3');
  });
});

describe('WProductEquals', () => {
  it('should return true when comparison is a mirror', () => {
    const comparison = {
      mirror: true,
      match_matrix: [[], []] as [never[][], never[][]],
      match: [MODIFIER_MATCH.NO_MATCH, MODIFIER_MATCH.NO_MATCH] as [MODIFIER_MATCH, MODIFIER_MATCH],
    };

    expect(WProductEquals(comparison)).toBe(true);
  });

  it('should return true when both sides are EXACT_MATCH', () => {
    const comparison = {
      mirror: false,
      match_matrix: [[], []] as [never[][], never[][]],
      match: [MODIFIER_MATCH.EXACT_MATCH, MODIFIER_MATCH.EXACT_MATCH] as [MODIFIER_MATCH, MODIFIER_MATCH],
    };

    expect(WProductEquals(comparison)).toBe(true);
  });

  it('should return false when not mirror and not both EXACT_MATCH', () => {
    const comparison = {
      mirror: false,
      match_matrix: [[], []] as [never[][], never[][]],
      match: [MODIFIER_MATCH.EXACT_MATCH, MODIFIER_MATCH.AT_LEAST] as [MODIFIER_MATCH, MODIFIER_MATCH],
    };

    expect(WProductEquals(comparison)).toBe(false);
  });
});

describe('WProductCompare', () => {
  it('should return NO_MATCH when product IDs differ', () => {
    const productA = CreateWCPProduct('prod1', []);
    const productB = CreateWCPProduct('prod2', []);
    const product = createMockProduct({ id: 'prod1' });
    const productEntry: CatalogProductEntry = { product, instances: ['pi1'] };

    const selectors = {
      productEntry: (id: string) => id === 'prod1' ? productEntry : undefined,
      modifierEntry: () => undefined,
    };

    const result = WProductCompare(productA, productB, selectors);

    expect(result.mirror).toBe(false);
    expect(result.match[0]).toBe(MODIFIER_MATCH.NO_MATCH);
    expect(result.match[1]).toBe(MODIFIER_MATCH.NO_MATCH);
  });

  it('should return EXACT_MATCH for identical products with no modifiers', () => {
    const productA = CreateWCPProduct('prod1', []);
    const productB = CreateWCPProduct('prod1', []);
    const product = createMockProduct({ id: 'prod1', modifiers: [] });
    const productEntry: CatalogProductEntry = { product, instances: ['pi1'] };

    const selectors = {
      productEntry: (id: string) => id === 'prod1' ? productEntry : undefined,
      modifierEntry: () => undefined,
    };

    const result = WProductCompare(productA, productB, selectors);

    expect(result.mirror).toBe(true);
    expect(result.match[0]).toBe(MODIFIER_MATCH.EXACT_MATCH);
    expect(result.match[1]).toBe(MODIFIER_MATCH.EXACT_MATCH);
  });
});

describe('WProductMetadataCompareProducts', () => {
  it('should compare products using metadata modifier maps', () => {
    const product = createMockProduct({ id: 'prod1', modifiers: [] });
    const metadataA: MetadataModifierMap = {};
    const metadataB: MetadataModifierMap = {};

    const selectors = {
      modifierEntry: () => undefined,
    };

    const result = WProductMetadataCompareProducts(product, metadataA, metadataB, selectors.modifierEntry);

    expect(result.mirror).toBe(true);
    expect(result.match[0]).toBe(MODIFIER_MATCH.EXACT_MATCH);
    expect(result.match[1]).toBe(MODIFIER_MATCH.EXACT_MATCH);
  });
});

describe('ComputePotentialPrices', () => {
  it('should compute potential prices for incomplete modifiers', () => {
    const metadata: WProductMetadata = {
      name: 'Test',
      description: '',
      shortname: 'T',
      pi: ['pi1', 'pi1'],
      is_split: false,
      price: { amount: 1000, currency: CURRENCY.USD },
      incomplete: true,
      modifier_map: {
        mt1: {
          has_selectable: true,
          meets_minimum: false,
          options: {
            opt1: { placement: OptionPlacement.NONE, qualifier: OptionQualifier.REGULAR, enable_left: { enable: DISABLE_REASON.ENABLED }, enable_right: { enable: DISABLE_REASON.ENABLED }, enable_whole: { enable: DISABLE_REASON.ENABLED } },
            opt2: { placement: OptionPlacement.NONE, qualifier: OptionQualifier.REGULAR, enable_left: { enable: DISABLE_REASON.ENABLED }, enable_right: { enable: DISABLE_REASON.ENABLED }, enable_whole: { enable: DISABLE_REASON.ENABLED } },
          },
        },
      },
      advanced_option_eligible: false,
      advanced_option_selected: false,
      additional_modifiers: { left: [], right: [], whole: [] },
      exhaustive_modifiers: { left: [], right: [], whole: [] },
      bake_count: [0, 0],
      flavor_count: [0, 0],
    };

    const selectors = createMockCatalogSelectorsFromArrays({
      options: [
        createMockOption({ id: 'opt1', modifierTypeId: 'mt1', price: { amount: 100, currency: CURRENCY.USD } }),
        createMockOption({ id: 'opt2', modifierTypeId: 'mt1', price: { amount: 200, currency: CURRENCY.USD } }),
      ],
      modifierTypes: [createMockOptionType({ id: 'mt1', min_selected: 1, max_selected: 1 })],
    });

    const prices = ComputePotentialPrices(metadata, selectors);

    // Base 1000 + option prices 100 and 200 = [1100, 1200]
    expect(prices).toEqual([
      { amount: 1100, currency: CURRENCY.USD },
      { amount: 1200, currency: CURRENCY.USD },
    ]);
  });

  it('should combine prices from multiple incomplete modifiers', () => {
    const metadata: WProductMetadata = {
      name: 'Test',
      description: '',
      shortname: 'T',
      pi: ['pi1', 'pi1'],
      is_split: false,
      price: { amount: 1000, currency: CURRENCY.USD },
      incomplete: true,
      modifier_map: {
        mt1: {
          has_selectable: true,
          meets_minimum: false,
          options: {
            opt1: { placement: OptionPlacement.NONE, qualifier: OptionQualifier.REGULAR, enable_left: { enable: DISABLE_REASON.ENABLED }, enable_right: { enable: DISABLE_REASON.ENABLED }, enable_whole: { enable: DISABLE_REASON.ENABLED } },
          },
        },
        mt2: {
          has_selectable: true,
          meets_minimum: false,
          options: {
            opt2: { placement: OptionPlacement.NONE, qualifier: OptionQualifier.REGULAR, enable_left: { enable: DISABLE_REASON.ENABLED }, enable_right: { enable: DISABLE_REASON.ENABLED }, enable_whole: { enable: DISABLE_REASON.ENABLED } },
          },
        },
      },
      advanced_option_eligible: false,
      advanced_option_selected: false,
      additional_modifiers: { left: [], right: [], whole: [] },
      exhaustive_modifiers: { left: [], right: [], whole: [] },
      bake_count: [0, 0],
      flavor_count: [0, 0],
    };

    const selectors = createMockCatalogSelectorsFromArrays({
      options: [
        createMockOption({ id: 'opt1', modifierTypeId: 'mt1', price: { amount: 100, currency: CURRENCY.USD } }),
        createMockOption({ id: 'opt2', modifierTypeId: 'mt2', price: { amount: 200, currency: CURRENCY.USD } }),
      ],
      modifierTypes: [
        createMockOptionType({ id: 'mt1', min_selected: 1, max_selected: 1 }),
        createMockOptionType({ id: 'mt2', min_selected: 1, max_selected: 1 }),
      ],
    });

    const prices = ComputePotentialPrices(metadata, selectors);

    // Base 1000 + opt1 100 + opt2 200 = 1300
    expect(prices).toEqual([
      { amount: 1300, currency: CURRENCY.USD },
    ]);
  });
});

describe('WProductDisplayOptions', () => {
  it('should return empty array when no modifiers', () => {
    const exhaustive_modifiers = { left: [], right: [], whole: [] };
    const selectors = createMockCatalogSelectorsFromArrays({});

    const result = WProductDisplayOptions(selectors, exhaustive_modifiers);

    expect(result).toEqual([]);
  });

  it('should format whole modifier options', () => {
    const exhaustive_modifiers = {
      left: [],
      right: [],
      whole: [['mt1', 'opt1'] as [string, string]],
    };

    const selectors = createMockCatalogSelectorsFromArrays({
      options: [createMockOption({ id: 'opt1', modifierTypeId: 'mt1', displayName: 'Extra Cheese' })],
      modifierTypes: [createMockOptionType({ id: 'mt1' })],
    });

    const result = WProductDisplayOptions(selectors, exhaustive_modifiers);

    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe('Whole');
    expect(result[0][1]).toBe('Extra Cheese');
  });

  it('should format left and right modifier options separately', () => {
    const exhaustive_modifiers = {
      left: [['mt1', 'opt1'] as [string, string]],
      right: [['mt1', 'opt2'] as [string, string]],
      whole: [],
    };

    const selectors = createMockCatalogSelectorsFromArrays({
      options: [
        createMockOption({ id: 'opt1', modifierTypeId: 'mt1', displayName: 'Pepperoni' }),
        createMockOption({ id: 'opt2', modifierTypeId: 'mt1', displayName: 'Mushrooms' }),
      ],
      modifierTypes: [createMockOptionType({ id: 'mt1' })],
    });
    const result = WProductDisplayOptions(selectors, exhaustive_modifiers);

    expect(result).toHaveLength(2);
    expect(result[0][0]).toBe('Left');
    expect(result[0][1]).toBe('Pepperoni');
    expect(result[1][0]).toBe('Right');
    expect(result[1][1]).toBe('Mushrooms');
  });

  it('should omit options with omit_from_name flag', () => {
    const exhaustive_modifiers = {
      left: [],
      right: [],
      whole: [['mt1', 'opt1'] as [string, string], ['mt1', 'opt2'] as [string, string]],
    };

    const selectors = createMockCatalogSelectorsFromArrays({
      options: [
        createMockOption({ id: 'opt1', modifierTypeId: 'mt1', displayName: 'Visible', displayFlags: { omit_from_name: false, omit_from_shortname: false } }),
        createMockOption({ id: 'opt2', modifierTypeId: 'mt1', displayName: 'Hidden', displayFlags: { omit_from_name: true, omit_from_shortname: false } }),
      ],
      modifierTypes: [createMockOptionType({ id: 'mt1' })],
    });

    const result = WProductDisplayOptions(selectors, exhaustive_modifiers);

    expect(result).toHaveLength(1);
    expect(result[0][1]).toBe('Visible');
  });
});
