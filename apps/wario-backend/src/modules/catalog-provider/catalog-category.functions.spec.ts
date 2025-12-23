/**
 * Unit tests for catalog-category.functions.ts
 *
 * Tests the pure functions for Category CRUD operations.
 */
/* eslint-disable @typescript-eslint/unbound-method */

import type { FulfillmentConfig, ICategory, UncommittedICategory } from '@wcp/wario-shared';
import { createMockCategory, createMockCategoryDisplayFlags } from '@wcp/wario-shared/testing';

import { createMockCatalog, createMockCategoryDeps } from '../../../test/utils';

import { createCategory, deleteCategory, updateCategory } from './catalog-category.functions';

// ============================================================================
// Type Assertion Helpers
// ============================================================================

function assertIsCategory(value: unknown): asserts value is ICategory {
  const cat = value as ICategory;
  expect(cat).toHaveProperty('id');
  expect(cat).toHaveProperty('name');
  expect(cat).toHaveProperty('children');
  expect(cat).toHaveProperty('products');
}

// ============================================================================
// Test Catalog Setup
// ============================================================================

function createTestCatalog() {
  const parentCategory = createMockCategory({
    id: 'parent-cat',
    name: 'Parent Category',
    children: ['child-cat'],
    products: [],
  });

  const childCategory = createMockCategory({
    id: 'child-cat',
    name: 'Child Category',
    children: [],
    products: ['product-1', 'product-2'],
  });

  const orphanCategory = createMockCategory({
    id: 'orphan-cat',
    name: 'Orphan Category',
    children: [],
    products: [],
  });

  return createMockCatalog({
    categories: [parentCategory, childCategory, orphanCategory],
  });
}

// ============================================================================
// createCategory Tests
// ============================================================================

describe('createCategory', () => {
  it('should create and return the new category', async () => {
    const deps = createMockCategoryDeps();
    const input: UncommittedICategory = {
      name: 'New Category',
      children: [],
      products: [],
      description: 'A test category',
      display_flags: createMockCategoryDisplayFlags(),
      serviceDisable: [],
    };
    const expected: ICategory = { id: 'new-cat-id', ...input };

    (deps.categoryRepository.create as jest.Mock).mockResolvedValue(expected);

    const result = await createCategory(deps, input);

    assertIsCategory(result);
    expect(result.id).toBe('new-cat-id');
    expect(result.name).toBe('New Category');
    expect(deps.categoryRepository.create).toHaveBeenCalledWith(input);
  });
});

// ============================================================================
// updateCategory Tests
// ============================================================================

describe('updateCategory', () => {
  it('should update and return the modified category', async () => {
    const catalog = createTestCatalog();
    const deps = createMockCategoryDeps({ catalog: { categories: Object.values(catalog.categories) } });
    const categoryId = 'child-cat';
    const updates = { name: 'Updated Child Category' };
    const expected = createMockCategory({ id: categoryId, name: 'Updated Child Category' });

    (deps.categoryRepository.update as jest.Mock).mockResolvedValue(expected);

    const result = await updateCategory(deps, categoryId, updates);

    assertIsCategory(result);
    expect(result.name).toBe('Updated Child Category');
    expect(deps.categoryRepository.update).toHaveBeenCalledWith(categoryId, updates);
  });

  it('should throw error when updating non-existent category', async () => {
    const catalog = createTestCatalog();
    const deps = createMockCategoryDeps({ catalog: { categories: Object.values(catalog.categories) } });

    await expect(updateCategory(deps, 'non-existent', { name: 'New Name' })).rejects.toThrow(
      'Category non-existent not found',
    );
  });

  it('should detect and prevent cycles with direct self-reference', async () => {
    const catalog = createTestCatalog();
    const deps = createMockCategoryDeps({ catalog: { categories: Object.values(catalog.categories) } });

    // Trying to make a category its own child would create a cycle
    await expect(updateCategory(deps, 'parent-cat', { children: ['parent-cat'] })).rejects.toThrow(
      /has a cycle if making.*a child/,
    );
  });

  it('should detect and prevent cycles with indirect reference', async () => {
    const catalog = createTestCatalog();
    const deps = createMockCategoryDeps({ catalog: { categories: Object.values(catalog.categories) } });

    // parent-cat -> child-cat, so making child-cat a parent of parent-cat creates a cycle
    await expect(updateCategory(deps, 'child-cat', { children: ['parent-cat'] })).rejects.toThrow(
      /has a cycle if making.*a child/,
    );
  });

  it('should allow valid children updates', async () => {
    const catalog = createTestCatalog();
    const deps = createMockCategoryDeps({ catalog: { categories: Object.values(catalog.categories) } });
    const expected = createMockCategory({ id: 'parent-cat', children: ['orphan-cat'] });

    (deps.categoryRepository.update as jest.Mock).mockResolvedValue(expected);

    // orphan-cat has no children, so adding it to parent-cat should work
    const result = await updateCategory(deps, 'parent-cat', { children: ['orphan-cat'] });

    expect(result).not.toBeNull();
    expect(deps.categoryRepository.update).toHaveBeenCalled();
  });
});

