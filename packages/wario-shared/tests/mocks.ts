/**
 * Centralized test mock factory functions.
 * These helpers create properly typed mock objects for testing.
 */

import { type DeepPartial, ReduceArrayToMapByKey } from '../src';
import type {
  AbstractOrderExpression,
  AbstractOrderExpressionConstLiteral,
  AbstractOrderExpressionIfElseExpression,
  AbstractOrderExpressionLogicalExpression,
  CatalogCategoryEntry,
  CatalogModifierEntry,
  CatalogProductEntry,
  CategoryDisplayFlags,
  ICatalog,
  ICategory,
  IConstLiteralExpression,
  IIfElseExpression,
  ILogicalExpression,
  IMoney,
  IOption,
  IOptionDisplayFlags,
  IOptionMetadata,
  IOptionType,
  IOptionTypeDisplayFlags,
  IProduct,
  IProductDisplayFlags,
  IProductInstance,
  IProductInstanceDisplayFlags,
  IProductInstanceDisplayFlagsMenu,
  IProductInstanceDisplayFlagsOrder,
  IProductInstanceDisplayFlagsPos,
  IProductInstanceFunction,
  IProductModifier,
  IProductOrderGuide,
  OrderInstanceFunction,
  PrepTiming,
  SEMVER,
} from '../src/lib/derived-types';
import {
  CALL_LINE_DISPLAY,
  CategoryDisplay,
  ConstLiteralDiscriminator,
  CURRENCY,
  DISPLAY_AS,
  LogicalFunctionOperator,
  MODIFIER_CLASS,
  OrderInstanceFunctionType,
  PriceDisplay,
} from '../src/lib/enums';
import { CatalogGenerator, ICatalogSelectorWrapper } from '../src/lib/objects/ICatalog';
import type { ICatalogModifierSelectors, ICatalogSelectors } from '../src/lib/types';

// ============================================================================
// Primitive / Leaf Type Helpers
// ============================================================================

export const createMockMoney = (overrides: Partial<IMoney> = {}): IMoney => ({
  amount: 0,
  currency: CURRENCY.USD,
  ...overrides,
});

// ============================================================================
// Option-related Helpers
// ============================================================================

export const createMockOptionMetadata = (overrides: Partial<IOptionMetadata> = {}): IOptionMetadata => ({
  flavor_factor: 0,
  bake_factor: 0,
  can_split: true,
  allowHeavy: false,
  allowLite: true,
  allowOTS: false,
  ...overrides,
});

export const createMockOptionDisplayFlags = (overrides: Partial<IOptionDisplayFlags> = {}): IOptionDisplayFlags => ({
  omit_from_name: false,
  omit_from_shortname: false,
  ...overrides,
});

export const createMockOption = (overrides: Partial<IOption> = {}): IOption => ({
  id: 'opt1',
  modifierTypeId: 'mt1',
  displayName: 'Test Option',
  shortcode: 'TO',
  enable: null,
  description: '',
  ordinal: 0,
  externalIDs: [],
  disabled: null,
  availability: [],
  ...overrides,
  price: createMockMoney(overrides.price),
  metadata: createMockOptionMetadata(overrides.metadata),
  displayFlags: createMockOptionDisplayFlags(overrides.displayFlags),
});

// ============================================================================
// Option Type (Modifier Type) Helpers
// ============================================================================

export const createMockOptionTypeDisplayFlags = (
  overrides: Partial<IOptionTypeDisplayFlags> = {}
): IOptionTypeDisplayFlags => ({
  is3p: false,
  omit_section_if_no_available_options: false,
  omit_options_if_not_available: false,
  use_toggle_if_only_two_options: true,
  hidden: false,
  empty_display_as: DISPLAY_AS.OMIT,
  modifier_class: MODIFIER_CLASS.ADD,
  template_string: '',
  multiple_item_separator: ', ',
  non_empty_group_prefix: '',
  non_empty_group_suffix: '',
  ...overrides,
});

export const createMockOptionType = (overrides: Partial<IOptionType> = {}): IOptionType => ({
  id: 'mt1',
  name: 'Toppings',
  displayName: 'Toppings Display Name',
  externalIDs: [],
  ordinal: 0,
  min_selected: 0,
  max_selected: 10,
  ...overrides,
  displayFlags: createMockOptionTypeDisplayFlags(overrides.displayFlags),
});

// ============================================================================
// Catalog Modifier Entry Helper
// ============================================================================

export const createMockModifierEntry = (overrides: Partial<CatalogModifierEntry> = {}): CatalogModifierEntry => ({
  options: ['opt1'],
  ...overrides,
  modifierType: createMockOptionType(overrides.modifierType),
});

// ============================================================================
// Product Helpers
// ============================================================================

export const createMockPrepTiming = (overrides: Partial<PrepTiming> = {}): PrepTiming => ({
  prepTime: 0,
  additionalUnitPrepTime: 5,
  prepStationId: 1,
  ...overrides,
});

export const createMockProductOrderGuide = (overrides: Partial<IProductOrderGuide> = {}): IProductOrderGuide => ({
  warnings: [],
  suggestions: [],
  ...overrides,
});

