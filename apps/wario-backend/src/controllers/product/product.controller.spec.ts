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
  createMockUpdateProductRequest,
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

    // Setup getCatalogSelectors for patchProductInstance
    // In 2025 schema, productEntry returns IProduct directly (no .product wrapper)
    (mockCatalogService.getCatalogSelectors as jest.Mock).mockReturnValue({
      productEntry: jest.fn().mockReturnValue(createMockProduct({ id: 'prod-123' })),
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
  // POST /api/v1/menu/product/batch Tests
  // =========================================================================

  describe('batchPostProducts', () => {
    it('should batch upsert products and emit catalog', async () => {
      const mockProducts = [createMockProduct({ id: 'prod-1' }), createMockProduct({ id: 'prod-2' })];
      (mockCatalogService.BatchUpsertProduct as jest.Mock).mockResolvedValue(mockProducts);

      const body = { products: [createMockCreateProductRequest(), createMockCreateProductRequest()] };
      const result = await controller.batchPostProducts(body as Parameters<typeof controller.batchPostProducts>[0]);

      expect(result).toEqual(mockProducts);
      expect(mockCatalogService.BatchUpsertProduct).toHaveBeenCalledWith(body.products);
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });

    it('should throw CatalogOperationException when batch upsert fails', async () => {
      (mockCatalogService.BatchUpsertProduct as jest.Mock).mockResolvedValue(null);

      const body = { products: [createMockCreateProductRequest()] };
      await expect(
        controller.batchPostProducts(body as Parameters<typeof controller.batchPostProducts>[0]),
      ).rejects.toThrow(CatalogOperationException);
    });
  });

  // =========================================================================
  // PATCH /api/v1/menu/product/:pid Tests
  // =========================================================================

  describe('patchProductClass', () => {
    it('should update product and emit catalog', async () => {
      const mockProduct = createMockProduct({ id: 'prod-123' });
      (mockCatalogService.UpdateProduct as jest.Mock).mockResolvedValue(mockProduct);

      const body = createMockUpdateProductRequest({ id: 'prod-123' });
      const result = await controller.patchProductClass('prod-123', body);

      expect(result).toEqual(mockProduct);
      expect(mockCatalogService.UpdateProduct).toHaveBeenCalledWith(body);
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });

    it('should throw ProductNotFoundException when product not found', async () => {
      (mockCatalogService.UpdateProduct as jest.Mock).mockResolvedValue(null);

      const body = createMockUpdateProductRequest({ id: 'nonexistent' });
      await expect(controller.patchProductClass('nonexistent', body)).rejects.toThrow(ProductNotFoundException);
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
  // POST /api/v1/menu/product/batch/batchDelete Tests
  // =========================================================================

  describe('batchDeleteProductClasses', () => {
    it('should batch delete products and emit catalog', async () => {
      const deleteResult = { deletedCount: 2, acknowledged: true };
      (mockCatalogService.BatchDeleteProduct as jest.Mock).mockResolvedValue(deleteResult);

      const body = { pids: ['prod-1', 'prod-2'] };
      const result = await controller.batchDeleteProductClasses(
        body as Parameters<typeof controller.batchDeleteProductClasses>[0],
      );

      expect(result).toEqual(deleteResult);
      expect(mockCatalogService.BatchDeleteProduct).toHaveBeenCalledWith(body.pids);
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });

    it('should throw CatalogOperationException when batch delete fails', async () => {
      (mockCatalogService.BatchDeleteProduct as jest.Mock).mockResolvedValue(null);

      const body = { pids: ['prod-1'] };
      await expect(
        controller.batchDeleteProductClasses(body as Parameters<typeof controller.batchDeleteProductClasses>[0]),
      ).rejects.toThrow(CatalogOperationException);
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
  // PATCH /api/v1/menu/product/:pid/:piid Tests
  // =========================================================================

  describe('patchProductInstance', () => {
    it('should update product instance and emit catalog', async () => {
      const mockInstance = createMockProductInstance({ id: 'pi-123' });
      (mockCatalogService.UpdateProductInstance as jest.Mock).mockResolvedValue(mockInstance);

      const body = { displayName: 'Updated Instance' };
      const result = await controller.patchProductInstance(
        'prod-123',
        'pi-123',
        body as Parameters<typeof controller.patchProductInstance>[2],
      );

      expect(result).toEqual(mockInstance);
      expect(mockCatalogService.UpdateProductInstance).toHaveBeenCalledWith({
        piid: 'pi-123',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        product: expect.objectContaining({ id: 'prod-123' }),
        productInstance: body,
      });
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });

    it('should throw ProductNotFoundException when product not found', async () => {
      // Override getCatalogSelectors to return null for productEntry
      (mockCatalogService.getCatalogSelectors as jest.Mock).mockReturnValue({
        productEntry: jest.fn().mockReturnValue(null),
      });

      const body = { displayName: 'Updated Instance' };
      await expect(
        controller.patchProductInstance(
          'nonexistent',
          'pi-123',
          body as Parameters<typeof controller.patchProductInstance>[2],
        ),
      ).rejects.toThrow(ProductNotFoundException);
    });

    it('should throw ProductInstanceNotFoundException when instance not found', async () => {
      (mockCatalogService.UpdateProductInstance as jest.Mock).mockResolvedValue(null);

      const body = { displayName: 'Updated Instance' };
      await expect(
        controller.patchProductInstance(
          'prod-123',
          'nonexistent',
          body as Parameters<typeof controller.patchProductInstance>[2],
        ),
      ).rejects.toThrow(ProductInstanceNotFoundException);
    });
  });

  // =========================================================================
  // DELETE /api/v1/menu/product/:pid/:piid Tests
  // =========================================================================

  describe('deleteProductInstance', () => {
    it('should delete product instance and emit catalog', async () => {
      const mockInstance = createMockProductInstance({ id: 'pi-123' });
      (mockCatalogService.DeleteProductInstance as jest.Mock).mockResolvedValue(mockInstance);

      const result = await controller.deleteProductInstance('prod-123', 'pi-123');

      expect(result).toEqual(mockInstance);
      expect(mockCatalogService.DeleteProductInstance).toHaveBeenCalledWith('prod-123', 'pi-123');
      expect(mockSocketService.EmitCatalog).toHaveBeenCalled();
    });

    it('should throw ProductInstanceNotFoundException when instance not found', async () => {
      // Service now throws directly instead of returning null
      (mockCatalogService.DeleteProductInstance as jest.Mock).mockRejectedValue(
        new ProductInstanceNotFoundException('nonexistent'),
      );

      await expect(controller.deleteProductInstance('prod-123', 'nonexistent')).rejects.toThrow(
        ProductInstanceNotFoundException,
      );
    });
  });
});
