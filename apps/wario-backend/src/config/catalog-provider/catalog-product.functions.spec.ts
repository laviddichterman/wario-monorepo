/* eslint-disable @typescript-eslint/unbound-method */
/**
 * Unit Tests for batchUpsertProduct
 *
 * Tests covering key permutations: create products, update products (noOp instances,
 * explicit updates, insert new instances), validation failures, and Square API failures.
 */

import { type UpdateIProductRequest } from '@wcp/wario-shared';

import {
  createMockBatchUpsertResponse,
  createMockCreateProductInstanceRequest,
  createMockCreateProductRequest,
  createMockOptionType,
  createMockProduct,
  createMockProductDeps,
  createMockProductInstance,
  createSquareFailureResponse,
  createSquareSuccessResponse,
  SquareIdMappingTracker,
} from '../../../test/utils';

import { batchUpsertProduct } from './catalog-product.functions';

describe('batchUpsertProduct', () => {
  let tracker: SquareIdMappingTracker;

  beforeEach(() => {
    tracker = new SquareIdMappingTracker();
  });

  // ==========================================================================
  // CREATE SCENARIOS
  // ==========================================================================

  describe('Create scenarios', () => {
    it('should create a single product with one instance', async () => {
      // No need for existing catalog, just provide empty arrays or minimal deps
      const deps = createMockProductDeps({});

      const instance = createMockProductInstance({
        displayName: 'Cheese Pizza',
        shortcode: 'CHZ',
        description: 'Classic cheese pizza',
        modifiers: [],
      });

      const product = createMockProduct({
        instances: [], // Will be added as uncommitted instances
        modifiers: [],
        price: { amount: 1200, currency: 'USD' as const },
        printerGroup: null,
      });

      const createRequest = createMockCreateProductRequest(
        { instances: [createMockCreateProductInstanceRequest({}, instance)] },
        product,
      );

      const createdInstanceId = 'pi_created_1';
      const createdProductId = 'prod_created_1';

      (deps.productInstanceRepository.bulkCreate as jest.Mock).mockResolvedValue([
        { ...instance, id: createdInstanceId },
      ]);

      (deps.productRepository.bulkCreate as jest.Mock).mockResolvedValue([
        { ...product, id: createdProductId, instances: [createdInstanceId] },
      ]);

      (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
      );

      const result = await batchUpsertProduct(deps, [createRequest]);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result).toHaveLength(1);
      expect(result[0].product.id).toBe(createdProductId);
      expect(result[0].instances).toHaveLength(1);
      expect(result[0].instances[0].id).toBe(createdInstanceId);

      expect(deps.syncProducts).toHaveBeenCalled();
      expect(deps.syncProductInstances).toHaveBeenCalled();
      expect(deps.recomputeCatalog).toHaveBeenCalled();
    });

    it('should create a single product with multiple instances', async () => {
      const deps = createMockProductDeps({});

      const instance1 = createMockProductInstance({
        displayName: 'Small Pizza',
        shortcode: 'SM',
      });

      const instance2 = createMockProductInstance({
        displayName: 'Large Pizza',
        shortcode: 'LG',
      });

      const product = createMockProduct({
        instances: [],
        modifiers: [],
      });

      const createRequest = createMockCreateProductRequest(
        {
          instances: [
            createMockCreateProductInstanceRequest({}, instance1),
            createMockCreateProductInstanceRequest({}, instance2),
          ],
        },
        product,
      );

      const createdProductId = 'prod_1';

      (deps.productInstanceRepository.bulkCreate as jest.Mock).mockResolvedValue([
        { ...instance1, id: 'pi_1' },
        { ...instance2, id: 'pi_2' },
      ]);

      (deps.productRepository.bulkCreate as jest.Mock).mockResolvedValue([
        { ...product, id: createdProductId, instances: ['pi_1', 'pi_2'] },
      ]);

      (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
      );

      const result = await batchUpsertProduct(deps, [createRequest]);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result).toHaveLength(1);
      expect(result[0].instances).toHaveLength(2);
      expect(result[0].instances[0].id).toBe('pi_1');
      expect(result[0].instances[1].id).toBe('pi_2');
    });

    it('should batch create multiple products', async () => {
      const deps = createMockProductDeps({});

      const product1Instance = createMockProductInstance({
        displayName: 'Margherita',
        shortcode: 'MAR',
      });

      const product2Instance = createMockProductInstance({
        displayName: 'Pepperoni',
        shortcode: 'PEP',
      });

      const product1 = createMockProduct({ instances: [] });
      const product2 = createMockProduct({ instances: [] });

      const createRequest1 = createMockCreateProductRequest(
        { instances: [createMockCreateProductInstanceRequest({}, product1Instance)] },
        product1,
      );

      const createRequest2 = createMockCreateProductRequest(
        { instances: [createMockCreateProductInstanceRequest({}, product2Instance)] },
        product2,
      );

      (deps.productInstanceRepository.bulkCreate as jest.Mock).mockResolvedValue([
        { ...product1Instance, id: 'pi_1' },
        { ...product2Instance, id: 'pi_2' },
      ]);

      (deps.productRepository.bulkCreate as jest.Mock).mockResolvedValue([
        { ...product1, id: 'prod_1', instances: ['pi_1'] },
        { ...product2, id: 'prod_2', instances: ['pi_2'] },
      ]);

      (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
      );

      const result = await batchUpsertProduct(deps, [createRequest1, createRequest2]);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result).toHaveLength(2);
      expect(result[0].product.id).toBe('prod_1');
      expect(result[1].product.id).toBe('prod_2');
    });
  });

  // ==========================================================================
  // UPDATE SCENARIOS
  // ==========================================================================

  describe('Update scenarios', () => {
    it('should update product with noOp instances (pass-through)', async () => {
      const instance1 = createMockProductInstance({
        id: 'pi_1',
        displayName: 'Instance 1',
        shortcode: 'I1',
      });

      const instance2 = createMockProductInstance({
        id: 'pi_2',
        displayName: 'Instance 2',
        shortcode: 'I2',
      });

      const existingProduct = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1', 'pi_2'],
        price: { amount: 1000, currency: 'USD' as const },
      });

      const deps = createMockProductDeps({
        catalog: {
          products: [existingProduct],
          productInstances: [instance1, instance2],
        },
      });

      const updateRequest = {
        id: 'prod_1',
        price: { amount: 1200, currency: 'USD' as const },
        instances: ['pi_1', 'pi_2'], // noOp - bare string IDs
      };

      // Mock BatchRetrieveCatalogObjects (now called due to default Square external IDs)
      (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse({ objects: [], relatedObjects: [] }),
      );

      (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
      );

      (deps.productRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);

      const result = await batchUpsertProduct(deps, [updateRequest]);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result[0].product.id).toBe('prod_1');
      expect(result[0].instances).toHaveLength(2);
      expect(result[0].instances.map((i) => i.id)).toEqual(['pi_1', 'pi_2']);
    });

    it('should handle explicit instance updates', async () => {
      const existingInstance = createMockProductInstance({
        id: 'pi_1',
        displayName: 'Old Name',
        shortcode: 'OLD',
      });

      const existingProduct = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1'],
      });

      const deps = createMockProductDeps({
        catalog: {
          products: [existingProduct],
          productInstances: [existingInstance],
        },
      });

      const updateRequest = {
        id: 'prod_1',
        instances: [
          {
            id: 'pi_1',
            displayName: 'New Name',
            shortcode: 'NEW',
          },
        ],
      };

      (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse({ objects: [], relatedObjects: [] }),
      );

      (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
      );

      (deps.productRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);
      (deps.productInstanceRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);

      const result = await batchUpsertProduct(deps, [updateRequest]);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(deps.productInstanceRepository.bulkUpdate).toHaveBeenCalled();
    });

    it('should insert new instances on existing product', async () => {
      const existingInstance = createMockProductInstance({
        id: 'pi_1',
        displayName: 'Existing',
        shortcode: 'EX',
      });

      const existingProduct = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1'],
      });

      const deps = createMockProductDeps({
        catalog: {
          products: [existingProduct],
          productInstances: [existingInstance],
        },
      });

      const newInstance = createMockProductInstance({
        displayName: 'New Instance',
        shortcode: 'NEW',
      });

      const updateRequest = {
        id: 'prod_1',
        instances: [
          'pi_1', // keep existing
          createMockCreateProductInstanceRequest({}, newInstance), // add new
        ],
      };

      // Mock BatchRetrieveCatalogObjects (now called due to default Square external IDs)
      (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse({ objects: [], relatedObjects: [] }),
      );

      (deps.productInstanceRepository.bulkCreate as jest.Mock).mockResolvedValue([{ ...newInstance, id: 'pi_2' }]);

      (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
      );

      (deps.productRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);

      const result = await batchUpsertProduct(deps, [updateRequest]);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result[0].instances).toHaveLength(2);
      expect(deps.productInstanceRepository.bulkCreate).toHaveBeenCalled();
    });

    it('should trigger implicit updates when price changes', async () => {
      const existingInstance = createMockProductInstance({
        id: 'pi_1',
        displayName: 'Pizza',
        shortcode: 'PZ',
      });

      const existingProduct = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1'],
        price: { amount: 1000, currency: 'USD' as const },
      });

      const deps = createMockProductDeps({
        catalog: {
          products: [existingProduct],
          productInstances: [existingInstance],
        },
      });

      const updateRequest = {
        id: 'prod_1',
        price: { amount: 1200, currency: 'USD' as const }, // Price changed
        instances: ['pi_1'], // noOp but will be updated due to price change
      };

      (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse({ objects: [], relatedObjects: [] }),
      );

      (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
      );

      (deps.productRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);
      (deps.productInstanceRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);

      const result = await batchUpsertProduct(deps, [updateRequest]);

      expect(result).not.toBeNull();
      if (!result) return;

      // Product instance should be updated due to price change
      expect(deps.productInstanceRepository.bulkUpdate).toHaveBeenCalled();
    });

    it('should trigger implicit updates when printerGroup changes', async () => {
      const existingInstance = createMockProductInstance({
        id: 'pi_1',
        displayName: 'Pizza',
        shortcode: 'PZ',
      });

      const existingProduct = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1'],
        printerGroup: null,
      });

      const deps = createMockProductDeps({
        catalog: {
          products: [existingProduct],
          productInstances: [existingInstance],
        },
        printerGroups: { pg_1: { id: 'pg_1', name: 'Kitchen' } },
      });

      const updateRequest = {
        id: 'prod_1',
        printerGroup: 'pg_1', // PrinterGroup changed
        instances: ['pi_1'],
      };

      (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse({ objects: [], relatedObjects: [] }),
      );

      (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
      );

      (deps.productRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);
      (deps.productInstanceRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);

      const result = await batchUpsertProduct(deps, [updateRequest]);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(deps.productInstanceRepository.bulkUpdate).toHaveBeenCalled();
    });

    it('should trigger implicit updates when modifiers removed', async () => {
      const existingInstance = createMockProductInstance({
        id: 'pi_1',
        displayName: 'Pizza',
        shortcode: 'PZ',
      });

      const modifierType1 = createMockOptionType({
        id: 'mt_1',
        name: 'Topping 1',
        options: [],
      });

      const modifierType2 = createMockOptionType({
        id: 'mt_2',
        name: 'Topping 2',
        options: [],
      });

      const existingProduct = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1'],
        modifiers: [
          { mtid: 'mt_1', enable: null, serviceDisable: [] },
          { mtid: 'mt_2', enable: null, serviceDisable: [] },
        ],
      });

      const deps = createMockProductDeps({
        catalog: {
          products: [existingProduct],
          productInstances: [existingInstance],
          modifierTypes: [modifierType1, modifierType2],
        },
      });

      const updateRequest = {
        id: 'prod_1',
        modifiers: [{ mtid: 'mt_1', enable: null, serviceDisable: [] }], // mt_2 removed
        instances: ['pi_1'],
      };

      (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse({ objects: [], relatedObjects: [] }),
      );

      (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
        createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
      );

      (deps.productRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);
      (deps.productInstanceRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);

      const result = await batchUpsertProduct(deps, [updateRequest]);

      expect(result).not.toBeNull();
      if (!result) return;

      // Instance should be updated due to modifier removal
      expect(deps.productInstanceRepository.bulkUpdate).toHaveBeenCalled();
    });

    // ==========================================================================
    // MIXED BATCH SCENARIOS
    // ==========================================================================

    describe('Mixed batch scenarios', () => {
      it('should handle create and update in same batch', async () => {
        const existingInstance = createMockProductInstance({
          id: 'pi_existing',
          displayName: 'Existing Pizza',
          shortcode: 'EX',
        });

        const existingProduct = createMockProduct({
          id: 'prod_existing',
          instances: ['pi_existing'],
        });

        const newInstance = createMockProductInstance({
          displayName: 'New Pizza',
          shortcode: 'NEW',
        });

        const newProduct = createMockProduct({
          instances: [],
        });

        const deps = createMockProductDeps({
          catalog: {
            products: [existingProduct],
            productInstances: [existingInstance],
          },
        });

        const createRequest = createMockCreateProductRequest(
          { instances: [createMockCreateProductInstanceRequest({}, newInstance)] },
          newProduct,
        );

        const updateRequest = {
          id: 'prod_existing',
          instances: ['pi_existing'],
        };

        // Mock BatchRetrieveCatalogObjects (now called due to default Square external IDs)
        (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
          createSquareSuccessResponse({ objects: [], relatedObjects: [] }),
        );

        (deps.productInstanceRepository.bulkCreate as jest.Mock).mockResolvedValue([{ ...newInstance, id: 'pi_new' }]);

        (deps.productRepository.bulkCreate as jest.Mock).mockResolvedValue([
          { ...newProduct, id: 'prod_new', instances: ['pi_new'] },
        ]);

        (deps.productRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);

        (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
          createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
        );

        const result = await batchUpsertProduct(deps, [createRequest, updateRequest]);

        expect(result).not.toBeNull();
        if (!result) return;

        expect(result).toHaveLength(2);
        // Verify correct ordering
        expect(result[0].product.id).toBe('prod_new');
        expect(result[1].product.id).toBe('prod_existing');
      });
    });

    // ==========================================================================
    // VALIDATION FAILURES
    // ==========================================================================

    describe('Validation failures', () => {
      it('should return null for invalid modifier type', async () => {
        const deps = createMockProductDeps({
          catalog: {
            modifierTypes: [], // Empty, so any modifier will be invalid
            products: [],
            productInstances: [],
          },
        });

        const createRequest = createMockCreateProductRequest({
          modifiers: [{ mtid: 'nonexistent_mt', enable: null, serviceDisable: [] }],
        });

        const result = await batchUpsertProduct(deps, [createRequest]);

        expect(result).toBeNull();
      });

      it('should return null for invalid printer group', async () => {
        const deps = createMockProductDeps({
          catalog: {
            modifierTypes: [],
            products: [],
            productInstances: [],
          },
          printerGroups: {}, // Empty, so any printer group will be invalid
        });

        const createRequest = createMockCreateProductRequest({
          printerGroup: 'nonexistent_pg',
        });

        const result = await batchUpsertProduct(deps, [createRequest]);

        expect(result).toBeNull();
      });

      it('should return null when updating non-existent product', async () => {
        const deps = createMockProductDeps({
          catalog: {
            products: [], // Empty catalog
            productInstances: [],
          },
        });

        const updateRequest = {
          id: 'nonexistent_prod',
          instances: [],
        };

        const result = await batchUpsertProduct(deps, [updateRequest]);

        expect(result).toBeNull();
      });

      it('should return null when instance IDs do not belong to product', async () => {
        const existingInstance = createMockProductInstance({
          id: 'pi_1',
          displayName: 'Valid Instance',
          shortcode: 'V1',
        });

        const otherInstance = createMockProductInstance({
          id: 'pi_2',
          displayName: 'Other Instance',
          shortcode: 'V2',
        });

        const existingProduct = createMockProduct({
          id: 'prod_1',
          instances: ['pi_1'], // Only pi_1 belongs to this product
        });

        const deps = createMockProductDeps({
          catalog: {
            products: [existingProduct],
            productInstances: [existingInstance, otherInstance], // pi_2 exists but doesn't belong
          },
        });

        const updateRequest = {
          id: 'prod_1',
          instances: ['pi_1', 'pi_2'], // pi_2 doesn't belong to prod_1
        };

        const result = await batchUpsertProduct(deps, [updateRequest]);

        expect(result).toBeNull();
      });
    });

    // ==========================================================================
    // SQUARE API FAILURES
    // ==========================================================================

    describe('Square API failures', () => {
      it('should return null when BatchRetrieveCatalogObjects fails', async () => {
        const existingInstance = createMockProductInstance({
          id: 'pi_1',
          displayName: 'Pizza',
          shortcode: 'PZ',
          externalIDs: [
            { key: 'SQID_ITEM', value: 'SQUARE_CAT_OBJ_123' },
            { key: 'SQID_ITEM_VARIATION', value: 'SQUARE_CAT_OBJ_1234' },
          ],
        });

        const existingProduct = createMockProduct({
          id: 'prod_1',
          instances: ['pi_1'],
          price: { amount: 1000, currency: 'USD' as const },
        });

        const deps = createMockProductDeps({
          catalog: {
            products: [existingProduct],
            productInstances: [existingInstance],
          },
        });

        const updateRequest: UpdateIProductRequest = {
          id: 'prod_1',
          price: { amount: 1200, currency: 'USD' as const },
          instances: [
            {
              id: 'pi_1',
              displayName: 'New Name',
              shortcode: 'NEW',
            },
          ],
        };

        // Mock BatchRetrieveCatalogObjects to fail
        (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
          createSquareFailureResponse([
            { category: 'API_ERROR', code: 'SERVICE_UNAVAILABLE', detail: 'Square is down' },
          ]),
        );

        // Also mock BatchUpsertCatalogObjects even though we shouldn't reach it
        (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
          createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
        );

        const result = await batchUpsertProduct(deps, [updateRequest]);

        expect(result).toBeNull();
      });

      it('should return null when BatchUpsertCatalogObjects fails', async () => {
        const deps = createMockProductDeps({});

        const createRequest = createMockCreateProductRequest();

        (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
          createSquareFailureResponse([
            { category: 'API_ERROR', code: 'SERVICE_UNAVAILABLE', detail: 'Square is down' },
          ]),
        );

        const result = await batchUpsertProduct(deps, [createRequest]);

        expect(result).toBeNull();
      });
    });
  });
});
