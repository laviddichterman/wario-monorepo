/**
 * Comprehensive Mock Catalog for Testing
 *
 * This file provides a complete, interconnected mock catalog that exercises
 * all major code paths in the wario-shared catalog codebase, targeting 95%+ coverage.
 *
 * @example
 * ```typescript
 * import {
 *   MOCK_CATALOG,
 *   getMockCatalogSelectors,
 *   BASIC_PIZZA_PRODUCT,
 *   TOPPINGS_MODIFIER_TYPE
 * } from '@wcp/wario-shared/testing';
 * ```
 */

import type {
  CatalogCategoryEntry,
  CatalogModifierEntry,
  CatalogProductEntry,
  ICatalog,
  ICategory,
  IOption,
  IOptionType,
  IProduct,
  IProductInstance,
  IProductInstanceFunction,
  OrderInstanceFunction,
  ProductModifierEntry,
  RecordOrderInstanceFunctions,
  RecordProductInstanceFunctions,
} from '../src/lib/derived-types';
import {
  CALL_LINE_DISPLAY,
  CategoryDisplay,
  ConstLiteralDiscriminator,
  CURRENCY,
  DISPLAY_AS,
  LogicalFunctionOperator,
  MODIFIER_CLASS,
  OptionPlacement,
  OptionQualifier,
  OrderInstanceFunctionType,
  PriceDisplay,
  ProductInstanceFunctionType,
} from '../src/lib/enums';
import { CatalogGenerator, ICatalogSelectorWrapper } from '../src/lib/objects/ICatalog';
import type { ICatalogSelectors } from '../src/lib/types';

// ============================================================================
// IDs - Central Registry
// ============================================================================

export const MOCK_IDS = {
  // Categories
  ROOT_CATEGORY: 'cat_root',
  PIZZA_CATEGORY: 'cat_pizza',
  DRINKS_CATEGORY: 'cat_drinks',
  DISABLED_CATEGORY: 'cat_disabled',
  NESTED_CHILD_CATEGORY: 'cat_nested',
  TIME_DISABLED_CATEGORY: 'cat_time_disabled',

  // Modifier Types
  SIZE_MT: 'mt_size',
  TOPPINGS_MT: 'mt_toppings',
  CRUST_MT: 'mt_crust',
  SAUCE_MT: 'mt_sauce',
  REMOVAL_MT: 'mt_removal',

  // Options - Size
  SIZE_SMALL: 'opt_size_small',
  SIZE_MEDIUM: 'opt_size_medium',
  SIZE_LARGE: 'opt_size_large',

  // Options - Toppings
  TOPPING_PEPPERONI: 'opt_pepperoni',
  TOPPING_MUSHROOMS: 'opt_mushrooms',
  TOPPING_OLIVES: 'opt_olives',
  TOPPING_EXTRA_CHEESE: 'opt_extra_cheese',
  TOPPING_DISABLED: 'opt_topping_disabled',
  TOPPING_TIME_LIMITED: 'opt_topping_time_limited',

  // Options - Crust
  CRUST_THIN: 'opt_crust_thin',
  CRUST_THICK: 'opt_crust_thick',
  CRUST_STUFFED: 'opt_crust_stuffed',

  // Options - Sauce
  SAUCE_MARINARA: 'opt_sauce_marinara',
  SAUCE_ALFREDO: 'opt_sauce_alfredo',

  // Options - Removal
  REMOVAL_NO_CHEESE: 'opt_no_cheese',
  REMOVAL_NO_SAUCE: 'opt_no_sauce',

  // Products
  BASIC_PIZZA: 'prod_basic_pizza',
  COMPLEX_PIZZA: 'prod_complex_pizza',
  SPLIT_PIZZA: 'prod_split_pizza',
  DISABLED_PRODUCT: 'prod_disabled',

  // Product Instances
  PI_PLAIN_CHEESE: 'pi_plain_cheese',
  PI_PEPPERONI: 'pi_pepperoni',
  PI_COMPLEX_BASE: 'pi_complex_base',
  PI_COMPLEX_THIN_CRUST: 'pi_complex_thin',
  PI_COMPLEX_STUFFED: 'pi_complex_stuffed',
  PI_SPLIT_BASE: 'pi_split_base',
  PI_SPLIT_HALF_PEPPERONI: 'pi_split_half_pep',
  PI_DISABLED_BASE: 'pi_disabled_base',

  // Functions
  FUNC_CRUST_ENABLES_SAUCE: 'func_crust_enables_sauce',
  FUNC_HAS_ANY_TOPPINGS: 'func_has_any_toppings',
  FUNC_FLAVOR_CHECK: 'func_flavor_check',
  FUNC_ORDER_SIZE_CHECK: 'func_order_size_check',
  FUNC_ORDER_QUANTITY_CHECK: 'func_order_qty_check',

  // Order Guide Functions (return string or false)
  FUNC_WARN_HIGH_TOPPINGS: 'func_warn_high_toppings',
  FUNC_SUGGEST_GARLIC_BREAD: 'func_suggest_garlic_bread',

  // Fulfillments
  FULFILLMENT_PICKUP: 'pickup',
  FULFILLMENT_DELIVERY: 'delivery',
  FULFILLMENT_DINEIN: 'dinein',
} as const;

// ============================================================================
// Categories
// ============================================================================

export const ROOT_CATEGORY: ICategory = {
  id: MOCK_IDS.ROOT_CATEGORY,
  name: 'Menu',
  description: 'Root menu category',
  subheading: null,
  footnotes: null,
  parent_id: null,
  ordinal: 0,
  serviceDisable: [],
  display_flags: {
    nesting: CategoryDisplay.FLAT,
    call_line_name: 'MENU',
    call_line_display: CALL_LINE_DISPLAY.SHORTCODE,
  },
};

export const PIZZA_CATEGORY: ICategory = {
  id: MOCK_IDS.PIZZA_CATEGORY,
  name: 'Pizza',
  description: 'Delicious pizzas',
  subheading: 'Build your perfect pie',
  footnotes: null,
  parent_id: MOCK_IDS.ROOT_CATEGORY,
  ordinal: 1,
  serviceDisable: [],
  display_flags: {
    nesting: CategoryDisplay.TAB,
    call_line_name: 'PIZ',
    call_line_display: CALL_LINE_DISPLAY.SHORTNAME,
  },
};

