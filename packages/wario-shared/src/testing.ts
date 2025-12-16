/* eslint-disable perfectionist/sort-named-exports */
/* eslint-disable perfectionist/sort-exports */
/**
 * @wcp/wario-shared/testing
 *
 * Test utilities and mock factories for testing wario applications.
 * This is a separate entry point to avoid bloating production bundles.
 *
 * @example
 * ```typescript
 * import { createMockCatalog, createMockProduct } from '@wcp/wario-shared/testing';
 * ```
 */

export {
  // Order/Expression helpers
  createMockAbstractOrderExpression,
  createMockAbstractOrderExpressionConstLiteral,
  createMockAbstractOrderExpressionIfElse,
  createMockAbstractOrderExpressionLogical,
  // Catalog generators
  createMockCatalog,

  // Types
  type CreateMockCatalogOptions,
  createMockCatalogSelectorsFromArrays,
  // Category
  createMockCategory,
  createMockCategoryDisplayFlags,
  // Primitive helpers
  createMockMoney,
  createMockOption,
  createMockOptionDisplayFlags,
  createMockOptionMetadata,
  createMockOptionType,
  createMockOptionTypeDisplayFlags,

  // functional
  createMockAbstractExpression,
  createMockAbstractExpressionConstLiteral,
  createMockProductInstanceFunction,
  createMockOrderInstanceFunction,

  // Product-related
  createMockPrepTiming,
  createMockProduct,
  createMockProductDisplayFlags,
  // Product Instance
  createMockProductInstance,
  createMockProductInstanceDisplayFlags,
  createMockProductInstanceDisplayFlagsMenu,
  createMockProductInstanceDisplayFlagsOrder,
  createMockProductInstanceDisplayFlagsPos,
  createMockProductModifier,
  createMockProductOrderGuide,
} from '../tests/mocks';

// Comprehensive mock catalog for high coverage testing
export {
  // IDs registry
  MOCK_IDS,

  // Categories
  ALL_CATEGORIES,
  DISABLED_CATEGORY,
  DRINKS_CATEGORY,
  getMockCategoryEntry,
  NESTED_CHILD_CATEGORY,
  PIZZA_CATEGORY,
  MENU_ROOT_CATEGORY as ROOT_CATEGORY,
  TIME_DISABLED_CATEGORY,

  // Modifier Types
  ALL_MODIFIER_TYPES,
  CRUST_MODIFIER_TYPE,
  getMockModifierEntry,
  REMOVAL_MODIFIER_TYPE,
  SAUCE_MODIFIER_TYPE,
  SIZE_MODIFIER_TYPE,
  TOPPINGS_MODIFIER_TYPE,

  // Options
  ALL_OPTIONS,
  getMockOption,
  OPTION_CRUST_STUFFED,
  OPTION_CRUST_THICK,
  OPTION_CRUST_THIN,
  OPTION_REMOVAL_NO_CHEESE,
  OPTION_REMOVAL_NO_SAUCE,
  OPTION_SAUCE_ALFREDO,
  OPTION_SAUCE_MARINARA,
  OPTION_SIZE_LARGE,
  OPTION_SIZE_MEDIUM,
  OPTION_SIZE_SMALL,
  OPTION_TOPPING_DISABLED,
  OPTION_TOPPING_EXTRA_CHEESE,
  OPTION_TOPPING_MUSHROOMS,
  OPTION_TOPPING_OLIVES,
  OPTION_TOPPING_PEPPERONI,
  OPTION_TOPPING_TIME_LIMITED,

  // Products
  ALL_PRODUCTS,
  BASIC_PIZZA_PRODUCT,
  COMPLEX_PIZZA_PRODUCT,
  DISABLED_PRODUCT,
  getMockProductEntry,
  SPLIT_PIZZA_PRODUCT,

  // Product Instances
  ALL_PRODUCT_INSTANCES,
  getMockProductInstance,
  PI_COMPLEX_BASE,
  PI_COMPLEX_STUFFED,
  PI_COMPLEX_THIN_CRUST,
  PI_DISABLED_BASE,
  PI_PEPPERONI,
  PI_PLAIN_CHEESE,
  PI_SPLIT_BASE,
  PI_SPLIT_HALF_PEPPERONI,

  // Functions
  ALL_ORDER_INSTANCE_FUNCTIONS,
  ALL_PRODUCT_INSTANCE_FUNCTIONS,
  FUNC_CRUST_ENABLES_SAUCE,
  FUNC_FLAVOR_CHECK,
  FUNC_HAS_ANY_TOPPINGS,
  FUNC_ORDER_QUANTITY_CHECK,
  FUNC_ORDER_SIZE_CHECK,

  // Pre-built test scenarios
  MODIFIERS_COMPLEX_PIZZA,
  MODIFIERS_INCOMPLETE,
  MODIFIERS_PEPPERONI,
  MODIFIERS_PLAIN_CHEESE,
  MODIFIERS_SPLIT_PIZZA,
  MODIFIERS_WITH_QUALIFIERS,

  // Catalog and selectors
  createCustomMockCatalog,
  createMockServiceTime,
  getCustomCatalogSelectors,
  getMockCatalogSelectors,
  MOCK_CATALOG,
  MOCK_CATALOG_SELECTORS,
} from '../testing';
