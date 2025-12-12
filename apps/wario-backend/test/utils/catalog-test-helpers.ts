/**
 * Catalog Test Helpers
 *
 * Utilities for setting up catalog state in service tests.
 * Wraps the mock generators from @wcp/wario-shared/testing.
 */

import type { ICatalog, ICatalogSelectors } from '@wcp/wario-shared';
import { CURRENCY } from '@wcp/wario-shared';
import {
  createMockCatalog,
  type CreateMockCatalogOptions,
  createMockCatalogSelectorsFromArrays,
  createMockCategory,
  createMockOption,
  createMockOptionType,
  createMockProduct,
  createMockProductInstance,
} from '@wcp/wario-shared/testing';

import type { CatalogProviderService } from '../../src/config/catalog-provider/catalog-provider.service';

// Re-export for convenience
export {
  createMockCatalog,
  type CreateMockCatalogOptions,
  createMockCatalogSelectorsFromArrays,
  createMockCategory,
  createMockOption,
  createMockOptionType,
  createMockProduct,
  createMockProductInstance,
};

/**
 * Sets up a mock CatalogProviderService with catalog data.
 * Configures the CatalogSelectors getter to return properly typed selectors.
 *
 * @example
 * ```typescript
 * const mockCatalogService = mockCatalogProviderService();
 * setupMockCatalog(mockCatalogService, {
 *   categories: [createMockCategory({ id: 'pizza' })],
 *   products: [createMockProduct({ id: 'margherita', category_ids: ['pizza'] })],
 * });
 * ```
 */
export function setupMockCatalog(
  catalogService: jest.Mocked<CatalogProviderService>,
  opts: CreateMockCatalogOptions,
): { catalog: ICatalog; selectors: ICatalogSelectors } {
  const catalog = createMockCatalog(opts);
  const selectors = createMockCatalogSelectorsFromArrays(opts);

  // Configure the CatalogSelectors getter
  Object.defineProperty(catalogService, 'CatalogSelectors', {
    get: () => selectors,
    configurable: true,
  });

  // Configure the Catalog getter
  Object.defineProperty(catalogService, 'Catalog', {
    get: () => catalog,
    configurable: true,
  });

  // Configure individual getters for convenience
  Object.defineProperty(catalogService, 'Categories', {
    get: () => opts.categories ?? [],
    configurable: true,
  });

  Object.defineProperty(catalogService, 'Products', {
    get: () => opts.products ?? [],
    configurable: true,
  });

  Object.defineProperty(catalogService, 'ProductInstances', {
    get: () => opts.productInstances ?? [],
    configurable: true,
  });

  Object.defineProperty(catalogService, 'ModifierTypes', {
    get: () => opts.modifierTypes ?? [],
    configurable: true,
  });

  Object.defineProperty(catalogService, 'ModifierOptions', {
    get: () => opts.options ?? [],
    configurable: true,
  });

  return { catalog, selectors };
}

/**
 * Creates a minimal catalog with one product for basic tests.
 */
export function createMinimalCatalogOptions(): CreateMockCatalogOptions {
  const category = createMockCategory({ id: 'cat1', name: 'Test Category', products: ['prod1'] });
  const productInstance = createMockProductInstance({
    id: 'pi1',
    displayName: 'Test Product',
  });
  const product = createMockProduct({
    id: 'prod1',
    instances: ['pi1'],
  });

  return {
    categories: [category],
    products: [product],
    productInstances: [productInstance],
    modifierTypes: [],
    options: [],
  };
}

/**
 * Creates a catalog with products and modifiers for modifier testing.
 */
export function createCatalogWithModifiers(): CreateMockCatalogOptions {
  const category = createMockCategory({ id: 'pizza', name: 'Pizza', products: ['prod-cheese'] });
  const modifierType = createMockOptionType({
    id: 'toppings',
    name: 'Toppings',
    min_selected: 0,
    max_selected: 5,
    options: ['pepperoni', 'mushrooms'],
  });
  const option1 = createMockOption({
    id: 'pepperoni',
    displayName: 'Pepperoni',
    price: { amount: 150, currency: CURRENCY.USD },
  });
  const option2 = createMockOption({
    id: 'mushrooms',
    displayName: 'Mushrooms',
    price: { amount: 100, currency: CURRENCY.USD },
  });

  const productInstance = createMockProductInstance({
    id: 'pi-cheese',
    displayName: 'Cheese Pizza',
  });

  const product = createMockProduct({
    id: 'prod-cheese',
    instances: ['pi-cheese'],
    modifiers: [{ mtid: 'toppings', enable: null, serviceDisable: [] }],
    price: { amount: 1500, currency: CURRENCY.USD },
  });

  return {
    categories: [category],
    modifierTypes: [modifierType],
    options: [option1, option2],
    products: [product],
    productInstances: [productInstance],
  };
}

// =============================================================================
// Uncommitted DTO Helpers (for controller body inputs)
// =============================================================================

import type { IOption, IOptionType, IProduct, IProductInstance } from '@wcp/wario-shared';

/**
 * Strips the `id` from a product to create an UncommittedIProductDto.
 * Use with createMockProduct() to generate controller body inputs.
 *
 * @example
 * ```ts
 * const body = { product: asUncommittedProduct(createMockProduct()), instances: [] };
 * ```
 */
export function asUncommittedProduct(product: IProduct): Omit<IProduct, 'id'> {
  const { id: _id, ...uncommitted } = product;
  return uncommitted;
}

/**
 * Strips the `id` from a product instance to create an UncommittedIProductInstanceDto.
 */
export function asUncommittedProductInstance(instance: IProductInstance): Omit<IProductInstance, 'id'> {
  const { id: _id, ...uncommitted } = instance;
  return uncommitted;
}

/**
 * Strips the `id` from an option type to create an uncommitted modifier type.
 */
export function asUncommittedOptionType(optionType: IOptionType): Omit<IOptionType, 'id'> {
  const { id: _id, ...uncommitted } = optionType;
  return uncommitted;
}

/**
 * Strips the `id` from an option to create an uncommitted option.
 */
export function asUncommittedOption(option: IOption): Omit<IOption, 'id'> {
  const { id: _id, ...uncommitted } = option;
  return uncommitted;
}
