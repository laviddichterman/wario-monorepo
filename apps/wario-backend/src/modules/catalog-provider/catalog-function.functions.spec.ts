/**
 * Unit tests for catalog-function.functions.ts
 *
 * Tests the pure CRUD functions for ProductInstanceFunction and OrderInstanceFunction.
 */
/* eslint-disable @typescript-eslint/unbound-method */

import {
  ConstLiteralDiscriminator,
  type IProductInstanceFunction,
  type OrderInstanceFunction,
  OrderInstanceFunctionType,
  ProductInstanceFunctionType,
} from '@wcp/wario-shared';

import { createMockFunctionDeps } from '../../../test/utils';

import {
  createOrderInstanceFunction,
  createProductInstanceFunction,
  deleteOrderInstanceFunction,
  deleteProductInstanceFunction,
  updateOrderInstanceFunction,
  updateProductInstanceFunction,
} from './catalog-function.functions';

// ============================================================================
// Type Assertion Helpers
// ============================================================================

function assertIsProductInstanceFunction(value: unknown): asserts value is IProductInstanceFunction {
  const fn = value as IProductInstanceFunction;
  expect(fn).toHaveProperty('id');
  expect(fn).toHaveProperty('name');
  expect(fn).toHaveProperty('expression');
}

function assertIsOrderInstanceFunction(value: unknown): asserts value is OrderInstanceFunction {
  const fn = value as OrderInstanceFunction;
  expect(fn).toHaveProperty('id');
  expect(fn).toHaveProperty('name');
  expect(fn).toHaveProperty('expression');
}

// ============================================================================
// Mock Data Factories
// ============================================================================

function createMockProductInstanceFunctionInput(): Omit<IProductInstanceFunction, 'id'> {
  return {
    name: 'Test PIF',
    expression: {
      discriminator: ProductInstanceFunctionType.ConstLiteral,
      expr: {
        discriminator: ConstLiteralDiscriminator.BOOLEAN,
        value: true,
      },
    },
  };
}

function createMockProductInstanceFunctionEntity(id = 'pif-1'): IProductInstanceFunction {
  return {
    id,
    ...createMockProductInstanceFunctionInput(),
  };
}

function createMockOrderInstanceFunctionInput(): Omit<OrderInstanceFunction, 'id'> {
  return {
    name: 'Test OIF',
    expression: {
      discriminator: OrderInstanceFunctionType.ConstLiteral,
      expr: {
        discriminator: ConstLiteralDiscriminator.BOOLEAN,
        value: true,
      },
    },
  };
}

function createMockOrderInstanceFunctionEntity(id = 'oif-1'): OrderInstanceFunction {
  return {
    id,
    ...createMockOrderInstanceFunctionInput(),
  };
}

// ============================================================================
// ProductInstanceFunction Tests
// ============================================================================

