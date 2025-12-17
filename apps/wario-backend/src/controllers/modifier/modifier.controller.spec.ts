/* eslint-disable @typescript-eslint/unbound-method */
/**
 * ModifierController Unit Tests
 *
 * Tests for the modifier (option type and option) CRUD API endpoints:
 * - POST /api/v1/menu/option/type (create modifier type)
 * - PUT /api/v1/menu/option/type (update modifier type)
 * - DELETE /api/v1/menu/option/type/:id (delete modifier type)
 * - POST /api/v1/menu/option/option (create option)
 * - PUT /api/v1/menu/option/option (update option)
 * - DELETE /api/v1/menu/option/option/:id (delete option)
 */

import { Test, type TestingModule } from '@nestjs/testing';

import type { IOption, IOptionType } from '@wcp/wario-shared';

import {
  createMockCreateOptionRequest,
  createMockCreateOptionTypeRequest,
  createMockOption,
  createMockOptionType,
  mockCatalogProviderService,
  mockSocketIoService,
} from 'test/utils';
import { CatalogProviderService } from 'src/modules/catalog-provider/catalog-provider.service';
import { SocketIoService } from 'src/config/socket-io/socket-io.service';

import { ModifierController } from './modifier.controller';

/**
 * Helper to assert that a value satisfies the IOptionType interface.
 * This provides compile-time type checking without runtime overhead.
 */
function assertIsOptionType(value: unknown): asserts value is IOptionType {
  const optionType = value as IOptionType;
  expect(optionType).toHaveProperty('id');
  expect(optionType).toHaveProperty('name');
  // ordinal removed in 2025 schema
  expect(optionType).toHaveProperty('min_selected');
  expect(optionType).toHaveProperty('max_selected');
  expect(optionType).toHaveProperty('displayFlags');
}

/**
 * Helper to assert that a value satisfies the IOption interface.
 */
function assertIsOption(value: unknown): asserts value is IOption {
  const option = value as IOption;
  expect(option).toHaveProperty('id');
  expect(option).toHaveProperty('displayName');
  // modifierTypeId and ordinal removed in 2025 schema
  expect(option).toHaveProperty('price');
}

describe('ModifierController', () => {
  let controller: ModifierController;
  let mockCatalogService: ReturnType<typeof mockCatalogProviderService>;
  let mockSocketService: ReturnType<typeof mockSocketIoService>;

  beforeEach(async () => {
    mockCatalogService = mockCatalogProviderService();
    mockSocketService = mockSocketIoService();

    // Setup Catalog getter
    Object.defineProperty(mockCatalogService, 'Catalog', {
      get: () => ({ version: '1.0' }),
      configurable: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModifierController],
      providers: [
        { provide: CatalogProviderService, useValue: mockCatalogService },
        { provide: SocketIoService, useValue: mockSocketService },
      ],
    }).compile();

    controller = module.get<ModifierController>(ModifierController);
  });

  // =========================================================================
  // POST /api/v1/menu/option/type Tests (Modifier Type)
  // =========================================================================

  describe('CreateModifierType', () => {
    it('should create modifier type and emit catalog', async () => {
      const mockModifierType = createMockOptionType({ id: 'mt-new', name: 'Toppings' });
      (mockCatalogService.CreateModifierType as jest.Mock).mockResolvedValue(mockModifierType);

      const body = createMockCreateOptionTypeRequest(
        { options: [] },
        { name: 'Toppings', min_selected: 0, max_selected: 5 },
      );
      const result = await controller.CreateModifierType(body);

      // Verify result satisfies IOptionType interface
      assertIsOptionType(result);
      expect(result.id).toBe('mt-new');
      expect(result.name).toBe('Toppings');
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });
  });

  describe('UpdateModifierType', () => {
    it('should update modifier type and emit catalog', async () => {
      const mockModifierType = createMockOptionType({ id: 'mt-123', name: 'Updated Toppings' });
      (mockCatalogService.UpdateModifierType as jest.Mock).mockResolvedValue(mockModifierType);

      const result = await controller.UpdateModifierType('mt-123', { name: 'Updated Toppings' });

      // Verify result satisfies IOptionType interface
      assertIsOptionType(result);
      expect(result.id).toBe('mt-123');
      expect(result.name).toBe('Updated Toppings');
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });
  });

  describe('DeleteModifierType', () => {
    it('should delete modifier type and emit catalog', async () => {
      const mockModifierType = createMockOptionType({ id: 'mt-123' });
      (mockCatalogService.DeleteModifierType as jest.Mock).mockResolvedValue(mockModifierType);

      const result = await controller.DeleteModifierType('mt-123');

      // Verify result satisfies IOptionType interface
      assertIsOptionType(result);
      expect(result.id).toBe('mt-123');
      expect(mockCatalogService.DeleteModifierType).toHaveBeenCalledWith('mt-123');
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // POST /api/v1/menu/option/option Tests (Option)
  // =========================================================================

  describe('CreateOption', () => {
    it('should create option and emit catalog', async () => {
      const mockOption = createMockOption({ id: 'opt-new', displayName: 'Pepperoni' });
      (mockCatalogService.CreateOption as jest.Mock).mockResolvedValue(mockOption);

      const body = createMockCreateOptionRequest({ displayName: 'Pepperoni' });
      const modifierTypeId = 'mt-123';
      const result = await controller.CreateOption(body, modifierTypeId);

      // Verify result satisfies IOption interface
      assertIsOption(result);
      expect(result.id).toBe('opt-new');
      expect(result.displayName).toBe('Pepperoni');
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });
  });

  describe('UpdateModifierOption', () => {
    it('should update option and emit catalog', async () => {
      const mockOption = createMockOption({ id: 'opt-123', displayName: 'Updated Pepperoni' });
      (mockCatalogService.UpdateModifierOption as jest.Mock).mockResolvedValue(mockOption);

      const body = {
        id: 'opt-123',
        modifierTypeId: 'mt-123',
        modifierOption: { displayName: 'Updated Pepperoni' },
      };
      const result = await controller.UpdateModifierOption(
        body as Parameters<typeof controller.UpdateModifierOption>[0],
        body.id,
        body.modifierTypeId,
      );

      // Verify result satisfies IOption interface
      assertIsOption(result);
      expect(result.id).toBe('opt-123');
      expect(result.displayName).toBe('Updated Pepperoni');
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });
  });

  describe('DeleteModifierOption', () => {
    it('should delete option and emit catalog', async () => {
      const mockOption = createMockOption({ id: 'opt-123' });
      (mockCatalogService.DeleteModifierOption as jest.Mock).mockResolvedValue(mockOption);

      const modifierTypeId = 'mt-123';
      const optionId = 'opt-123';
      const result = await controller.DeleteModifierOption(optionId, modifierTypeId);

      // Verify result satisfies IOption interface
      assertIsOption(result);
      expect(result.id).toBe('opt-123');
      expect(mockCatalogService.DeleteModifierOption).toHaveBeenCalledWith(modifierTypeId, optionId);
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });
  });
});
