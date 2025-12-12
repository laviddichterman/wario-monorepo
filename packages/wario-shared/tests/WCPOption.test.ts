/**
 * Tests for WCPOption module
 * 
 * Tests the option-related utility functions for:
 * - Display name formatting
 * - Option enable/disable logic based on bake/flavor limits
 * - Modifier type visibility rules
 */

import { describe, expect, it } from '@jest/globals';

import type { IOption, ProductInstanceModifierEntry } from '../src/lib/derived-types';
import { DISABLE_REASON, DISPLAY_AS, MODIFIER_CLASS, OptionPlacement, OptionQualifier } from '../src/lib/enums';
import {
  HandleOptionCurry,
  HandleOptionNameFilterOmitByName,
  HandleOptionNameNoFilter,
  IsModifierTypeVisible,
  IsOptionEnabled,
  ListModifierChoicesByDisplayName,
} from '../src/lib/objects/WCPOption';
import type { WCPProduct } from '../src/lib/types';

import {
  createMockCatalogSelectorsFromArrays,
  createMockOption,
  createMockOptionType,
  createMockProduct,
  createMockProductInstance,
} from './mocks';

// ============================================================================
// ListModifierChoicesByDisplayName Tests
// ============================================================================

describe('ListModifierChoicesByDisplayName', () => {
  const createOptionSelector = (options: IOption[]) =>
    (id: string) => options.find(o => o.id === id);

  it('should join two choices with "or"', () => {
    const options = [
      createMockOption({ id: 'opt1', displayName: 'Small' }),
      createMockOption({ id: 'opt2', displayName: 'Large' }),
    ];
    const modifierType = createMockOptionType({
      id: 'mt1',
      options: ['opt1', 'opt2'],
    });

    const result = ListModifierChoicesByDisplayName(modifierType, createOptionSelector(options));

    expect(result).toBe('Small or Large');
  });

  it('should join three+ choices with commas and "or"', () => {
    const options = [
      createMockOption({ id: 'opt1', displayName: 'Small' }),
      createMockOption({ id: 'opt2', displayName: 'Medium' }),
      createMockOption({ id: 'opt3', displayName: 'Large' }),
    ];
    const modifierType = createMockOptionType({
      id: 'mt1',
      options: ['opt1', 'opt2', 'opt3'],
    });

    const result = ListModifierChoicesByDisplayName(modifierType, createOptionSelector(options));

    expect(result).toBe('Small, Medium, or Large');
  });

  it('should handle single choice', () => {
    const options = [createMockOption({ id: 'opt1', displayName: 'Regular' })];
    const modifierType = createMockOptionType({
      id: 'mt1',
      options: ['opt1'],
    });

    const result = ListModifierChoicesByDisplayName(modifierType, createOptionSelector(options));

    expect(result).toBe('Regular');
  });

  it('should return "Undefined" for missing options', () => {
    const modifierType = createMockOptionType({
      id: 'mt1',
      options: ['missing_opt'],
    });

    const result = ListModifierChoicesByDisplayName(modifierType, () => undefined);

    expect(result).toBe('Undefined');
  });
});

// ============================================================================
// HandleOptionNameFilterOmitByName Tests
// ============================================================================

describe('HandleOptionNameFilterOmitByName', () => {
  const createOptionSelector = (options: IOption[]) =>
    (id: string) => options.find(o => o.id === id);

  it('should return display name when not omitted', () => {
    const option = createMockOption({
      id: 'opt1',
      displayName: 'Pepperoni',
      displayFlags: { omit_from_name: false, omit_from_shortname: false },
    });

    const result = HandleOptionNameFilterOmitByName(createOptionSelector([option]), 'opt1');

    expect(result).toBe('Pepperoni');
  });

  it('should return empty string when omit_from_name is true', () => {
    const option = createMockOption({
      id: 'opt1',
      displayName: 'Extra Cheese',
      displayFlags: { omit_from_name: true, omit_from_shortname: false },
    });

    const result = HandleOptionNameFilterOmitByName(createOptionSelector([option]), 'opt1');

    expect(result).toBe('');
  });

  it('should return empty string for non-existent option', () => {
    const result = HandleOptionNameFilterOmitByName(() => undefined, 'missing');

    expect(result).toBe('');
  });
});

// ============================================================================
// HandleOptionNameNoFilter Tests
// ============================================================================

describe('HandleOptionNameNoFilter', () => {
  const createOptionSelector = (options: IOption[]) =>
    (id: string) => options.find(o => o.id === id);

  it('should return display name regardless of omit flag', () => {
    const option = createMockOption({
      id: 'opt1',
      displayName: 'Extra Cheese',
      displayFlags: { omit_from_name: true, omit_from_shortname: true },
    });

    const result = HandleOptionNameNoFilter(createOptionSelector([option]), 'opt1');

    expect(result).toBe('Extra Cheese');
  });

  it('should return "Undefined" for missing option', () => {
    const result = HandleOptionNameNoFilter(() => undefined, 'missing');

    expect(result).toBe('Undefined');
  });
});