// ============================================================================
// deleteCategory Tests
// ============================================================================

describe('deleteCategory', () => {
  it('should delete category and return result with no products modified when empty', async () => {
    const catalog = createTestCatalog();
    const deps = createMockCategoryDeps({ catalog: { categories: Object.values(catalog.categories) } });
    const categoryId = 'orphan-cat';
    const existing = createMockCategory({ id: categoryId, name: 'Orphan Category', products: [] });

    (deps.categoryRepository.findById as jest.Mock).mockResolvedValue(existing);
    (deps.categoryRepository.delete as jest.Mock).mockResolvedValue(true);
    (deps.categoryRepository.update as jest.Mock).mockResolvedValue(null);

    const result = await deleteCategory(deps, categoryId, false);

    expect(result.deleted).toEqual(existing);
    expect(result.productsModified).toBe(false);
    expect(deps.categoryRepository.delete).toHaveBeenCalledWith(categoryId);
  });

  it('should delete category and its products when deleteContainedProducts is true', async () => {
    const catalog = createTestCatalog();
    const deps = createMockCategoryDeps({ catalog: { categories: Object.values(catalog.categories) } });
    const categoryId = 'child-cat';
    const existing = createMockCategory({
      id: categoryId,
      name: 'Child Category',
      products: ['product-1', 'product-2'],
      children: [],
    });

    (deps.categoryRepository.findById as jest.Mock).mockResolvedValue(existing);
    (deps.categoryRepository.delete as jest.Mock).mockResolvedValue(true);
    (deps.categoryRepository.update as jest.Mock).mockResolvedValue(null);
    (deps.batchDeleteProducts as jest.Mock).mockResolvedValue(undefined);

    const result = await deleteCategory(deps, categoryId, true);

    expect(result.deleted).toEqual(existing);
    expect(result.productsModified).toBe(true);
    expect(deps.batchDeleteProducts).toHaveBeenCalledWith(['product-1', 'product-2'], true);
  });

  it('should return null when category does not exist', async () => {
    const catalog = createTestCatalog();
    const deps = createMockCategoryDeps({ catalog: { categories: Object.values(catalog.categories) } });

    (deps.categoryRepository.findById as jest.Mock).mockResolvedValue(null);

    const result = await deleteCategory(deps, 'non-existent', false);

    expect(result.deleted).toBeNull();
    expect(result.productsModified).toBe(false);
    expect(deps.categoryRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw error when category is used as fulfillment menu base', async () => {
    const fulfillments: Record<string, FulfillmentConfig> = {
      'fulfill-1': {
        id: 'fulfill-1',
        displayName: 'Dine In',
        menuBaseCategoryId: 'child-cat',
        orderBaseCategoryId: 'other-cat',
        orderSupplementaryCategoryId: null,
      } as FulfillmentConfig,
    };
    const catalog = createTestCatalog();
    const deps = createMockCategoryDeps({
      catalog: { categories: Object.values(catalog.categories) },
      fulfillments,
    });

    await expect(deleteCategory(deps, 'child-cat', false)).rejects.toThrow(/found as Menu Base for FulfillmentId/);
  });

  it('should throw error when category is used as fulfillment order base', async () => {
    const fulfillments: Record<string, FulfillmentConfig> = {
      'fulfill-1': {
        id: 'fulfill-1',
        displayName: 'Takeout',
        menuBaseCategoryId: 'other-cat',
        orderBaseCategoryId: 'child-cat',
        orderSupplementaryCategoryId: null,
      } as FulfillmentConfig,
    };
    const catalog = createTestCatalog();
    const deps = createMockCategoryDeps({
      catalog: { categories: Object.values(catalog.categories) },
      fulfillments,
    });

    await expect(deleteCategory(deps, 'child-cat', false)).rejects.toThrow(/found as Order Base for FulfillmentId/);
  });

  it('should remove deleted category from parent category children arrays', async () => {
    const catalog = createTestCatalog();
    const deps = createMockCategoryDeps({ catalog: { categories: Object.values(catalog.categories) } });
    const categoryId = 'child-cat';
    const existing = createMockCategory({
      id: categoryId,
      name: 'Child Category',
      products: [],
      children: [],
    });

    (deps.categoryRepository.findById as jest.Mock).mockResolvedValue(existing);
    (deps.categoryRepository.delete as jest.Mock).mockResolvedValue(true);
    (deps.categoryRepository.update as jest.Mock).mockResolvedValue(null);

    await deleteCategory(deps, categoryId, false);

    // parent-cat should be updated to remove child-cat from its children array
    expect(deps.categoryRepository.update).toHaveBeenCalledWith('parent-cat', { children: [] });
  });
});
