/* eslint-disable @typescript-eslint/unbound-method */
/**
 * ProductController Unit Tests
 *
 * Tests for the product CRUD API endpoints:
 * - POST /api/v1/menu/product (create product class)
 * - POST /api/v1/menu/product/batch (batch create)
 * - PATCH /api/v1/menu/product/:pid (update product)
 * - DELETE /api/v1/menu/product/:pid (delete product)
 * - POST /api/v1/menu/product/:pid (create product instance)
 * - PATCH /api/v1/menu/product/:pid/:piid (update instance)
 * - DELETE /api/v1/menu/product/:pid/:piid (delete instance)
 */

import {
  createMockCreateProductRequest,
  createMockProduct,
  createMockProductInstance,
  mockCatalogProviderService,
  mockSocketIoService,
} from 'test/utils';

import { Test, type TestingModule } from '@nestjs/testing';

import { SocketIoService } from 'src/infrastructure/messaging/socket-io/socket-io.service';
import { CatalogProviderService } from 'src/modules/catalog-provider/catalog-provider.service';

import {
  CatalogOperationException,
  ProductInstanceNotFoundException,
  ProductNotFoundException,
} from '../../exceptions';

import { ProductController } from './product.controller';

describe('ProductController', () => {
  let controller: ProductController;
  let mockCatalogService: jest.Mocked<CatalogProviderService>;
  let mockSocketService: jest.Mocked<SocketIoService>;

  beforeEach(async () => {
    mockCatalogService = mockCatalogProviderService();
    mockSocketService = mockSocketIoService();

    // Setup Catalog getter
    Object.defineProperty(mockCatalogService, 'Catalog', {
      get: () => ({ version: '1.0' }),
      configurable: true,
    });

    // Setup CatalogSelectors for patchProductInstance
    // In 2025 schema, productEntry returns IProduct directly (no .product wrapper)
    Object.defineProperty(mockCatalogService, 'CatalogSelectors', {
      get: () => ({
        productEntry: jest.fn().mockReturnValue(createMockProduct({ id: 'prod-123' })),
      }),
      configurable: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        { provide: CatalogProviderService, useValue: mockCatalogService },
        { provide: SocketIoService, useValue: mockSocketService },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
  });

  // =========================================================================
  // POST /api/v1/menu/product Tests
  // =========================================================================

  describe('postProductClass', () => {
    it('should create product and emit catalog', async () => {
      const mockProduct = createMockProduct({ id: 'prod-new' });
      (mockCatalogService.CreateProduct as jest.Mock).mockResolvedValue(mockProduct);

      const body = createMockCreateProductRequest();
      const result = await controller.postProductClass(body);

      expect(result).toEqual(mockProduct);
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });

    it('should throw CatalogOperationException when creation fails', async () => {
      (mockCatalogService.CreateProduct as jest.Mock).mockResolvedValue(null);

      const body = createMockCreateProductRequest();
      await expect(controller.postProductClass(body)).rejects.toThrow(CatalogOperationException);
    });
  });

  // =========================================================================
  // PATCH /api/v1/menu/product/:pid Tests
  // =========================================================================

  describe('patchProductClass', () => {
    it('should update product and emit catalog', async () => {
      const mockProduct = createMockProduct({ id: 'prod-123' });
      (mockCatalogService.UpdateProduct as jest.Mock).mockResolvedValue(mockProduct);

      const result = await controller.patchProductClass(
        'prod-123',
        {} as Parameters<typeof controller.patchProductClass>[1],
      );

      expect(result).toEqual(mockProduct);
      expect(mockCatalogService.UpdateProduct).toHaveBeenCalledWith('prod-123', expect.anything());
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });

    it('should throw ProductNotFoundException when product not found', async () => {
      (mockCatalogService.UpdateProduct as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.patchProductClass('nonexistent', {} as Parameters<typeof controller.patchProductClass>[1]),
      ).rejects.toThrow(ProductNotFoundException);
    });
  });

  // =========================================================================
  // DELETE /api/v1/menu/product/:pid Tests
  // =========================================================================

  describe('deleteProductClass', () => {
    it('should delete product and emit catalog', async () => {
      const mockProduct = createMockProduct({ id: 'prod-123' });
      (mockCatalogService.DeleteProduct as jest.Mock).mockResolvedValue(mockProduct);

      const result = await controller.deleteProductClass('prod-123');

      expect(result).toEqual(mockProduct);
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });

    it('should throw ProductNotFoundException when product not found', async () => {
      (mockCatalogService.DeleteProduct as jest.Mock).mockResolvedValue(null);

      await expect(controller.deleteProductClass('nonexistent')).rejects.toThrow(ProductNotFoundException);
    });
  });

  // =========================================================================
  // POST /api/v1/menu/product/:pid (Product Instance) Tests
  // =========================================================================

  describe('postProductInstance', () => {
    it('should create product instance and emit catalog', async () => {
      // productId is no longer on IProductInstance in 2025 schema
      const mockInstance = createMockProductInstance({
        id: 'pi-new',
      });
      (mockCatalogService.CreateProductInstance as jest.Mock).mockResolvedValue(mockInstance);

      const body = { displayName: 'New Instance' };
      const result = await controller.postProductInstance(
        'prod-123',
        body as Parameters<typeof controller.postProductInstance>[1],
      );

      expect(result).toEqual(mockInstance);
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });

    it('should throw ProductNotFoundException when product not found', async () => {
      (mockCatalogService.CreateProductInstance as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.postProductInstance('nonexistent', {} as Parameters<typeof controller.postProductInstance>[1]),
      ).rejects.toThrow(ProductNotFoundException);
    });
  });

  // =========================================================================
  // DELETE /api/v1/menu/product/:pid/:piid Tests
  // =========================================================================

  describe('deleteProductInstance', () => {
    it('should delete product instance and emit catalog', async () => {
      const mockInstance = createMockProductInstance({ id: 'pi-123' });
      (mockCatalogService.DeleteProductInstance as jest.Mock).mockResolvedValue(mockInstance);

      const result = await controller.deleteProductInstance('pi-123');

      expect(result).toEqual(mockInstance);
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });

    it('should throw ProductInstanceNotFoundException when instance not found', async () => {
      (mockCatalogService.DeleteProductInstance as jest.Mock).mockResolvedValue(null);

      await expect(controller.deleteProductInstance('nonexistent')).rejects.toThrow(ProductInstanceNotFoundException);
    });
  });
});