// ============================================================================
// HandleOptionCurry Tests
// ============================================================================

describe('HandleOptionCurry', () => {
  it('should return option display name for non-empty option ID', () => {
    const options = [createMockOption({ id: 'opt1', displayName: 'Pepperoni' })];
    const modifierTypes = [createMockOptionType({ id: 'mt1', options: ['opt1'] })];
    const selectors = createMockCatalogSelectorsFromArrays({ options, modifierTypes });

    const handler = HandleOptionCurry(selectors, HandleOptionNameNoFilter);
    const result = handler(['mt1', 'opt1']);

    expect(result).toBe('Pepperoni');
  });

  it('should return "Your choice of" text for YOUR_CHOICE_OF display mode', () => {
    const modifierTypes = [createMockOptionType({
      id: 'mt1',
      displayName: 'Toppings',
      options: [],
      displayFlags: {
        is3p: false,
        omit_section_if_no_available_options: false,
        omit_options_if_not_available: false,
        use_toggle_if_only_two_options: false,
        hidden: false,
        empty_display_as: DISPLAY_AS.YOUR_CHOICE_OF,
        modifier_class: MODIFIER_CLASS.ADD,
        template_string: '',
        multiple_item_separator: ', ',
        non_empty_group_prefix: '',
        non_empty_group_suffix: '',
      },
    })];
    const selectors = createMockCatalogSelectorsFromArrays({ modifierTypes, options: [] });

    const handler = HandleOptionCurry(selectors, HandleOptionNameNoFilter);
    const result = handler(['mt1', '']);

    expect(result).toBe('Your choice of Toppings');
  });

  it('should return list of choices for LIST_CHOICES display mode', () => {
    const options = [
      createMockOption({ id: 'opt1', displayName: 'Small' }),
      createMockOption({ id: 'opt2', displayName: 'Large' }),
    ];
    const modifierTypes = [createMockOptionType({
      id: 'mt1',
      options: ['opt1', 'opt2'],
      displayFlags: {
        is3p: false,
        omit_section_if_no_available_options: false,
        omit_options_if_not_available: false,
        use_toggle_if_only_two_options: false,
        hidden: false,
        empty_display_as: DISPLAY_AS.LIST_CHOICES,
        modifier_class: MODIFIER_CLASS.ADD,
        template_string: '',
        multiple_item_separator: ', ',
        non_empty_group_prefix: '',
        non_empty_group_suffix: '',
      },
    })];
    const selectors = createMockCatalogSelectorsFromArrays({ modifierTypes, options });

    const handler = HandleOptionCurry(selectors, HandleOptionNameNoFilter);
    const result = handler(['mt1', '']);

    expect(result).toBe('Small or Large');
  });
});

// ============================================================================
// IsModifierTypeVisible Tests
// ============================================================================

describe('IsModifierTypeVisible', () => {
  it('should return true for null modifier type', () => {
    expect(IsModifierTypeVisible(null, true)).toBe(true);
    expect(IsModifierTypeVisible(undefined, true)).toBe(true);
  });

  it('should return false when modifier type is hidden', () => {
    const modifierType = createMockOptionType({
      displayFlags: {
        is3p: false,
        omit_section_if_no_available_options: false,
        omit_options_if_not_available: false,
        use_toggle_if_only_two_options: false,
        hidden: true,
        empty_display_as: DISPLAY_AS.OMIT,
        modifier_class: MODIFIER_CLASS.ADD,
        template_string: '',
        multiple_item_separator: ', ',
        non_empty_group_prefix: '',
        non_empty_group_suffix: '',
      },
    });

    expect(IsModifierTypeVisible(modifierType, true)).toBe(false);
  });

  it('should return true when not hidden and has selectable options', () => {
    const modifierType = createMockOptionType({
      displayFlags: {
        is3p: false,
        omit_section_if_no_available_options: true,
        omit_options_if_not_available: false,
        use_toggle_if_only_two_options: false,
        hidden: false,
        empty_display_as: DISPLAY_AS.OMIT,
        modifier_class: MODIFIER_CLASS.ADD,
        template_string: '',
        multiple_item_separator: ', ',
        non_empty_group_prefix: '',
        non_empty_group_suffix: '',
      },
    });

    expect(IsModifierTypeVisible(modifierType, true)).toBe(true);
  });

  it('should return false when omit_section_if_no_available_options is true and no selectable', () => {
    const modifierType = createMockOptionType({
      displayFlags: {
        is3p: false,
        omit_section_if_no_available_options: true,
        omit_options_if_not_available: false,
        use_toggle_if_only_two_options: false,
        hidden: false,
        empty_display_as: DISPLAY_AS.OMIT,
        modifier_class: MODIFIER_CLASS.ADD,
        template_string: '',
        multiple_item_separator: ', ',
        non_empty_group_prefix: '',
        non_empty_group_suffix: '',
      },
    });

    expect(IsModifierTypeVisible(modifierType, false)).toBe(false);
  });

  it('should return true when omit_section_if_no_available_options is false even without selectable', () => {
    const modifierType = createMockOptionType({
      displayFlags: {
        is3p: false,
        omit_section_if_no_available_options: false,
        omit_options_if_not_available: false,
        use_toggle_if_only_two_options: false,
        hidden: false,
        empty_display_as: DISPLAY_AS.OMIT,
        modifier_class: MODIFIER_CLASS.ADD,
        template_string: '',
        multiple_item_separator: ', ',
        non_empty_group_prefix: '',
        non_empty_group_suffix: '',
      },
    });

    expect(IsModifierTypeVisible(modifierType, false)).toBe(true);
  });
});