export const createMockProductDisplayFlags = (overrides: Partial<IProductDisplayFlags> = {}): IProductDisplayFlags => ({
  is3p: false,
  show_name_of_base_product: true,
  singular_noun: 'item',
  flavor_max: 10,
  bake_max: 10,
  bake_differential: 2,
  ...overrides,
  order_guide: createMockProductOrderGuide(overrides.order_guide),
});

export const createMockProductModifier = (overrides: Partial<IProductModifier> = {}): IProductModifier => ({
  mtid: 'mt1',
  enable: null,
  serviceDisable: [],
  ...overrides,
});

export const createMockProduct = (overrides: Partial<IProduct> = {}): IProduct => ({
  id: 'prod1',
  serviceDisable: [],
  disabled: null,
  availability: [],
  externalIDs: [],
  modifiers: [],
  baseProductId: 'pi1',
  category_ids: ['cat1'],
  printerGroup: null,
  ...overrides,
  price: createMockMoney(overrides.price as IMoney),
  displayFlags: createMockProductDisplayFlags(overrides.displayFlags),
  timing: createMockPrepTiming(overrides.timing ?? undefined),
});

// ============================================================================
// Product Instance Display Flags Helpers
// ============================================================================

export const createMockProductInstanceDisplayFlagsPos = (
  overrides: Partial<IProductInstanceDisplayFlagsPos> = {}
): IProductInstanceDisplayFlagsPos => ({
  hide: false,
  name: '',
  skip_customization: false,
  ...overrides,
});

export const createMockProductInstanceDisplayFlagsMenu = (
  overrides: Partial<IProductInstanceDisplayFlagsMenu> = {}
): IProductInstanceDisplayFlagsMenu => ({
  ordinal: 0,
  hide: false,
  price_display: PriceDisplay.ALWAYS,
  adornment: '',
  suppress_exhaustive_modifier_list: false,
  show_modifier_options: true,
  ...overrides,
});

export const createMockProductInstanceDisplayFlagsOrder = (
  overrides: Partial<IProductInstanceDisplayFlagsOrder> = {}
): IProductInstanceDisplayFlagsOrder => ({
  ordinal: 0,
  hide: false,
  skip_customization: false,
  price_display: PriceDisplay.ALWAYS,
  adornment: '',
  suppress_exhaustive_modifier_list: false,
  ...overrides,
});

export const createMockProductInstanceDisplayFlags = (
  overrides: Partial<IProductInstanceDisplayFlags> = {}
): IProductInstanceDisplayFlags => ({
  pos: createMockProductInstanceDisplayFlagsPos(overrides.pos),
  menu: createMockProductInstanceDisplayFlagsMenu(overrides.menu),
  order: createMockProductInstanceDisplayFlagsOrder(overrides.order),
});

// ============================================================================
// Product Instance Helper
// ============================================================================

export const createMockProductInstance = (overrides: Partial<IProductInstance> = {}): IProductInstance => ({
  id: 'pi1',
  productId: 'prod1',
  displayName: 'Test Product',
  shortcode: 'TP',
  description: '',
  ordinal: 0,
  modifiers: [],
  externalIDs: [],
  ...overrides,
  displayFlags: createMockProductInstanceDisplayFlags(overrides.displayFlags),
});

// ============================================================================
// Category Helper
// ============================================================================

export const createMockCategoryDisplayFlags = (overrides: Partial<CategoryDisplayFlags> = {}): CategoryDisplayFlags => ({
  nesting: CategoryDisplay.FLAT,
  call_line_name: '',
  call_line_display: CALL_LINE_DISPLAY.SHORTCODE,
  ...overrides,
});

export const createMockCategory = (
  overrides: Partial<CatalogCategoryEntry['category']> = {}
): CatalogCategoryEntry['category'] => ({
  id: 'cat1',
  name: 'Test Category',
  description: '',
  subheading: null,
  footnotes: null,
  parent_id: null,
  ordinal: 0,
  serviceDisable: [],
  display_flags: createMockCategoryDisplayFlags(overrides.display_flags),
  ...overrides,
});

// ============================================================================
// Catalog Selectors Helpers (DEPRECATED)
// ============================================================================

/**
 * @deprecated Use createMockCatalogSelectorsFromArrays instead.
 * This function creates selectors from Record objects, which doesn't properly
 * validate relationships between entities. Use createMockCatalogSelectorsFromArrays
 * which uses CatalogGenerator for proper validation.
 */
export const createMockCatModSelectors = (
  options: Record<string, IOption> = {},
  modifierEntries: Record<string, CatalogModifierEntry> = {}
): ICatalogModifierSelectors => ({
  option: (id: string) => options[id],
  modifierEntry: (id: string) => modifierEntries[id],
});

/**
 * @deprecated Use createMockCatalogSelectorsFromArrays instead.
 * This function creates selectors from Record objects, which doesn't properly
 * validate relationships between entities. Use createMockCatalogSelectorsFromArrays
 * which uses CatalogGenerator for proper validation.
 */