export const DRINKS_CATEGORY: ICategory = {
  id: MOCK_IDS.DRINKS_CATEGORY,
  name: 'Drinks',
  description: 'Refreshing beverages',
  subheading: null,
  footnotes: null,
  parent_id: MOCK_IDS.ROOT_CATEGORY,
  ordinal: 2,
  serviceDisable: [],
  display_flags: {
    nesting: CategoryDisplay.FLAT,
    call_line_name: 'DRK',
    call_line_display: CALL_LINE_DISPLAY.QUANTITY,
  },
};

export const DISABLED_CATEGORY: ICategory = {
  id: MOCK_IDS.DISABLED_CATEGORY,
  name: 'Disabled Category',
  description: 'Category disabled for pickup',
  subheading: null,
  footnotes: null,
  parent_id: MOCK_IDS.ROOT_CATEGORY,
  ordinal: 99,
  serviceDisable: [MOCK_IDS.FULFILLMENT_PICKUP],
  display_flags: {
    nesting: CategoryDisplay.FLAT,
    call_line_name: '',
    call_line_display: CALL_LINE_DISPLAY.SHORTCODE,
  },
};

export const NESTED_CHILD_CATEGORY: ICategory = {
  id: MOCK_IDS.NESTED_CHILD_CATEGORY,
  name: 'Specialty Pizzas',
  description: 'Premium pizza selections',
  subheading: null,
  footnotes: null,
  parent_id: MOCK_IDS.PIZZA_CATEGORY,
  ordinal: 10,
  serviceDisable: [],
  display_flags: {
    nesting: CategoryDisplay.ACCORDION,
    call_line_name: 'SPE',
    call_line_display: CALL_LINE_DISPLAY.SHORTCODE,
  },
};

export const TIME_DISABLED_CATEGORY: ICategory = {
  id: MOCK_IDS.TIME_DISABLED_CATEGORY,
  name: 'Lunch Specials',
  description: 'Only available during lunch',
  subheading: null,
  footnotes: null,
  parent_id: MOCK_IDS.ROOT_CATEGORY,
  ordinal: 50,
  serviceDisable: [],
  display_flags: {
    nesting: CategoryDisplay.FLAT,
    call_line_name: 'LCH',
    call_line_display: CALL_LINE_DISPLAY.SHORTCODE,
  },
};

export const ALL_CATEGORIES: ICategory[] = [
  ROOT_CATEGORY,
  PIZZA_CATEGORY,
  DRINKS_CATEGORY,
  DISABLED_CATEGORY,
  NESTED_CHILD_CATEGORY,
  TIME_DISABLED_CATEGORY,
];

// ============================================================================
// Modifier Types (Option Types)
// ============================================================================

export const SIZE_MODIFIER_TYPE: IOptionType = {
  id: MOCK_IDS.SIZE_MT,
  name: 'Size',
  displayName: 'Choose Your Size',
  externalIDs: [],
  ordinal: 0,
  min_selected: 1,
  max_selected: 1,
  displayFlags: {
    is3p: false,
    omit_section_if_no_available_options: false,
    omit_options_if_not_available: false,
    use_toggle_if_only_two_options: false,
    hidden: false,
    empty_display_as: DISPLAY_AS.YOUR_CHOICE_OF,
    modifier_class: MODIFIER_CLASS.SIZE,
    template_string: '',
    multiple_item_separator: ', ',
    non_empty_group_prefix: '',
    non_empty_group_suffix: '',
  },
};

export const TOPPINGS_MODIFIER_TYPE: IOptionType = {
  id: MOCK_IDS.TOPPINGS_MT,
  name: 'Toppings',
  displayName: 'Add Toppings',
  externalIDs: [],
  ordinal: 1,
  min_selected: 0,
  max_selected: 5,
  displayFlags: {
    is3p: false,
    omit_section_if_no_available_options: false,
    omit_options_if_not_available: true,
    use_toggle_if_only_two_options: false,
    hidden: false,
    empty_display_as: DISPLAY_AS.OMIT,
    modifier_class: MODIFIER_CLASS.ADD,
    template_string: '',
    multiple_item_separator: ' + ',
    non_empty_group_prefix: 'with ',
    non_empty_group_suffix: '',
  },
};

export const CRUST_MODIFIER_TYPE: IOptionType = {
  id: MOCK_IDS.CRUST_MT,
  name: 'Crust',
  displayName: 'Select Crust',
  externalIDs: [],
  ordinal: 2,
  min_selected: 1,
  max_selected: 1,
  displayFlags: {
    is3p: false,
    omit_section_if_no_available_options: false,
    omit_options_if_not_available: false,
    use_toggle_if_only_two_options: true,
    hidden: false,
    empty_display_as: DISPLAY_AS.LIST_CHOICES,
    modifier_class: MODIFIER_CLASS.SIZE,
    template_string: 'Crust', // For product name templating
    multiple_item_separator: ', ',
    non_empty_group_prefix: '',
    non_empty_group_suffix: ' crust',
  },
};

export const SAUCE_MODIFIER_TYPE: IOptionType = {
  id: MOCK_IDS.SAUCE_MT,
  name: 'Sauce',
  displayName: 'Choose Sauce',
  externalIDs: [],
  ordinal: 3,
  min_selected: 0,
  max_selected: 2,
  displayFlags: {
    is3p: false,
    omit_section_if_no_available_options: true,
    omit_options_if_not_available: false,
    use_toggle_if_only_two_options: false,
    hidden: false,
    empty_display_as: DISPLAY_AS.OMIT,
    modifier_class: MODIFIER_CLASS.ADD,
    template_string: '',
    multiple_item_separator: ' & ',
    non_empty_group_prefix: '',
    non_empty_group_suffix: '',
  },
};