// ============================================================================
// IsOptionEnabled Tests
// ============================================================================

describe('IsOptionEnabled', () => {
  const createTestCatalogSelectors = (
    productFlagsOverrides: Partial<{
      bake_max: number;
      flavor_max: number;
      bake_differential: number;
    }> = {},
  ) => {
    const product = createMockProduct({
      id: 'prod1',
      instances: ['pi1'],
      displayFlags: {
        is3p: false,
        show_name_of_base_product: true,
        singular_noun: 'pizza',
        flavor_max: productFlagsOverrides.flavor_max ?? 10,
        bake_max: productFlagsOverrides.bake_max ?? 10,
        bake_differential: productFlagsOverrides.bake_differential ?? 5,
        order_guide: { warnings: [], suggestions: [], errors: [] },
      },
    });
    const productInstance = createMockProductInstance({ id: 'pi1' });
    const options = [
      createMockOption({
        id: 'opt1',
        metadata: {
          bake_factor: 2,
          flavor_factor: 3,
          can_split: true,
          allowHeavy: false,
          allowLite: false,
          allowOTS: false,
        },
      }),
    ];
    const modifierTypes = [createMockOptionType({ id: 'mt1', options: ['opt1'] })];

    return {
      selectors: createMockCatalogSelectorsFromArrays({
        products: [product],
        productInstances: [productInstance],
        options,
        modifierTypes,
      }),
      option: options[0],
    };
  };

  it('should return ENABLED when all constraints pass', () => {
    const { selectors, option } = createTestCatalogSelectors();
    const wcpProduct: WCPProduct = { productId: 'prod1', modifiers: [] };

    const result = IsOptionEnabled(
      'mt1',
      option,
      wcpProduct,
      [0, 0], // bake_count
      [0, 0], // flavor_count
      OptionPlacement.WHOLE,
      selectors,
    );

    expect(result.enable).toBe(DISABLE_REASON.ENABLED);
  });

  it('should return DISABLED_WEIGHT when bake limit would be exceeded', () => {
    const { selectors, option } = createTestCatalogSelectors({ bake_max: 1 });
    const wcpProduct: WCPProduct = { productId: 'prod1', modifiers: [] };

    const result = IsOptionEnabled(
      'mt1',
      option,
      wcpProduct,
      [0, 0],
      [0, 0],
      OptionPlacement.WHOLE,
      selectors,
    );

    expect(result.enable).toBe(DISABLE_REASON.DISABLED_WEIGHT);
  });

  it('should return DISABLED_FLAVORS when flavor limit would be exceeded', () => {
    const { selectors, option } = createTestCatalogSelectors({ flavor_max: 1 });
    const wcpProduct: WCPProduct = { productId: 'prod1', modifiers: [] };

    const result = IsOptionEnabled(
      'mt1',
      option,
      wcpProduct,
      [0, 0],
      [0, 0],
      OptionPlacement.WHOLE,
      selectors,
    );

    expect(result.enable).toBe(DISABLE_REASON.DISABLED_FLAVORS);
  });

  it('should return DISABLED_SPLIT_DIFFERENTIAL when split differential exceeded', () => {
    const { selectors, option } = createTestCatalogSelectors({ bake_differential: 0 });
    const wcpProduct: WCPProduct = { productId: 'prod1', modifiers: [] };

    // Add option to LEFT only - differential will be 2 (bake factor)
    const result = IsOptionEnabled(
      'mt1',
      option,
      wcpProduct,
      [0, 0],
      [0, 0],
      OptionPlacement.LEFT,
      selectors,
    );

    expect(result.enable).toBe(DISABLE_REASON.DISABLED_SPLIT_DIFFERENTIAL);
  });

  it('should handle option already placed on one side', () => {
    const { selectors, option } = createTestCatalogSelectors({ bake_max: 10 });
    const modifiers: ProductInstanceModifierEntry[] = [{
      modifierTypeId: 'mt1',
      options: [{
        optionId: 'opt1',
        placement: OptionPlacement.LEFT,
        qualifier: OptionQualifier.REGULAR,
      }],
    }];
    const wcpProduct: WCPProduct = { productId: 'prod1', modifiers };

    // Attempt to also add to RIGHT - should work since we're within limits
    const result = IsOptionEnabled(
      'mt1',
      option,
      wcpProduct,
      [2, 0], // Current bake from LEFT placement
      [3, 0], // Current flavor from LEFT placement
      OptionPlacement.RIGHT,
      selectors,
    );

    expect(result.enable).toBe(DISABLE_REASON.ENABLED);
  });
});
