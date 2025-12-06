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
  // Option-related
  createMockModifierEntry,
  // Primitive helpers
  createMockMoney,
  createMockOption,

  createMockOptionDisplayFlags,
  createMockOptionMetadata,
  createMockOptionType,
  createMockOptionTypeDisplayFlags,
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