export const REMOVAL_MODIFIER_TYPE: IOptionType = {
  id: MOCK_IDS.REMOVAL_MT,
  name: 'Removals',
  displayName: 'Remove Items',
  externalIDs: [],
  ordinal: 10,
  min_selected: 0,
  max_selected: 5,
  displayFlags: {
    is3p: false,
    omit_section_if_no_available_options: false,
    omit_options_if_not_available: false,
    use_toggle_if_only_two_options: false,
    hidden: false,
    empty_display_as: DISPLAY_AS.OMIT,
    modifier_class: MODIFIER_CLASS.REMOVAL,
    template_string: '',
    multiple_item_separator: ', ',
    non_empty_group_prefix: 'NO ',
    non_empty_group_suffix: '',
  },
};

export const ALL_MODIFIER_TYPES: IOptionType[] = [
  SIZE_MODIFIER_TYPE,
  TOPPINGS_MODIFIER_TYPE,
  CRUST_MODIFIER_TYPE,
  SAUCE_MODIFIER_TYPE,
  REMOVAL_MODIFIER_TYPE,
];

// ============================================================================
// Options
// ============================================================================

// Size Options
export const OPTION_SIZE_SMALL: IOption = {
  id: MOCK_IDS.SIZE_SMALL,
  modifierTypeId: MOCK_IDS.SIZE_MT,
  displayName: 'Small (10")',
  shortcode: 'SM',
  enable: null,
  description: 'Perfect for one',
  ordinal: 0,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: 0, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 0,
    bake_factor: 0,
    can_split: false,
    allowHeavy: false,
    allowLite: false,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

export const OPTION_SIZE_MEDIUM: IOption = {
  id: MOCK_IDS.SIZE_MEDIUM,
  modifierTypeId: MOCK_IDS.SIZE_MT,
  displayName: 'Medium (12")',
  shortcode: 'MD',
  enable: null,
  description: 'Great for sharing',
  ordinal: 1,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: 300, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 0,
    bake_factor: 0,
    can_split: true,
    allowHeavy: false,
    allowLite: false,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

export const OPTION_SIZE_LARGE: IOption = {
  id: MOCK_IDS.SIZE_LARGE,
  modifierTypeId: MOCK_IDS.SIZE_MT,
  displayName: 'Large (14")',
  shortcode: 'LG',
  enable: null,
  description: 'Party size',
  ordinal: 2,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: 600, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 0,
    bake_factor: 0,
    can_split: true,
    allowHeavy: false,
    allowLite: false,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

// Topping Options
export const OPTION_TOPPING_PEPPERONI: IOption = {
  id: MOCK_IDS.TOPPING_PEPPERONI,
  modifierTypeId: MOCK_IDS.TOPPINGS_MT,
  displayName: 'Pepperoni',
  shortcode: 'PEP',
  enable: null,
  description: 'Classic pepperoni',
  ordinal: 0,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: 150, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 2,
    bake_factor: 1,
    can_split: true,
    allowHeavy: true,
    allowLite: true,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

export const OPTION_TOPPING_MUSHROOMS: IOption = {
  id: MOCK_IDS.TOPPING_MUSHROOMS,
  modifierTypeId: MOCK_IDS.TOPPINGS_MT,
  displayName: 'Mushrooms',
  shortcode: 'MSH',
  enable: null,
  description: 'Fresh sliced mushrooms',
  ordinal: 1,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: 100, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 1,
    bake_factor: 1,
    can_split: true,
    allowHeavy: true,
    allowLite: true,
    allowOTS: true,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

export const OPTION_TOPPING_OLIVES: IOption = {
  id: MOCK_IDS.TOPPING_OLIVES,
  modifierTypeId: MOCK_IDS.TOPPINGS_MT,
  displayName: 'Black Olives',
  shortcode: 'OLV',
  enable: null,
  description: 'Sliced black olives',
  ordinal: 2,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: 100, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 1,
    bake_factor: 0,
    can_split: true,
    allowHeavy: false,
    allowLite: true,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: true, // Omit from shortname for testing
  },
};

export const OPTION_TOPPING_EXTRA_CHEESE: IOption = {
  id: MOCK_IDS.TOPPING_EXTRA_CHEESE,
  modifierTypeId: MOCK_IDS.TOPPINGS_MT,
  displayName: 'Extra Cheese',
  shortcode: 'XCH',
  enable: null,
  description: 'Double the cheese',
  ordinal: 3,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: 200, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 3,
    bake_factor: 2,
    can_split: true,
    allowHeavy: true,
    allowLite: false,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: true, // Omit from name for testing
    omit_from_shortname: false,
  },
};

export const OPTION_TOPPING_DISABLED: IOption = {
  id: MOCK_IDS.TOPPING_DISABLED,
  modifierTypeId: MOCK_IDS.TOPPINGS_MT,
  displayName: 'Truffle (Seasonal)',
  shortcode: 'TRF',
  enable: null,
  description: 'Seasonal truffle shavings',
  ordinal: 10,
  externalIDs: [],
  disabled: { start: 1, end: 0 }, // Blanket disabled (start > end)
  availability: [],
  price: { amount: 500, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 5,
    bake_factor: 0,
    can_split: true,
    allowHeavy: false,
    allowLite: false,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

export const OPTION_TOPPING_TIME_LIMITED: IOption = {
  id: MOCK_IDS.TOPPING_TIME_LIMITED,
  modifierTypeId: MOCK_IDS.TOPPINGS_MT,
  displayName: 'Lunch Special Topping',
  shortcode: 'LST',
  enable: null,
  description: 'Available 11am-2pm',
  ordinal: 11,
  externalIDs: [],
  disabled: null,
  availability: [
    // Monday-Friday 11am-2pm using rrule format
    // rrule format: FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
    {
      interval: { start: 660, end: 840 }, // 11:00am (660 mins) to 2:00pm (840 mins)
      rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    },
  ],
  price: { amount: 50, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 1,
    bake_factor: 0,
    can_split: false, // No splitting allowed
    allowHeavy: false,
    allowLite: false,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

// Crust Options
export const OPTION_CRUST_THIN: IOption = {
  id: MOCK_IDS.CRUST_THIN,
  modifierTypeId: MOCK_IDS.CRUST_MT,
  displayName: 'Thin Crust',
  shortcode: 'THN',
  enable: null,
  description: 'Crispy thin crust',
  ordinal: 0,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: 0, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 0,
    bake_factor: 0,
    can_split: false,
    allowHeavy: false,
    allowLite: false,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

export const OPTION_CRUST_THICK: IOption = {
  id: MOCK_IDS.CRUST_THICK,
  modifierTypeId: MOCK_IDS.CRUST_MT,
  displayName: 'Thick Crust',
  shortcode: 'THK',
  enable: null,
  description: 'Traditional thick crust',
  ordinal: 1,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: 100, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 0,
    bake_factor: 1,
    can_split: false,
    allowHeavy: false,
    allowLite: false,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

export const OPTION_CRUST_STUFFED: IOption = {
  id: MOCK_IDS.CRUST_STUFFED,
  modifierTypeId: MOCK_IDS.CRUST_MT,
  displayName: 'Stuffed Crust',
  shortcode: 'STF',
  enable: null,
  description: 'Cheese-stuffed crust',
  ordinal: 2,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: 250, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 1,
    bake_factor: 2,
    can_split: false,
    allowHeavy: false,
    allowLite: false,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

// Sauce Options
export const OPTION_SAUCE_MARINARA: IOption = {
  id: MOCK_IDS.SAUCE_MARINARA,
  modifierTypeId: MOCK_IDS.SAUCE_MT,
  displayName: 'Marinara',
  shortcode: 'MAR',
  enable: null,
  description: 'Classic marinara sauce',
  ordinal: 0,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: 0, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 1,
    bake_factor: 0,
    can_split: true,
    allowHeavy: true,
    allowLite: true,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

export const OPTION_SAUCE_ALFREDO: IOption = {
  id: MOCK_IDS.SAUCE_ALFREDO,
  modifierTypeId: MOCK_IDS.SAUCE_MT,
  displayName: 'Alfredo',
  shortcode: 'ALF',
  enable: null,
  description: 'Creamy alfredo sauce',
  ordinal: 1,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: 100, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: 2,
    bake_factor: 0,
    can_split: true,
    allowHeavy: false,
    allowLite: true,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

// Removal Options
export const OPTION_REMOVAL_NO_CHEESE: IOption = {
  id: MOCK_IDS.REMOVAL_NO_CHEESE,
  modifierTypeId: MOCK_IDS.REMOVAL_MT,
  displayName: 'Cheese',
  shortcode: 'NCH',
  enable: null,
  description: 'Remove cheese',
  ordinal: 0,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: -100, currency: CURRENCY.USD }, // Negative price for removal
  metadata: {
    flavor_factor: -2,
    bake_factor: 0,
    can_split: true,
    allowHeavy: false,
    allowLite: false,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

export const OPTION_REMOVAL_NO_SAUCE: IOption = {
  id: MOCK_IDS.REMOVAL_NO_SAUCE,
  modifierTypeId: MOCK_IDS.REMOVAL_MT,
  displayName: 'Sauce',
  shortcode: 'NSC',
  enable: null,
  description: 'Remove sauce',
  ordinal: 1,
  externalIDs: [],
  disabled: null,
  availability: [],
  price: { amount: 0, currency: CURRENCY.USD },
  metadata: {
    flavor_factor: -1,
    bake_factor: 0,
    can_split: true,
    allowHeavy: false,
    allowLite: false,
    allowOTS: false,
  },
  displayFlags: {
    omit_from_name: false,
    omit_from_shortname: false,
  },
};

export const ALL_OPTIONS: IOption[] = [
  OPTION_SIZE_SMALL,
  OPTION_SIZE_MEDIUM,
  OPTION_SIZE_LARGE,
  OPTION_TOPPING_PEPPERONI,
  OPTION_TOPPING_MUSHROOMS,
  OPTION_TOPPING_OLIVES,
  OPTION_TOPPING_EXTRA_CHEESE,
  OPTION_TOPPING_DISABLED,
  OPTION_TOPPING_TIME_LIMITED,
  OPTION_CRUST_THIN,
  OPTION_CRUST_THICK,
  OPTION_CRUST_STUFFED,
  OPTION_SAUCE_MARINARA,
  OPTION_SAUCE_ALFREDO,
  OPTION_REMOVAL_NO_CHEESE,
  OPTION_REMOVAL_NO_SAUCE,
];

// ============================================================================
// Product Instance Functions
// ============================================================================

export const FUNC_CRUST_ENABLES_SAUCE: IProductInstanceFunction = {
  id: MOCK_IDS.FUNC_CRUST_ENABLES_SAUCE,
  name: 'Crust Enables Sauce',
  expression: {
    discriminator: ProductInstanceFunctionType.IfElse,
    expr: {
      test: {
        discriminator: ProductInstanceFunctionType.Logical,
        expr: {
          operator: LogicalFunctionOperator.NE,
          operandA: {
            discriminator: ProductInstanceFunctionType.ModifierPlacement,
            expr: { mtid: MOCK_IDS.CRUST_MT, moid: MOCK_IDS.CRUST_STUFFED },
          },
          operandB: {
            discriminator: ProductInstanceFunctionType.ConstLiteral,
            expr: { discriminator: ConstLiteralDiscriminator.MODIFIER_PLACEMENT, value: OptionPlacement.WHOLE },
          },
        },
      },
      true_branch: {
        discriminator: ProductInstanceFunctionType.ConstLiteral,
        expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true },
      },
      false_branch: {
        discriminator: ProductInstanceFunctionType.ConstLiteral,
        expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: false },
      },
    },
  },
};

export const FUNC_HAS_ANY_TOPPINGS: IProductInstanceFunction = {
  id: MOCK_IDS.FUNC_HAS_ANY_TOPPINGS,
  name: 'Has Any Toppings',
  expression: {
    discriminator: ProductInstanceFunctionType.HasAnyOfModifierType,
    expr: { mtid: MOCK_IDS.TOPPINGS_MT },
  },
};

export const FUNC_FLAVOR_CHECK: IProductInstanceFunction = {
  id: MOCK_IDS.FUNC_FLAVOR_CHECK,
  name: 'Flavor Limit Check',
  expression: {
    discriminator: ProductInstanceFunctionType.Logical,
    expr: {
      operator: LogicalFunctionOperator.LT,
      operandA: {
        discriminator: ProductInstanceFunctionType.ProductMetadata,
        expr: { field: 0, location: 0 }, // FLAVOR, LEFT
      },
      operandB: {
        discriminator: ProductInstanceFunctionType.ConstLiteral,
        expr: { discriminator: ConstLiteralDiscriminator.NUMBER, value: 10 },
      },
    },
  },
};

/**
 * Order guide warning function: returns warning string if product has 3+ toppings, otherwise false
 */
export const FUNC_WARN_HIGH_TOPPINGS: IProductInstanceFunction = {
  id: MOCK_IDS.FUNC_WARN_HIGH_TOPPINGS,
  name: 'Warn High Toppings',
  expression: {
    discriminator: ProductInstanceFunctionType.IfElse,
    expr: {
      test: {
        discriminator: ProductInstanceFunctionType.Logical,
        expr: {
          operator: LogicalFunctionOperator.GE,
          operandA: {
            discriminator: ProductInstanceFunctionType.ProductMetadata,
            expr: { field: 0, location: 0 }, // FLAVOR, LEFT
          },
          operandB: {
            discriminator: ProductInstanceFunctionType.ConstLiteral,
            expr: { discriminator: ConstLiteralDiscriminator.NUMBER, value: 5 },
          },
        },
      },
      true_branch: {
        discriminator: ProductInstanceFunctionType.ConstLiteral,
        expr: { discriminator: ConstLiteralDiscriminator.STRING, value: 'High topping count may affect bake quality' },
      },
      false_branch: {
        discriminator: ProductInstanceFunctionType.ConstLiteral,
        expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: false },
      },
    },
  },
};

/**
 * Order guide suggestion function: returns suggestion if product has thin crust, otherwise false
 */
export const FUNC_SUGGEST_GARLIC_BREAD: IProductInstanceFunction = {
  id: MOCK_IDS.FUNC_SUGGEST_GARLIC_BREAD,
  name: 'Suggest Garlic Bread',
  expression: {
    discriminator: ProductInstanceFunctionType.IfElse,
    expr: {
      test: {
        discriminator: ProductInstanceFunctionType.Logical,
        expr: {
          operator: LogicalFunctionOperator.EQ,
          operandA: {
            discriminator: ProductInstanceFunctionType.ModifierPlacement,
            expr: { mtid: MOCK_IDS.CRUST_MT, moid: MOCK_IDS.CRUST_THIN },
          },
          operandB: {
            discriminator: ProductInstanceFunctionType.ConstLiteral,
            expr: { discriminator: ConstLiteralDiscriminator.MODIFIER_PLACEMENT, value: OptionPlacement.WHOLE },
          },
        },
      },
      true_branch: {
        discriminator: ProductInstanceFunctionType.ConstLiteral,
        expr: { discriminator: ConstLiteralDiscriminator.STRING, value: 'Pairs great with garlic bread' },
      },
      false_branch: {
        discriminator: ProductInstanceFunctionType.ConstLiteral,
        expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: false },
      },
    },
  },
};

export const ALL_PRODUCT_INSTANCE_FUNCTIONS: IProductInstanceFunction[] = [
  FUNC_CRUST_ENABLES_SAUCE,
  FUNC_HAS_ANY_TOPPINGS,
  FUNC_FLAVOR_CHECK,
  FUNC_WARN_HIGH_TOPPINGS,
  FUNC_SUGGEST_GARLIC_BREAD,
];

// ============================================================================
// Order Instance Functions
// ============================================================================

export const FUNC_ORDER_SIZE_CHECK: OrderInstanceFunction = {
  id: MOCK_IDS.FUNC_ORDER_SIZE_CHECK,
  name: 'Order Size Check',
  expression: {
    discriminator: OrderInstanceFunctionType.Logical,
    expr: {
      operator: LogicalFunctionOperator.AND,
      operandA: {
        discriminator: OrderInstanceFunctionType.ConstLiteral,
        expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true },
      },
      operandB: {
        discriminator: OrderInstanceFunctionType.ConstLiteral,
        expr: { discriminator: ConstLiteralDiscriminator.BOOLEAN, value: true },
      },
    },
  },
};

export const FUNC_ORDER_QUANTITY_CHECK: OrderInstanceFunction = {
  id: MOCK_IDS.FUNC_ORDER_QUANTITY_CHECK,
  name: 'Order Quantity Check',
  expression: {
    discriminator: OrderInstanceFunctionType.IfElse,
    expr: {
      test: {
        discriminator: OrderInstanceFunctionType.Logical,
        expr: {
          operator: LogicalFunctionOperator.GT,
          operandA: {
            discriminator: OrderInstanceFunctionType.ConstLiteral,
            expr: { discriminator: ConstLiteralDiscriminator.NUMBER, value: 5 },
          },
          operandB: {
            discriminator: OrderInstanceFunctionType.ConstLiteral,
            expr: { discriminator: ConstLiteralDiscriminator.NUMBER, value: 3 },
          },
        },
      },
      true_branch: {
        discriminator: OrderInstanceFunctionType.ConstLiteral,
        expr: { discriminator: ConstLiteralDiscriminator.STRING, value: 'large order' },
      },
      false_branch: {
        discriminator: OrderInstanceFunctionType.ConstLiteral,
        expr: { discriminator: ConstLiteralDiscriminator.STRING, value: 'small order' },
      },
    },
  },
};

export const ALL_ORDER_INSTANCE_FUNCTIONS: OrderInstanceFunction[] = [FUNC_ORDER_SIZE_CHECK, FUNC_ORDER_QUANTITY_CHECK];

// ============================================================================
// Products
// ============================================================================

export const BASIC_PIZZA_PRODUCT: IProduct = {
  id: MOCK_IDS.BASIC_PIZZA,
  serviceDisable: [],
  disabled: null,
  availability: [],
  externalIDs: [],
  modifiers: [
    { mtid: MOCK_IDS.SIZE_MT, enable: null, serviceDisable: [] },
    { mtid: MOCK_IDS.TOPPINGS_MT, enable: null, serviceDisable: [] },
  ],
  baseProductId: MOCK_IDS.PI_PLAIN_CHEESE,
  category_ids: [MOCK_IDS.PIZZA_CATEGORY],
  printerGroup: null,
  price: { amount: 1000, currency: CURRENCY.USD },
  displayFlags: {
    is3p: false,
    show_name_of_base_product: true,
    singular_noun: 'pizza',
    flavor_max: 10,
    bake_max: 10,
    bake_differential: 2,
    order_guide: { warnings: [], suggestions: [] },
  },
  timing: { prepTime: 15, additionalUnitPrepTime: 5, prepStationId: 1 },
};

export const COMPLEX_PIZZA_PRODUCT: IProduct = {
  id: MOCK_IDS.COMPLEX_PIZZA,
  serviceDisable: [],
  disabled: null,
  availability: [],
  externalIDs: [],
  modifiers: [
    { mtid: MOCK_IDS.SIZE_MT, enable: null, serviceDisable: [] },
    { mtid: MOCK_IDS.CRUST_MT, enable: null, serviceDisable: [] },
    { mtid: MOCK_IDS.SAUCE_MT, enable: MOCK_IDS.FUNC_CRUST_ENABLES_SAUCE, serviceDisable: [] },
    { mtid: MOCK_IDS.TOPPINGS_MT, enable: null, serviceDisable: [] },
    { mtid: MOCK_IDS.REMOVAL_MT, enable: null, serviceDisable: [MOCK_IDS.FULFILLMENT_DELIVERY] },
  ],
  baseProductId: MOCK_IDS.PI_COMPLEX_BASE,
  category_ids: [MOCK_IDS.PIZZA_CATEGORY],
  printerGroup: 'printer_group_1',
  price: { amount: 1200, currency: CURRENCY.USD },
  displayFlags: {
    is3p: false,
    show_name_of_base_product: false, // Test base product edge case
    singular_noun: 'pizza',
    flavor_max: 12,
    bake_max: 8,
    bake_differential: 3,
    order_guide: {
      warnings: [MOCK_IDS.FUNC_WARN_HIGH_TOPPINGS],
      suggestions: [MOCK_IDS.FUNC_SUGGEST_GARLIC_BREAD],
    },
  },
  timing: { prepTime: 20, additionalUnitPrepTime: 7, prepStationId: 1 },
};

export const SPLIT_PIZZA_PRODUCT: IProduct = {
  id: MOCK_IDS.SPLIT_PIZZA,
  serviceDisable: [],
  disabled: null,
  availability: [],
  externalIDs: [],
  modifiers: [
    { mtid: MOCK_IDS.SIZE_MT, enable: null, serviceDisable: [] },
    { mtid: MOCK_IDS.TOPPINGS_MT, enable: null, serviceDisable: [] },
  ],
  baseProductId: MOCK_IDS.PI_SPLIT_BASE,
  category_ids: [MOCK_IDS.NESTED_CHILD_CATEGORY],
  printerGroup: null,
  price: { amount: 1500, currency: CURRENCY.USD },
  displayFlags: {
    is3p: false,
    show_name_of_base_product: true,
    singular_noun: 'pizza',
    flavor_max: 10,
    bake_max: 10,
    bake_differential: 2,
    order_guide: { warnings: [], suggestions: [] },
  },
  timing: { prepTime: 18, additionalUnitPrepTime: 6, prepStationId: 2 },
};

export const DISABLED_PRODUCT: IProduct = {
  id: MOCK_IDS.DISABLED_PRODUCT,
  serviceDisable: [MOCK_IDS.FULFILLMENT_PICKUP, MOCK_IDS.FULFILLMENT_DELIVERY],
  disabled: null,
  availability: [],
  externalIDs: [],
  modifiers: [{ mtid: MOCK_IDS.SIZE_MT, enable: null, serviceDisable: [] }],
  baseProductId: MOCK_IDS.PI_DISABLED_BASE,
  category_ids: [MOCK_IDS.DISABLED_CATEGORY],
  printerGroup: null,
  price: { amount: 800, currency: CURRENCY.USD },
  displayFlags: {
    is3p: true, // Third-party product
    show_name_of_base_product: true,
    singular_noun: 'item',
    flavor_max: 5,
    bake_max: 5,
    bake_differential: 1,
    order_guide: { warnings: [], suggestions: [] },
  },
  timing: { prepTime: 10, additionalUnitPrepTime: 2, prepStationId: 3 },
};

export const ALL_PRODUCTS: IProduct[] = [
  BASIC_PIZZA_PRODUCT,
  COMPLEX_PIZZA_PRODUCT,
  SPLIT_PIZZA_PRODUCT,
  DISABLED_PRODUCT,
];

// ============================================================================
// Product Instances
// ============================================================================

const createProductInstanceDisplayFlags = (ordinal: number, hide = false) => ({
  pos: { hide: false, name: '', skip_customization: false },
  menu: {
    ordinal,
    hide,
    price_display: PriceDisplay.ALWAYS,
    adornment: '',
    suppress_exhaustive_modifier_list: false,
    show_modifier_options: true,
  },
  order: {
    ordinal,
    hide,
    skip_customization: false,
    price_display: PriceDisplay.FROM_X,
    adornment: '',
    suppress_exhaustive_modifier_list: false,
  },
});

export const PI_PLAIN_CHEESE: IProductInstance = {
  id: MOCK_IDS.PI_PLAIN_CHEESE,
  productId: MOCK_IDS.BASIC_PIZZA,
  displayName: 'Plain Cheese Pizza',
  shortcode: 'CHZ',
  description: 'Classic cheese pizza',
  ordinal: 100, // Base product is highest ordinal
  modifiers: [],
  externalIDs: [],
  displayFlags: createProductInstanceDisplayFlags(100),
};

export const PI_PEPPERONI: IProductInstance = {
  id: MOCK_IDS.PI_PEPPERONI,
  productId: MOCK_IDS.BASIC_PIZZA,
  displayName: 'Pepperoni Pizza',
  shortcode: 'PEP',
  description: 'Pizza with pepperoni',
  ordinal: 10,
  modifiers: [
    {
      modifierTypeId: MOCK_IDS.TOPPINGS_MT,
      options: [
        { optionId: MOCK_IDS.TOPPING_PEPPERONI, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
      ],
    },
  ],
  externalIDs: [],
  displayFlags: createProductInstanceDisplayFlags(10),
};

export const PI_COMPLEX_BASE: IProductInstance = {
  id: MOCK_IDS.PI_COMPLEX_BASE,
  productId: MOCK_IDS.COMPLEX_PIZZA,
  displayName: '{Crust} Pizza',
  shortcode: 'CPX',
  description: 'Build your custom pizza with {Crust}',
  ordinal: 100,
  modifiers: [],
  externalIDs: [],
  displayFlags: createProductInstanceDisplayFlags(100),
};

export const PI_COMPLEX_THIN_CRUST: IProductInstance = {
  id: MOCK_IDS.PI_COMPLEX_THIN_CRUST,
  productId: MOCK_IDS.COMPLEX_PIZZA,
  displayName: 'Thin Crust Pizza',
  shortcode: 'THN',
  description: 'Crispy thin crust pizza',
  ordinal: 20,
  modifiers: [
    {
      modifierTypeId: MOCK_IDS.CRUST_MT,
      options: [
        { optionId: MOCK_IDS.CRUST_THIN, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
      ],
    },
  ],
  externalIDs: [],
  displayFlags: createProductInstanceDisplayFlags(20),
};

export const PI_COMPLEX_STUFFED: IProductInstance = {
  id: MOCK_IDS.PI_COMPLEX_STUFFED,
  productId: MOCK_IDS.COMPLEX_PIZZA,
  displayName: 'Stuffed Crust Pizza',
  shortcode: 'STF',
  description: 'Delicious stuffed crust',
  ordinal: 30,
  modifiers: [
    {
      modifierTypeId: MOCK_IDS.CRUST_MT,
      options: [
        { optionId: MOCK_IDS.CRUST_STUFFED, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
      ],
    },
  ],
  externalIDs: [],
  displayFlags: createProductInstanceDisplayFlags(30),
};

export const PI_SPLIT_BASE: IProductInstance = {
  id: MOCK_IDS.PI_SPLIT_BASE,
  productId: MOCK_IDS.SPLIT_PIZZA,
  displayName: 'Split Pizza',
  shortcode: 'SPL',
  description: 'Half and half pizza',
  ordinal: 100,
  modifiers: [],
  externalIDs: [],
  displayFlags: createProductInstanceDisplayFlags(100),
};

export const PI_SPLIT_HALF_PEPPERONI: IProductInstance = {
  id: MOCK_IDS.PI_SPLIT_HALF_PEPPERONI,
  productId: MOCK_IDS.SPLIT_PIZZA,
  displayName: 'Half Pepperoni',
  shortcode: 'HPP',
  description: 'Pepperoni on one half',
  ordinal: 10,
  modifiers: [
    {
      modifierTypeId: MOCK_IDS.TOPPINGS_MT,
      options: [
        { optionId: MOCK_IDS.TOPPING_PEPPERONI, placement: OptionPlacement.LEFT, qualifier: OptionQualifier.REGULAR },
      ],
    },
  ],
  externalIDs: [],
  displayFlags: createProductInstanceDisplayFlags(10),
};

export const PI_DISABLED_BASE: IProductInstance = {
  id: MOCK_IDS.PI_DISABLED_BASE,
  productId: MOCK_IDS.DISABLED_PRODUCT,
  displayName: 'Unavailable Item',
  shortcode: 'UNA',
  description: 'Currently unavailable',
  ordinal: 100,
  modifiers: [],
  externalIDs: [],
  displayFlags: createProductInstanceDisplayFlags(100, true), // Hidden
};

export const ALL_PRODUCT_INSTANCES: IProductInstance[] = [
  PI_PLAIN_CHEESE,
  PI_PEPPERONI,
  PI_COMPLEX_BASE,
  PI_COMPLEX_THIN_CRUST,
  PI_COMPLEX_STUFFED,
  PI_SPLIT_BASE,
  PI_SPLIT_HALF_PEPPERONI,
  PI_DISABLED_BASE,
];

// ============================================================================
// Pre-built Test Scenarios (Product Modifier Entries)
// ============================================================================

/**
 * Product modifiers for a simple cheese pizza (matches PI_PLAIN_CHEESE exactly)
 */
export const MODIFIERS_PLAIN_CHEESE: ProductModifierEntry[] = [
  {
    modifierTypeId: MOCK_IDS.SIZE_MT,
    options: [{ optionId: MOCK_IDS.SIZE_MEDIUM, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
  },
];

/**
 * Product modifiers for a pepperoni pizza (matches PI_PEPPERONI)
 */
export const MODIFIERS_PEPPERONI: ProductModifierEntry[] = [
  {
    modifierTypeId: MOCK_IDS.SIZE_MT,
    options: [{ optionId: MOCK_IDS.SIZE_LARGE, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
  },
  {
    modifierTypeId: MOCK_IDS.TOPPINGS_MT,
    options: [
      { optionId: MOCK_IDS.TOPPING_PEPPERONI, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
    ],
  },
];

/**
 * Product modifiers for a split pizza (LEFT pepperoni, RIGHT mushrooms)
 */
export const MODIFIERS_SPLIT_PIZZA: ProductModifierEntry[] = [
  {
    modifierTypeId: MOCK_IDS.SIZE_MT,
    options: [{ optionId: MOCK_IDS.SIZE_LARGE, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
  },
  {
    modifierTypeId: MOCK_IDS.TOPPINGS_MT,
    options: [
      { optionId: MOCK_IDS.TOPPING_PEPPERONI, placement: OptionPlacement.LEFT, qualifier: OptionQualifier.REGULAR },
      { optionId: MOCK_IDS.TOPPING_MUSHROOMS, placement: OptionPlacement.RIGHT, qualifier: OptionQualifier.REGULAR },
    ],
  },
];

/**
 * Product modifiers with HEAVY and LITE qualifiers
 */
export const MODIFIERS_WITH_QUALIFIERS: ProductModifierEntry[] = [
  {
    modifierTypeId: MOCK_IDS.SIZE_MT,
    options: [{ optionId: MOCK_IDS.SIZE_MEDIUM, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
  },
  {
    modifierTypeId: MOCK_IDS.TOPPINGS_MT,
    options: [
      { optionId: MOCK_IDS.TOPPING_PEPPERONI, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.HEAVY },
      { optionId: MOCK_IDS.TOPPING_MUSHROOMS, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.LITE },
      { optionId: MOCK_IDS.TOPPING_OLIVES, placement: OptionPlacement.LEFT, qualifier: OptionQualifier.OTS },
    ],
  },
];

/**
 * Product modifiers for complex pizza with all options
 */
export const MODIFIERS_COMPLEX_PIZZA: ProductModifierEntry[] = [
  {
    modifierTypeId: MOCK_IDS.SIZE_MT,
    options: [{ optionId: MOCK_IDS.SIZE_LARGE, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
  },
  {
    modifierTypeId: MOCK_IDS.CRUST_MT,
    options: [{ optionId: MOCK_IDS.CRUST_THIN, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
  },
  {
    modifierTypeId: MOCK_IDS.SAUCE_MT,
    options: [
      { optionId: MOCK_IDS.SAUCE_MARINARA, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
    ],
  },
  {
    modifierTypeId: MOCK_IDS.TOPPINGS_MT,
    options: [
      { optionId: MOCK_IDS.TOPPING_PEPPERONI, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
      { optionId: MOCK_IDS.TOPPING_EXTRA_CHEESE, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
    ],
  },
];

/**
 * Product modifiers that are incomplete (missing required size)
 */
export const MODIFIERS_INCOMPLETE: ProductModifierEntry[] = [
  {
    modifierTypeId: MOCK_IDS.TOPPINGS_MT,
    options: [
      { optionId: MOCK_IDS.TOPPING_PEPPERONI, placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR },
    ],
  },
];

// ============================================================================
// Catalog Generation
// ============================================================================

/**
 * Convert array of product instance functions to record
 */
const productInstanceFunctionsToRecord = (funcs: IProductInstanceFunction[]): RecordProductInstanceFunctions =>
  funcs.reduce<RecordProductInstanceFunctions>((acc, f) => ({ ...acc, [f.id]: f }), {});

/**
 * Convert array of order instance functions to record
 */
const orderInstanceFunctionsToRecord = (funcs: OrderInstanceFunction[]): RecordOrderInstanceFunctions =>
  funcs.reduce<RecordOrderInstanceFunctions>((acc, f) => ({ ...acc, [f.id]: f }), {});

/**
 * The complete mock catalog instance
 */
export const MOCK_CATALOG: ICatalog = CatalogGenerator(
  ALL_CATEGORIES,
  ALL_MODIFIER_TYPES,
  ALL_OPTIONS,
  ALL_PRODUCTS,
  ALL_PRODUCT_INSTANCES,
  productInstanceFunctionsToRecord(ALL_PRODUCT_INSTANCE_FUNCTIONS),
  orderInstanceFunctionsToRecord(ALL_ORDER_INSTANCE_FUNCTIONS),
  { major: 1, minor: 0, patch: 0 },
);

/**
 * Get catalog selectors for the mock catalog
 */
export const getMockCatalogSelectors = (): ICatalogSelectors => ICatalogSelectorWrapper(MOCK_CATALOG);

/**
 * Pre-built catalog selectors instance (for convenience)
 */
export const MOCK_CATALOG_SELECTORS: ICatalogSelectors = getMockCatalogSelectors();

// ============================================================================
// Helper Functions for Testing
// ============================================================================

/**
 * Create a custom catalog with specific entities.
 * Useful for testing edge cases.
 */
export const createCustomMockCatalog = (
  overrides: {
    categories?: ICategory[];
    modifierTypes?: IOptionType[];
    options?: IOption[];
    products?: IProduct[];
    productInstances?: IProductInstance[];
    productInstanceFunctions?: IProductInstanceFunction[];
    orderInstanceFunctions?: OrderInstanceFunction[];
  } = {},
): ICatalog => {
  return CatalogGenerator(
    overrides.categories ?? ALL_CATEGORIES,
    overrides.modifierTypes ?? ALL_MODIFIER_TYPES,
    overrides.options ?? ALL_OPTIONS,
    overrides.products ?? ALL_PRODUCTS,
    overrides.productInstances ?? ALL_PRODUCT_INSTANCES,
    productInstanceFunctionsToRecord(overrides.productInstanceFunctions ?? ALL_PRODUCT_INSTANCE_FUNCTIONS),
    orderInstanceFunctionsToRecord(overrides.orderInstanceFunctions ?? ALL_ORDER_INSTANCE_FUNCTIONS),
    { major: 1, minor: 0, patch: 0 },
  );
};

/**
 * Get selectors for a custom catalog
 */
export const getCustomCatalogSelectors = (catalog: ICatalog): ICatalogSelectors => ICatalogSelectorWrapper(catalog);

/**
 * Helper to get a category entry by ID from the mock catalog
 */
export const getMockCategoryEntry = (categoryId: string): CatalogCategoryEntry | undefined =>
  MOCK_CATALOG_SELECTORS.category(categoryId);

/**
 * Helper to get a modifier entry by ID from the mock catalog
 */
export const getMockModifierEntry = (modifierTypeId: string): CatalogModifierEntry | undefined =>
  MOCK_CATALOG_SELECTORS.modifierEntry(modifierTypeId);

/**
 * Helper to get a product entry by ID from the mock catalog
 */
export const getMockProductEntry = (productId: string): CatalogProductEntry | undefined =>
  MOCK_CATALOG_SELECTORS.productEntry(productId);

/**
 * Helper to get an option by ID from the mock catalog
 */
export const getMockOption = (optionId: string): IOption | undefined => MOCK_CATALOG_SELECTORS.option(optionId);

/**
 * Helper to get a product instance by ID from the mock catalog
 */
export const getMockProductInstance = (productInstanceId: string): IProductInstance | undefined =>
  MOCK_CATALOG_SELECTORS.productInstance(productInstanceId);

/**
 * Create a default service time for testing (current time)
 */
export const createMockServiceTime = (offsetMinutes = 0): number => Date.now() + offsetMinutes * 60 * 1000;