describe('ProductInstanceFunction Operations', () => {
  describe('createProductInstanceFunction', () => {
    it('should create and return the new product instance function', async () => {
      const deps = createMockFunctionDeps();
      const input = createMockProductInstanceFunctionInput();
      const expected = { id: 'new-pif-id', ...input };

      (deps.productInstanceFunctionRepository.create as jest.Mock).mockResolvedValue(expected);

      const result = await createProductInstanceFunction(deps, input);

      assertIsProductInstanceFunction(result);
      expect(result.id).toBe('new-pif-id');
      expect(result.name).toBe('Test PIF');
      expect(deps.productInstanceFunctionRepository.create).toHaveBeenCalledWith(input);
    });
  });

  describe('updateProductInstanceFunction', () => {
    it('should update and return the modified product instance function', async () => {
      const deps = createMockFunctionDeps();
      const pifId = 'pif-1';
      const updates = { name: 'Updated PIF Name' };
      const expected = { id: pifId, name: 'Updated PIF Name', expression: { discriminator: 'ALWAYS', const: true } };

      (deps.productInstanceFunctionRepository.update as jest.Mock).mockResolvedValue(expected);

      const result = await updateProductInstanceFunction(deps, pifId, updates);

      assertIsProductInstanceFunction(result);
      expect(result.name).toBe('Updated PIF Name');
      expect(deps.productInstanceFunctionRepository.update).toHaveBeenCalledWith(pifId, updates);
    });

    it('should return null when updating non-existent function', async () => {
      const deps = createMockFunctionDeps();
      (deps.productInstanceFunctionRepository.update as jest.Mock).mockResolvedValue(null);

      const result = await updateProductInstanceFunction(deps, 'non-existent', { name: 'New Name' });

      expect(result).toBeNull();
    });
  });

  describe('deleteProductInstanceFunction', () => {
    it('should delete function and clear references from options and products', async () => {
      const deps = createMockFunctionDeps();
      const pifId = 'pif-1';
      const existing = createMockProductInstanceFunctionEntity(pifId);

      (deps.productInstanceFunctionRepository.findById as jest.Mock).mockResolvedValue(existing);
      (deps.productInstanceFunctionRepository.delete as jest.Mock).mockResolvedValue(true);
      (deps.optionRepository.clearEnableField as jest.Mock).mockResolvedValue(3);
      (deps.productRepository.clearModifierEnableField as jest.Mock).mockResolvedValue(2);

      const result = await deleteProductInstanceFunction(deps, pifId);

      expect(result.deleted).toEqual(existing);
      expect(result.optionsModified).toBe(3);
      expect(result.productsModified).toBe(2);
      expect(deps.productInstanceFunctionRepository.delete).toHaveBeenCalledWith(pifId);
      expect(deps.optionRepository.clearEnableField).toHaveBeenCalledWith(pifId);
      expect(deps.productRepository.clearModifierEnableField).toHaveBeenCalledWith(pifId);
    });

    it('should return null and zero counts when function does not exist', async () => {
      const deps = createMockFunctionDeps();
      (deps.productInstanceFunctionRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await deleteProductInstanceFunction(deps, 'non-existent');

      expect(result.deleted).toBeNull();
      expect(result.optionsModified).toBe(0);
      expect(result.productsModified).toBe(0);
      expect(deps.productInstanceFunctionRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle deletion with no references in options or products', async () => {
      const deps = createMockFunctionDeps();
      const pifId = 'pif-orphan';
      const existing = createMockProductInstanceFunctionEntity(pifId);

      (deps.productInstanceFunctionRepository.findById as jest.Mock).mockResolvedValue(existing);
      (deps.productInstanceFunctionRepository.delete as jest.Mock).mockResolvedValue(true);
      (deps.optionRepository.clearEnableField as jest.Mock).mockResolvedValue(0);
      (deps.productRepository.clearModifierEnableField as jest.Mock).mockResolvedValue(0);

      const result = await deleteProductInstanceFunction(deps, pifId);

      expect(result.deleted).toEqual(existing);
      expect(result.optionsModified).toBe(0);
      expect(result.productsModified).toBe(0);
    });
  });
});

// ============================================================================
// OrderInstanceFunction Tests
// ============================================================================

describe('OrderInstanceFunction Operations', () => {
  describe('createOrderInstanceFunction', () => {
    it('should create and return the new order instance function', async () => {
      const deps = createMockFunctionDeps();
      const input = createMockOrderInstanceFunctionInput();
      const expected = { id: 'new-oif-id', ...input };

      (deps.orderInstanceFunctionRepository.create as jest.Mock).mockResolvedValue(expected);

      const result = await createOrderInstanceFunction(deps, input);

      assertIsOrderInstanceFunction(result);
      expect(result.id).toBe('new-oif-id');
      expect(result.name).toBe('Test OIF');
      expect(deps.orderInstanceFunctionRepository.create).toHaveBeenCalledWith(input);
    });
  });

  describe('updateOrderInstanceFunction', () => {
    it('should update and return the modified order instance function', async () => {
      const deps = createMockFunctionDeps();
      const oifId = 'oif-1';
      const updates = { name: 'Updated OIF Name' };
      const expected = { id: oifId, name: 'Updated OIF Name', expression: { discriminator: 'ALWAYS', const: true } };

      (deps.orderInstanceFunctionRepository.update as jest.Mock).mockResolvedValue(expected);

      const result = await updateOrderInstanceFunction(deps, oifId, updates);

      assertIsOrderInstanceFunction(result);
      expect(result.name).toBe('Updated OIF Name');
      expect(deps.orderInstanceFunctionRepository.update).toHaveBeenCalledWith(oifId, updates);
    });

    it('should return null when updating non-existent function', async () => {
      const deps = createMockFunctionDeps();
      (deps.orderInstanceFunctionRepository.update as jest.Mock).mockResolvedValue(null);

      const result = await updateOrderInstanceFunction(deps, 'non-existent', { name: 'New Name' });

      expect(result).toBeNull();
    });
  });

  describe('deleteOrderInstanceFunction', () => {
    it('should delete and return the order instance function', async () => {
      const deps = createMockFunctionDeps();
      const oifId = 'oif-1';
      const existing = createMockOrderInstanceFunctionEntity(oifId);

      (deps.orderInstanceFunctionRepository.findById as jest.Mock).mockResolvedValue(existing);
      (deps.orderInstanceFunctionRepository.delete as jest.Mock).mockResolvedValue(true);

      const result = await deleteOrderInstanceFunction(deps, oifId);

      assertIsOrderInstanceFunction(result);
      expect(result.id).toBe(oifId);
      expect(deps.orderInstanceFunctionRepository.delete).toHaveBeenCalledWith(oifId);
    });

    it('should return null when function does not exist', async () => {
      const deps = createMockFunctionDeps();
      (deps.orderInstanceFunctionRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await deleteOrderInstanceFunction(deps, 'non-existent');

      expect(result).toBeNull();
      expect(deps.orderInstanceFunctionRepository.delete).not.toHaveBeenCalled();
    });
  });
});
