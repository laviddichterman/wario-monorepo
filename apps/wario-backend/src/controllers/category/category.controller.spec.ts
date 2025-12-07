/* eslint-disable @typescript-eslint/unbound-method */
/**
 * CategoryController Unit Tests
 *
 * Tests for the category CRUD API endpoints:
 * - POST /api/v1/menu/category
 * - PATCH /api/v1/menu/category/:catid
 * - DELETE /api/v1/menu/category/:catid
 */

import { Test, type TestingModule } from '@nestjs/testing';

import { createMockCategory, mockCatalogProviderService, mockSocketIoService } from '../../../test/utils';
import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';
import { SocketIoService } from '../../config/socket-io/socket-io.service';
import { CategoryNotFoundException } from '../../exceptions';

import { CategoryController } from './category.controller';

describe('CategoryController', () => {
  let controller: CategoryController;
  let mockCatalogService: jest.Mocked<CatalogProviderService>;
  let mockSocketService: jest.Mocked<SocketIoService>;

  beforeEach(async () => {
    mockCatalogService = mockCatalogProviderService();
    mockSocketService = mockSocketIoService();

    // Setup Catalog getter for EmitCatalog calls
    Object.defineProperty(mockCatalogService, 'Catalog', {
      get: () => ({ version: '1.0' }),
      configurable: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        { provide: CatalogProviderService, useValue: mockCatalogService },
        { provide: SocketIoService, useValue: mockSocketService },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
  });

  // =========================================================================
  // POST /api/v1/menu/category Tests
  // =========================================================================

  describe('postCategory', () => {
    it('should create category and emit catalog', async () => {
      const mockCategory = createMockCategory({ id: 'cat-new', name: 'New Category' });
      mockCatalogService.CreateCategory.mockResolvedValue(mockCategory);

      const body = { name: 'New Category', description: '', subheading: '' };
      const result = await controller.postCategory(body as Parameters<typeof controller.postCategory>[0]);

      expect(result).toEqual(mockCategory);
      expect(mockCatalogService.CreateCategory).toHaveBeenCalledWith(body);
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // PATCH /api/v1/menu/category/:catid Tests
  // =========================================================================

  describe('patchCategory', () => {
    it('should update category and emit catalog', async () => {
      const mockCategory = createMockCategory({ id: 'cat-123', name: 'Updated Name' });
      mockCatalogService.UpdateCategory.mockResolvedValue(mockCategory);

      const body = { name: 'Updated Name' };
      const result = await controller.patchCategory('cat-123', body);

      expect(result).toEqual(mockCategory);
      expect(mockCatalogService.UpdateCategory).toHaveBeenCalledWith('cat-123', body);
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });

    it('should throw CategoryNotFoundException when category not found', async () => {
      mockCatalogService.UpdateCategory.mockResolvedValue(null);

      await expect(controller.patchCategory('nonexistent', { name: 'Test' })).rejects.toThrow(
        CategoryNotFoundException,
      );
    });
  });

  // =========================================================================
  // DELETE /api/v1/menu/category/:catid Tests
  // =========================================================================

  describe('deleteCategory', () => {
    it('should delete category and emit catalog', async () => {
      const mockCategory = createMockCategory({ id: 'cat-123' });
      mockCatalogService.DeleteCategory.mockResolvedValue(mockCategory);

      const result = await controller.deleteCategory('cat-123', {});

      expect(result).toEqual(mockCategory);
      expect(mockCatalogService.DeleteCategory).toHaveBeenCalledWith('cat-123', false);
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });

    it('should pass delete_contained_products flag', async () => {
      const mockCategory = createMockCategory({ id: 'cat-123' });
      mockCatalogService.DeleteCategory.mockResolvedValue(mockCategory);

      await controller.deleteCategory('cat-123', { delete_contained_products: true });

      expect(mockCatalogService.DeleteCategory).toHaveBeenCalledWith('cat-123', true);
    });

    it('should throw CategoryNotFoundException when category not found', async () => {
      mockCatalogService.DeleteCategory.mockResolvedValue(null);

      await expect(controller.deleteCategory('nonexistent', {})).rejects.toThrow(CategoryNotFoundException);
    });
  });
});