export const createMockCatalogSelectors = (
  products: Record<string, CatalogProductEntry> = {},
  options: Record<string, IOption> = {},
  modifiers: Record<string, CatalogModifierEntry> = {},
  categories: Record<string, CatalogCategoryEntry> = {},
  productInstances: Record<string, IProductInstance> = {}
): ICatalogSelectors => ({
  productEntry: (id: string) => products[id],
  option: (id: string) => options[id],
  modifierEntry: (id: string) => modifiers[id],
  category: (id: string) => categories[id],
  productInstance: (id: string) => productInstances[id],
  productInstanceFunction: () => undefined,
  options: () => Object.keys(options),
  modifierEntries: () => Object.keys(modifiers),
  categories: () => Object.keys(categories),
  productInstances: () => Object.keys(productInstances),
  productEntries: () => Object.keys(products),
  productInstanceFunctions: () => [],
  orderInstanceFunction: () => undefined,
  orderInstanceFunctions: () => [],
});

// ============================================================================
// Catalog Generation Helpers
// ============================================================================

export interface CreateMockCatalogOptions {
  categories?: ICategory[];
  modifierTypes?: IOptionType[];
  options?: IOption[];
  products?: IProduct[];
  productInstances?: IProductInstance[];
  productInstanceFunctions?: IProductInstanceFunction[];
  orderInstanceFunctions?: OrderInstanceFunction[];
  apiVersion?: SEMVER;
}

/**
 * Creates a mock ICatalog from arrays of entities using CatalogGenerator.
 * This is useful for tests that need a full catalog structure.
 */
export const createMockCatalog = (opts: CreateMockCatalogOptions = {}): ICatalog => {
  return CatalogGenerator(
    opts.categories ?? [],
    opts.modifierTypes ?? [],
    opts.options ?? [],
    opts.products ?? [],
    opts.productInstances ?? [],
    ReduceArrayToMapByKey(opts.productInstanceFunctions ?? [], "id"),
    ReduceArrayToMapByKey(opts.orderInstanceFunctions ?? [], "id"),
    opts.apiVersion ?? { major: 1, minor: 0, patch: 0 }
  );
};

/**
 * Creates ICatalogSelectors from arrays of entities.
 * Convenience wrapper around createMockCatalog and ICatalogSelectorWrapper.
 */
export const createMockCatalogSelectorsFromArrays = (opts: CreateMockCatalogOptions = {}): ICatalogSelectors => {
  return ICatalogSelectorWrapper(createMockCatalog(opts));
};


// ============================================================================
// Order Instance Function Helpers
// ============================================================================
export const createMockAbstractOrderExpressionConstLiteral = (overrides: IConstLiteralExpression = { discriminator: ConstLiteralDiscriminator.NUMBER, value: 0 }): AbstractOrderExpressionConstLiteral => ({
  discriminator: OrderInstanceFunctionType.ConstLiteral,
  expr: overrides
});

export const createMockAbstractOrderExpressionIfElse = (overrides: DeepPartial<IIfElseExpression<AbstractOrderExpression>> = {}): AbstractOrderExpressionIfElseExpression => ({
  discriminator: OrderInstanceFunctionType.IfElse,
  expr: {
    false_branch: createMockAbstractOrderExpression(overrides.false_branch),
    true_branch: createMockAbstractOrderExpression(overrides.true_branch),
    test: createMockAbstractOrderExpression(overrides.test),
  }
});

export const createMockAbstractOrderExpressionLogical = (overrides: DeepPartial<ILogicalExpression<AbstractOrderExpression>> = {}): AbstractOrderExpressionLogicalExpression => ({
  discriminator: OrderInstanceFunctionType.Logical,
  expr: {
    operandA: createMockAbstractOrderExpression(overrides.operandA),
    operandB: createMockAbstractOrderExpression(overrides.operandB),
    operator: overrides.operator ?? LogicalFunctionOperator.AND,
  }
});

export const createMockAbstractOrderExpression = (overrides: DeepPartial<AbstractOrderExpression> = {}): AbstractOrderExpression => {
  switch (overrides.discriminator ?? OrderInstanceFunctionType.ConstLiteral) {
    case OrderInstanceFunctionType.IfElse:
      return createMockAbstractOrderExpressionIfElse(overrides.expr as IIfElseExpression<AbstractOrderExpression>);
    case OrderInstanceFunctionType.Logical:
      return createMockAbstractOrderExpressionLogical(overrides.expr as ILogicalExpression<AbstractOrderExpression>);
    case OrderInstanceFunctionType.ConstLiteral:
    default:
      return createMockAbstractOrderExpressionConstLiteral(overrides.expr as IConstLiteralExpression);
  }
}

export const createMockOrderInstanceFunction = (overrides: DeepPartial<OrderInstanceFunction> = {}): OrderInstanceFunction => ({
  id: 'of1',
  name: 'Test Order Instance Function',
  ...overrides,
  expression: createMockAbstractOrderExpression(overrides.expression),
});

// ============================================================================
// Product Instance Function Helpers
// ============================================================================
