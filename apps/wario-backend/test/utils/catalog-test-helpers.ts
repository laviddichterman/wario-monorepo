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
// DTO Mock Generators (for catalog API CRUD operations)
// =============================================================================

import type {
  CreateIOptionTypeRequestBodyDto,
  CreateIProductInstanceRequestDto,
  CreateIProductRequestDto,
  UpdateIProductInstanceRequestDto,
  UpdateIProductRequestDto,
} from '@wcp/wario-shared';
import type { IOption, IProductInstance } from '@wcp/wario-shared';

/**
 * Creates a mock CreateIProductRequestDto for testing product creation.
 * Generates a properly typed DTO that matches the catalog API's CreateIProductRequestDto.
 *
 * @param opts - DTO-specific overrides (modifiers, instances, etc.)
 * @param baseOverrides - Overrides for the base product defaults (price, displayFlags, etc.)
 *
 * @example
 * ```ts
 * const createRequest = createMockCreateProductRequest(
 *   {
 *     modifiers: [{ mtid: 'toppings', enable: null, serviceDisable: [] }],
 *     instances: [createMockCreateProductInstanceRequest({ displayName: 'Small' })],
 *   },
 *   { price: { amount: 2000, currency: 'USD' } }, // Base product overrides
 * );
 * await batchUpsertProduct(deps, [createRequest]);
 * ```
 */
export function createMockCreateProductRequest(
  opts: Partial<CreateIProductRequestDto> = {},
  baseOverrides: Parameters<typeof createMockProduct>[0] = {},
): CreateIProductRequestDto {
  const baseProduct = createMockProduct(baseOverrides);
  const { id: _id, instances: _instances, ...productWithoutIdAndInstances } = baseProduct;

  return {
    ...productWithoutIdAndInstances,
    instances: opts.instances ?? [],
    ...opts,
  } as CreateIProductRequestDto;
}

/**
 * Creates a mock UpdateIProductRequestDto for testing product updates.
 * Generates a properly typed DTO that matches the catalog API's UpdateIProductRequestDto.
 *
 * @param opts - DTO-specific overrides including required id field
 *
 * @example
 * ```ts
 * const updateRequest = createMockUpdateProductRequest({
 *   id: 'prod_123',
 *   price: { amount: 1500, currency: 'USD' },
 *   instances: ['pi_1', 'pi_2'], // Can be string IDs or UpdateIProductInstanceRequestDto objects
 * });
 * await batchUpsertProduct(deps, [updateRequest]);
 * ```
 */
export function createMockUpdateProductRequest(
  opts: Partial<UpdateIProductRequestDto> & { id: string },
): UpdateIProductRequestDto {
  const { id, ...restOpts } = opts;
  return {
    id,
    ...restOpts,
  } as UpdateIProductRequestDto;
}

/**
 * Creates a mock CreateIProductInstanceRequestDto for testing product instance creation.
 *
 * @param opts - DTO-specific overrides (displayName, modifiers, etc.)
 * @param baseOverrides - Overrides for the base instance defaults
 *
 * @example
 * ```ts
 * const instanceRequest = createMockCreateProductInstanceRequest(
 *   { displayName: 'Large Pizza', shortcode: 'LG' },
 *   { description: 'Extra large size' }, // Base instance overrides
 * );
 * ```
 */
export function createMockCreateProductInstanceRequest(
  opts: Partial<Omit<IProductInstance, 'id'>> = {},
  baseOverrides: Parameters<typeof createMockProductInstance>[0] = {},
): CreateIProductInstanceRequestDto {
  const baseInstance = createMockProductInstance(baseOverrides);
  const { id: _id, ...instanceWithoutId } = baseInstance;

  return {
    ...instanceWithoutId,
    ...opts,
  } as CreateIProductInstanceRequestDto;
}

/**
 * Creates a mock UpdateIProductInstanceRequestDto for testing product instance updates.
 *
 * @param opts - DTO-specific overrides including required id field
 *
 * @example
 * ```ts
 * const updateInstanceRequest = createMockUpdateProductInstanceRequest({
 *   id: 'pi_123',
 *   displayName: 'Updated Name',
 * });
 * ```
 */
export function createMockUpdateProductInstanceRequest(
  opts: Partial<IProductInstance> & { id: string },
): UpdateIProductInstanceRequestDto {
  const { id, ...restOpts } = opts;
  return {
    id,
    ...restOpts,
  } as UpdateIProductInstanceRequestDto;
}

/**
 * Creates a mock CreateIOptionTypeRequestBodyDto for testing modifier type creation.
 *
 * @param opts - DTO-specific overrides (options array, etc.)
 * @param baseOverrides - Overrides for the base option type defaults
 *
 * @example
 * ```ts
 * const createRequest = createMockCreateOptionTypeRequest(
 *   { options: [] },
 *   { name: 'Toppings', min_selected: 0, max_selected: 5 },
 * );
 * ```
 */
export function createMockCreateOptionTypeRequest(
  opts: Partial<CreateIOptionTypeRequestBodyDto> = {},
  baseOverrides: Parameters<typeof createMockOptionType>[0] = {},
): CreateIOptionTypeRequestBodyDto {
  const baseOptionType = createMockOptionType(baseOverrides);
  const { id: _id, options: _options, ...optionTypeWithoutIdAndOptions } = baseOptionType;

  return {
    ...optionTypeWithoutIdAndOptions,
    options: opts.options,
    ...opts,
  } as CreateIOptionTypeRequestBodyDto;
}

/**
 * Creates a mock CreateIOptionRequestBodyDto for testing option creation.
 *
 * @param opts - DTO-specific overrides
 * @param baseOverrides - Overrides for the base option defaults
 *
 * @example
 * ```ts
 * const createRequest = createMockCreateOptionRequest(
 *   {},
 *   { displayName: 'Pepperoni', price: { amount: 200, currency: 'USD' } },
 * );
 * ```
 */
export function createMockCreateOptionRequest(
  opts: Partial<Omit<IOption, 'id'>> = {},
  baseOverrides: Parameters<typeof createMockOption>[0] = {},
): Omit<IOption, 'id'> {
  const baseOption = createMockOption(baseOverrides);
  const { id: _id, ...optionWithoutId } = baseOption;

  return {
    ...optionWithoutId,
    ...opts,
  };
}

