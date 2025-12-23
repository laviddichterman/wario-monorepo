/* eslint-disable @typescript-eslint/unbound-method */
/**
 * Unit Tests for batchUpsertProduct
 *
 * Tests covering key permutations: create products, update products (noOp instances,
 * explicit updates, insert new instances), validation failures, and Square API failures.
 */

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
} from 'test/utils';

import { OptionPlacement, OptionQualifier, type UpdateIProductRequest } from '@wcp/wario-shared';
import {
  createMockProductInstanceDisplayFlags,
  createMockProductInstanceDisplayFlagsPos,
} from '@wcp/wario-shared/testing';

import { ProductInstanceNotFoundException } from 'src/exceptions';

import {
  batchDeleteProduct,
  batchUpdateProductInstance,
  batchUpsertProduct,
  createProduct,
  createProductInstance,
  deleteProduct,
  deleteProductInstance,
  updateProduct,
  updateProductInstance,
} from './catalog-product.functions';

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

    it('should remove modifier selections from instances when modifier type is removed from product', async () => {
      // Instance has a modifier selection from the modifier type being removed
      const existingInstance = createMockProductInstance({
        id: 'pi_1',
        displayName: 'Pizza with Topping',
        shortcode: 'PWT',
        modifiers: [
          {
            modifierTypeId: 'mt_1',
            options: [{ optionId: 'opt_1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
          },
          {
            modifierTypeId: 'mt_2',
            options: [{ optionId: 'opt_2', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
          },
        ],
      });

      const modifierType1 = createMockOptionType({
        id: 'mt_1',
        name: 'Topping 1',
        options: ['opt_1'],
      });

      const modifierType2 = createMockOptionType({
        id: 'mt_2',
        name: 'Topping 2',
        options: ['opt_2'],
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

      // Update request removes mt_2 from product
      const updateRequest = {
        id: 'prod_1',
        modifiers: [{ mtid: 'mt_1', enable: null, serviceDisable: [] }], // mt_2 removed
        instances: ['pi_1'], // noOp instance - triggers implicit update
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

      // Instance should be updated with mt_2's modifier selection stripped out
      expect(deps.productInstanceRepository.bulkUpdate).toHaveBeenCalled();

      // Check the actual update call arguments to verify modifier was stripped
      const bulkUpdateCalls = (deps.productInstanceRepository.bulkUpdate as jest.Mock).mock.calls;
      expect(bulkUpdateCalls.length).toBeGreaterThan(0);

      // The updated instance should only have the mt_1 modifier selection
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- mock call args
      const updatedInstances = bulkUpdateCalls[0][0] as { id: string; data: { modifiers: unknown[] } }[];
      const updatedInstance = updatedInstances.find((u) => u.id === 'pi_1');
      expect(updatedInstance).toBeDefined();
      expect(updatedInstance?.data.modifiers).toHaveLength(1);
      expect((updatedInstance?.data.modifiers[0] as { modifierTypeId: string }).modifierTypeId).toBe('mt_1');
    });

    it('should throw when explicit instance update contains option from removed modifier type', async () => {
      // Existing instance has modifiers from both mt_1 and mt_2
      const existingInstance = createMockProductInstance({
        id: 'pi_1',
        displayName: 'Pizza with Toppings',
        shortcode: 'PWT',
        modifiers: [
          {
            modifierTypeId: 'mt_1',
            options: [{ optionId: 'opt_1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
          },
          {
            modifierTypeId: 'mt_2',
            options: [{ optionId: 'opt_2', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
          },
        ],
      });

      const modifierType1 = createMockOptionType({
        id: 'mt_1',
        name: 'Topping 1',
        options: ['opt_1'],
      });

      const modifierType2 = createMockOptionType({
        id: 'mt_2',
        name: 'Topping 2',
        options: ['opt_2'],
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

      // Update removes mt_2 from product, but explicit instance update still references mt_2
      const updateRequest = {
        id: 'prod_1',
        modifiers: [{ mtid: 'mt_1', enable: null, serviceDisable: [] }], // mt_2 removed
        instances: [
          {
            id: 'pi_1',
            displayName: 'Pizza with Toppings Updated',
            // Instance update still references the now-removed mt_2 - this should fail validation
            modifiers: [
              {
                modifierTypeId: 'mt_1',
                options: [{ optionId: 'opt_1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
              },
              {
                modifierTypeId: 'mt_2', // This is now illegal!
                options: [{ optionId: 'opt_2', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
              },
            ],
          },
        ],
      };

      await expect(batchUpsertProduct(deps, [updateRequest])).rejects.toThrow(
        'Product prod_1 has invalid modifiers for instance pi_1',
      );
    });

    it('should succeed when explicit instance update properly removes illegal option', async () => {
      // Existing instance has modifiers from both mt_1 and mt_2
      const existingInstance = createMockProductInstance({
        id: 'pi_1',
        displayName: 'Pizza with Toppings',
        shortcode: 'PWT',
        modifiers: [
          {
            modifierTypeId: 'mt_1',
            options: [{ optionId: 'opt_1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
          },
          {
            modifierTypeId: 'mt_2',
            options: [{ optionId: 'opt_2', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
          },
        ],
      });

      const modifierType1 = createMockOptionType({
        id: 'mt_1',
        name: 'Topping 1',
        options: ['opt_1'],
      });

      const modifierType2 = createMockOptionType({
        id: 'mt_2',
        name: 'Topping 2',
        options: ['opt_2'],
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

      // Update removes mt_2 from product, AND explicit instance update also removes mt_2
      const updateRequest = {
        id: 'prod_1',
        modifiers: [{ mtid: 'mt_1', enable: null, serviceDisable: [] }], // mt_2 removed
        instances: [
          {
            id: 'pi_1',
            displayName: 'Pizza with Toppings Updated',
            // Instance update properly removes mt_2 modifier selection
            modifiers: [
              {
                modifierTypeId: 'mt_1',
                options: [{ optionId: 'opt_1', placement: OptionPlacement.WHOLE, qualifier: OptionQualifier.REGULAR }],
              },
              // mt_2 is NOT included - properly formed request
            ],
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

      // Instance should be updated with only mt_1 modifier
      expect(deps.productInstanceRepository.bulkUpdate).toHaveBeenCalled();
      const bulkUpdateCalls = (deps.productInstanceRepository.bulkUpdate as jest.Mock).mock.calls;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- mock call args
      const updatedInstances = bulkUpdateCalls[0][0] as { id: string; data: { modifiers: unknown[] } }[];
      const updatedInstance = updatedInstances.find((u) => u.id === 'pi_1');
      expect(updatedInstance).toBeDefined();
      expect(updatedInstance?.data.modifiers).toHaveLength(1);
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
    // VALIDATION FAILURES (Error throwing tests)
    // ==========================================================================

    describe('Validation failures', () => {
      // ========================================================================
      // Initial validation: ValidateProductModifiersFunctionsCategoriesPrinterGroups
      // ========================================================================

      describe('Initial validation errors', () => {
        it('should throw for invalid modifier type', async () => {
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

          await expect(batchUpsertProduct(deps, [createRequest])).rejects.toThrow(
            'Invalid modifiers, functions, categories, or printer groups',
          );
        });

        it('should throw for invalid enable function', async () => {
          const modifierType = createMockOptionType({
            id: 'mt_1',
            name: 'Topping',
            options: [],
          });

          const deps = createMockProductDeps({
            catalog: {
              modifierTypes: [modifierType],
              products: [],
              productInstances: [],
            },
          });

          // Reference a modifier with an enable function that doesn't exist
          const createRequest = createMockCreateProductRequest({
            modifiers: [{ mtid: 'mt_1', enable: 'nonexistent_function', serviceDisable: [] }],
          });

          await expect(batchUpsertProduct(deps, [createRequest])).rejects.toThrow(
            'Invalid modifiers, functions, categories, or printer groups',
          );
        });

        it('should throw for invalid printer group', async () => {
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

          await expect(batchUpsertProduct(deps, [createRequest])).rejects.toThrow(
            'Invalid modifiers, functions, categories, or printer groups',
          );
        });
      });

      // ========================================================================
      // Update product validation: Product existence
      // ========================================================================

      describe('Update product validation errors', () => {
        it('should throw when updating non-existent product', async () => {
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

          await expect(batchUpsertProduct(deps, [updateRequest])).rejects.toThrow(
            'Product nonexistent_prod does not exist',
          );
        });

        it('should throw when batch contains duplicate product IDs', async () => {
          const existingInstance = createMockProductInstance({
            id: 'pi_1',
            displayName: 'Instance',
            shortcode: 'I1',
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

          // Two update requests for the same product
          const updateRequest1 = { id: 'prod_1', instances: ['pi_1'] };
          const updateRequest2 = { id: 'prod_1', instances: ['pi_1'] };

          await expect(batchUpsertProduct(deps, [updateRequest1, updateRequest2])).rejects.toThrow(
            'Batch request specifies multiple of the same Product ID',
          );
        });

        it('should throw when instance IDs are duplicated within a product update', async () => {
          const existingInstance = createMockProductInstance({
            id: 'pi_1',
            displayName: 'Instance',
            shortcode: 'I1',
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

          // Reference the same instance ID twice
          const updateRequest = {
            id: 'prod_1',
            instances: ['pi_1', 'pi_1'], // Duplicate
          };

          await expect(batchUpsertProduct(deps, [updateRequest])).rejects.toThrow(
            'Product prod_1 contains duplicate product instance ids',
          );
        });

        it('should throw when referenced instance ID does not belong to product', async () => {
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

          await expect(batchUpsertProduct(deps, [updateRequest])).rejects.toThrow(
            'Product prod_1 references instance IDs that do not belong to it',
          );
        });

        it('should throw when extra instance ID not belonging to product is referenced (multi-instance)', async () => {
          // More complex scenario: product has 2 instances, we try to add a 3rd that doesn't belong
          const existingInstance1 = createMockProductInstance({
            id: 'pi_1',
            displayName: 'Instance 1',
            shortcode: 'I1',
          });

          const existingInstance2 = createMockProductInstance({
            id: 'pi_2',
            displayName: 'Instance 2',
            shortcode: 'I2',
          });

          const unrelatedInstance = createMockProductInstance({
            id: 'pi_unrelated',
            displayName: 'Unrelated Instance',
            shortcode: 'UN',
          });

          const existingProduct = createMockProduct({
            id: 'prod_1',
            instances: ['pi_1', 'pi_2'], // Product owns pi_1 and pi_2
          });

          const deps = createMockProductDeps({
            catalog: {
              products: [existingProduct],
              productInstances: [existingInstance1, existingInstance2, unrelatedInstance],
            },
          });

          // Try to include pi_unrelated which doesn't belong to prod_1
          const updateRequest = {
            id: 'prod_1',
            instances: ['pi_1', 'pi_2', 'pi_unrelated'], // pi_unrelated doesn't belong
          };

          await expect(batchUpsertProduct(deps, [updateRequest])).rejects.toThrow(
            'Product prod_1 references instance IDs that do not belong to it',
          );
        });

        it('should throw when instance is missing from update batch (all existing instances must be referenced)', async () => {
          // Product has 2 instances, but update only references 1 - missing pi_2
          const existingInstance1 = createMockProductInstance({
            id: 'pi_1',
            displayName: 'Instance 1',
            shortcode: 'I1',
          });

          const existingInstance2 = createMockProductInstance({
            id: 'pi_2',
            displayName: 'Instance 2',
            shortcode: 'I2',
          });

          const existingProduct = createMockProduct({
            id: 'prod_1',
            instances: ['pi_1', 'pi_2'], // Product has both instances
          });

          const deps = createMockProductDeps({
            catalog: {
              products: [existingProduct],
              productInstances: [existingInstance1, existingInstance2],
            },
          });

          // Only reference pi_1, missing pi_2 - should this be an error?
          // Current implementation does NOT validate that all existing instances are included
          // This test documents the expected behavior (should throw if missing instances)
          const updateRequest = {
            id: 'prod_1',
            instances: ['pi_1'], // Missing pi_2!
          };

          // NOTE: If this test fails, the validation logic needs to be updated to check
          // that all existing product instances are referenced in the update
          await expect(batchUpsertProduct(deps, [updateRequest])).rejects.toThrow(
            'Product prod_1 does not contain all existing product instances',
          );
        });

        it('should throw when product instance does not exist in catalog', async () => {
          const existingProduct = createMockProduct({
            id: 'prod_1',
            instances: ['pi_nonexistent'], // References non-existent instance
          });

          const deps = createMockProductDeps({
            catalog: {
              products: [existingProduct],
              productInstances: [], // Empty - no instances exist
            },
          });

          const updateRequest = {
            id: 'prod_1',
            instances: ['pi_nonexistent'],
          };

          await expect(batchUpsertProduct(deps, [updateRequest])).rejects.toThrow(
            'Product Instance with id pi_nonexistent does not exist',
          );
        });

        it('should throw when updated instance has invalid modifiers', async () => {
          const modifierType = createMockOptionType({
            id: 'mt_1',
            name: 'Topping',
            options: [],
          });

          const existingInstance = createMockProductInstance({
            id: 'pi_1',
            displayName: 'Instance',
            shortcode: 'I1',
            modifiers: [], // No modifiers initially
          });

          const existingProduct = createMockProduct({
            id: 'prod_1',
            instances: ['pi_1'],
            modifiers: [], // Product has no modifiers
          });

          const deps = createMockProductDeps({
            catalog: {
              products: [existingProduct],
              productInstances: [existingInstance],
              modifierTypes: [modifierType],
            },
          });

          // Try to update instance with a modifier that's not on the product
          const updateRequest = {
            id: 'prod_1',
            instances: [
              {
                id: 'pi_1',
                modifiers: [{ modifierTypeId: 'mt_1', options: [] }], // Invalid - product doesn't have mt_1
              },
            ],
          };

          await expect(batchUpsertProduct(deps, [updateRequest])).rejects.toThrow(
            'Product prod_1 has invalid modifiers for instance pi_1',
          );
        });

        it('should throw when new instance on update has invalid modifiers', async () => {
          const modifierType = createMockOptionType({
            id: 'mt_1',
            name: 'Topping',
            options: [],
          });

          const existingInstance = createMockProductInstance({
            id: 'pi_1',
            displayName: 'Existing Instance',
            shortcode: 'EX',
          });

          const existingProduct = createMockProduct({
            id: 'prod_1',
            instances: ['pi_1'],
            modifiers: [], // Product has no modifiers
          });

          const deps = createMockProductDeps({
            catalog: {
              products: [existingProduct],
              productInstances: [existingInstance],
              modifierTypes: [modifierType],
            },
          });

          const newInstanceWithBadModifiers = createMockCreateProductInstanceRequest({
            modifiers: [{ modifierTypeId: 'mt_1', options: [] }], // Invalid - product doesn't have mt_1
          });

          const updateRequest = {
            id: 'prod_1',
            instances: ['pi_1', newInstanceWithBadModifiers], // Keep existing, add new with bad modifiers
          };

          await expect(batchUpsertProduct(deps, [updateRequest])).rejects.toThrow(
            'Product prod_1 has invalid modifiers for new instance at index 1',
          );
        });
      });

      // ========================================================================
      // Insert product validation
      // ========================================================================

      describe('Insert product validation errors', () => {
        it('should throw when creating product with no instances', async () => {
          const deps = createMockProductDeps({});

          const createRequest = createMockCreateProductRequest({
            instances: [], // No instances
          });

          await expect(batchUpsertProduct(deps, [createRequest])).rejects.toThrow('Product has no instances');
        });

        it('should throw when creating product with instance having invalid modifiers', async () => {
          const modifierType = createMockOptionType({
            id: 'mt_1',
            name: 'Topping',
            options: [],
          });

          const deps = createMockProductDeps({
            catalog: {
              modifierTypes: [modifierType],
              products: [],
              productInstances: [],
            },
          });

          const instanceWithBadModifiers = createMockCreateProductInstanceRequest({
            modifiers: [{ modifierTypeId: 'mt_1', options: [] }], // Invalid - product won't have mt_1
          });

          const createRequest = createMockCreateProductRequest({
            modifiers: [], // Product has no modifiers
            instances: [instanceWithBadModifiers],
          });

          await expect(batchUpsertProduct(deps, [createRequest])).rejects.toThrow('Invalid modifiers for instance');
        });
      });
    });

    // ==========================================================================
    // SQUARE API FAILURES (Error throwing tests)
    // ==========================================================================

    describe('Square API failures', () => {
      it('should throw when BatchRetrieveCatalogObjects fails', async () => {
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

        await expect(batchUpsertProduct(deps, [updateRequest])).rejects.toThrow(
          'Getting current square CatalogObjects failed',
        );
      });

      it('should throw when BatchUpsertCatalogObjects fails', async () => {
        const deps = createMockProductDeps({});

        const instance = createMockProductInstance({
          displayName: 'Pizza',
          shortcode: 'PZ',
        });

        const product = createMockProduct({
          instances: [],
          modifiers: [],
        });

        const createRequest = createMockCreateProductRequest(
          { instances: [createMockCreateProductInstanceRequest({}, instance)] },
          product,
        );

        (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
          createSquareFailureResponse([
            { category: 'API_ERROR', code: 'SERVICE_UNAVAILABLE', detail: 'Square is down' },
          ]),
        );

        await expect(batchUpsertProduct(deps, [createRequest])).rejects.toThrow(
          'Failed to save square products. CATALOG MAY BE INCONSISTENT',
        );
      });

      it('should throw when BatchDeleteCatalogObjects fails', async () => {
        // Need existing product with instance that will be hidden (triggers delete)
        const existingInstance = createMockProductInstance({
          id: 'pi_1',
          displayName: 'Pizza',
          shortcode: 'PZ',
          externalIDs: [
            { key: 'SQID_ITEM', value: 'SQUARE_CAT_OBJ_123' },
            { key: 'SQID_ITEM_VARIATION', value: 'SQUARE_CAT_OBJ_1234' },
          ],
          displayFlags: createMockProductInstanceDisplayFlags({
            pos: createMockProductInstanceDisplayFlagsPos({ hide: false }),
          }),
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

        // Update the instance to hide from POS (triggers catalog object deletion)
        const updateRequest: UpdateIProductRequest = {
          id: 'prod_1',
          instances: [
            {
              id: 'pi_1',
              displayFlags: createMockProductInstanceDisplayFlags({
                pos: createMockProductInstanceDisplayFlagsPos({ hide: true }),
              }),
            },
          ],
        };

        // Mock BatchRetrieveCatalogObjects to succeed
        (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
          createSquareSuccessResponse({
            objects: [{ id: 'SQUARE_CAT_OBJ_123', version: 1n }],
            relatedObjects: [],
          }),
        );

        // Mock BatchUpsertCatalogObjects to succeed (won't actually be called since hiding)
        (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
          createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
        );

        // Mock BatchDeleteCatalogObjects to fail
        (deps.squareService.BatchDeleteCatalogObjects as jest.Mock).mockResolvedValue(
          createSquareFailureResponse([
            { category: 'API_ERROR', code: 'SERVICE_UNAVAILABLE', detail: 'Square is down' },
          ]),
        );

        await expect(batchUpsertProduct(deps, [updateRequest])).rejects.toThrow(
          'Failed to delete square products. CATALOG MAY BE INCONSISTENT',
        );
      });
    });
  });
});

// =============================================================================
// deleteProductInstance Tests
// =============================================================================

describe('deleteProductInstance', () => {
  describe('Success cases', () => {
    it('should delete a non-base product instance and update parent product', async () => {
      const existingInstance1 = createMockProductInstance({
        id: 'pi_1',
        displayName: 'Base Instance',
        shortcode: 'BI',
        externalIDs: [{ key: 'SQID_ITEM_VARIATION', value: 'sq_var_1' }],
      });

      const existingInstance2 = createMockProductInstance({
        id: 'pi_2',
        displayName: 'Secondary Instance',
        shortcode: 'SI',
        externalIDs: [{ key: 'SQID_ITEM_VARIATION', value: 'sq_var_2' }],
      });

      const existingProduct = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1', 'pi_2'], // pi_1 is base, pi_2 can be deleted
      });

      const deps = createMockProductDeps({
        catalog: {
          products: [existingProduct],
          productInstances: [existingInstance1, existingInstance2],
        },
      });

      // Mock repository calls
      (deps.productInstanceRepository.findById as jest.Mock).mockResolvedValue(existingInstance2);
      (deps.productInstanceRepository.delete as jest.Mock).mockResolvedValue(true);
      (deps.productRepository.update as jest.Mock).mockResolvedValue({
        ...existingProduct,
        instances: ['pi_1'],
      });

      const result = await deleteProductInstance(deps, 'prod_1', 'pi_2');

      expect(result).toEqual(existingInstance2);

      // Verify the parent product was updated to remove the instance
      expect(deps.productRepository.update).toHaveBeenCalledWith('prod_1', {
        instances: ['pi_1'], // pi_2 should be removed
      });

      // Verify Square catalog objects were deleted
      expect(deps.batchDeleteCatalogObjectsFromExternalIds).toHaveBeenCalledWith(existingInstance2.externalIDs);

      // Verify catalog sync was triggered
      expect(deps.syncProducts).toHaveBeenCalled();
      expect(deps.syncProductInstances).toHaveBeenCalled();
      expect(deps.recomputeCatalog).toHaveBeenCalled();
    });

    it('should skip catalog recomputation when suppress flag is true', async () => {
      const existingInstance1 = createMockProductInstance({ id: 'pi_1' });
      const existingInstance2 = createMockProductInstance({ id: 'pi_2' });

      const existingProduct = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1', 'pi_2'],
      });

      const deps = createMockProductDeps({
        catalog: {
          products: [existingProduct],
          productInstances: [existingInstance1, existingInstance2],
        },
      });

      (deps.productInstanceRepository.findById as jest.Mock).mockResolvedValue(existingInstance2);
      (deps.productInstanceRepository.delete as jest.Mock).mockResolvedValue(true);
      (deps.productRepository.update as jest.Mock).mockResolvedValue({
        ...existingProduct,
        instances: ['pi_1'],
      });

      await deleteProductInstance(deps, 'prod_1', 'pi_2', true); // suppress = true

      expect(deps.syncProducts).not.toHaveBeenCalled();
      expect(deps.syncProductInstances).not.toHaveBeenCalled();
      expect(deps.recomputeCatalog).not.toHaveBeenCalled();
    });
  });

  describe('Error cases', () => {
    it('should throw when product instance not found in catalog', async () => {
      const existingProduct = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1'],
      });

      const deps = createMockProductDeps({
        catalog: {
          products: [existingProduct],
          productInstances: [], // Empty - no instances in catalog
        },
      });

      await expect(deleteProductInstance(deps, 'prod_1', 'pi_nonexistent')).rejects.toThrow(
        'Product instance not found in catalog',
      );
    });

    it('should throw when product not found', async () => {
      const existingInstance = createMockProductInstance({ id: 'pi_1' });

      const deps = createMockProductDeps({
        catalog: {
          products: [], // Empty - no products
          productInstances: [existingInstance],
        },
      });

      await expect(deleteProductInstance(deps, 'prod_nonexistent', 'pi_1')).rejects.toThrow(
        ProductInstanceNotFoundException,
      );
    });

    it('should throw when product does not contain the instance', async () => {
      const existingInstance = createMockProductInstance({ id: 'pi_1' });

      const existingProduct = createMockProduct({
        id: 'prod_1',
        instances: ['pi_other'], // Does not include pi_1
      });

      const deps = createMockProductDeps({
        catalog: {
          products: [existingProduct],
          productInstances: [existingInstance],
        },
      });

      await expect(deleteProductInstance(deps, 'prod_1', 'pi_1')).rejects.toThrow(ProductInstanceNotFoundException);
    });

    it('should throw when attempting to delete base product instance', async () => {
      const existingInstance = createMockProductInstance({ id: 'pi_1' });

      const existingProduct = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1'], // pi_1 is the base (first) instance
      });

      const deps = createMockProductDeps({
        catalog: {
          products: [existingProduct],
          productInstances: [existingInstance],
        },
      });

      await expect(deleteProductInstance(deps, 'prod_1', 'pi_1')).rejects.toThrow(
        'Attempted to delete base product instance for product',
      );
    });

    it('should throw when product instance not found in database', async () => {
      const existingInstance1 = createMockProductInstance({ id: 'pi_1' });
      const existingInstance2 = createMockProductInstance({ id: 'pi_2' });

      const existingProduct = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1', 'pi_2'],
      });

      const deps = createMockProductDeps({
        catalog: {
          products: [existingProduct],
          productInstances: [existingInstance1, existingInstance2],
        },
      });

      (deps.productInstanceRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(deleteProductInstance(deps, 'prod_1', 'pi_2')).rejects.toThrow(ProductInstanceNotFoundException);
    });

    it('should throw when database delete fails', async () => {
      const existingInstance1 = createMockProductInstance({ id: 'pi_1' });
      const existingInstance2 = createMockProductInstance({ id: 'pi_2' });

      const existingProduct = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1', 'pi_2'],
      });

      const deps = createMockProductDeps({
        catalog: {
          products: [existingProduct],
          productInstances: [existingInstance1, existingInstance2],
        },
      });

      (deps.productInstanceRepository.findById as jest.Mock).mockResolvedValue(existingInstance2);
      (deps.productInstanceRepository.delete as jest.Mock).mockResolvedValue(false);

      await expect(deleteProductInstance(deps, 'prod_1', 'pi_2')).rejects.toThrow(
        'Failed to delete product instance from database',
      );
    });
  });
});

// =============================================================================
// createProduct Tests (wrapper around batchUpsertProduct)
// =============================================================================

describe('createProduct', () => {
  it('should create a product and return the first result from batch', async () => {
    const tracker = new SquareIdMappingTracker();
    const deps = createMockProductDeps({});

    // Create request with explicit instance
    const instanceRequest = createMockCreateProductInstanceRequest();
    const createRequest = createMockCreateProductRequest({
      instances: [instanceRequest],
    });

    // Mock Square API responses
    (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
      createSquareSuccessResponse({ objects: [] }),
    );
    (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
      createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
    );

    // Mock repository responses for create operations
    const mockProduct = createMockProduct({ id: 'prod_new', instances: ['pi_new'] });
    const mockInstance = createMockProductInstance({ id: 'pi_new' });
    (deps.productRepository.bulkCreate as jest.Mock).mockResolvedValue([mockProduct]);
    (deps.productInstanceRepository.bulkCreate as jest.Mock).mockResolvedValue([mockInstance]);

    const result = await createProduct(deps, createRequest);

    expect(result).not.toBeNull();
    expect(result?.product).toBeDefined();
    expect(result?.instances).toBeDefined();
    expect(result?.instances.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// updateProduct Tests (wrapper around batchUpsertProduct)
// =============================================================================

describe('updateProduct', () => {
  it('should update a product and return the product from first result', async () => {
    const tracker = new SquareIdMappingTracker();

    const existingInstance = createMockProductInstance({
      id: 'pi_1',
      displayName: 'Original Instance',
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

    const updateRequest: UpdateIProductRequest = {
      id: 'prod_1',
      // eslint-disable-next-line @typescript-eslint/no-misused-spread -- DTO class spread is intentional in tests
      ...createMockCreateProductRequest(),
      instances: [{ id: 'pi_1' }], // noOp instance update
    };

    // Mock Square API responses
    (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue(
      createSquareSuccessResponse({ objects: [] }),
    );
    (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue(
      createSquareSuccessResponse(createMockBatchUpsertResponse([{ objects: [] }], tracker)),
    );

    const result = await updateProduct(deps, updateRequest);

    expect(result).not.toBeNull();
    expect(result?.id).toBe('prod_1');
  });
});

// =============================================================================
// deleteProduct Tests
// =============================================================================

describe('deleteProduct', () => {
  it('should delete a product and all its instances', async () => {
    const existingInstance1 = createMockProductInstance({
      id: 'pi_1',
      externalIDs: [{ key: 'SQID_ITEM_VARIATION', value: 'sq_var_1' }],
    });
    const existingInstance2 = createMockProductInstance({
      id: 'pi_2',
      externalIDs: [{ key: 'SQID_ITEM_VARIATION', value: 'sq_var_2' }],
    });

    const existingProduct = createMockProduct({
      id: 'prod_1',
      instances: ['pi_1', 'pi_2'],
    });

    const deps = createMockProductDeps({
      catalog: {
        products: [existingProduct],
        productInstances: [existingInstance1, existingInstance2],
      },
    });

    // Mock repository responses
    (deps.productRepository.findById as jest.Mock).mockResolvedValue(existingProduct);
    (deps.productRepository.delete as jest.Mock).mockResolvedValue(true);
    (deps.productInstanceRepository.bulkDelete as jest.Mock).mockResolvedValue(2);

    const result = await deleteProduct(deps, 'prod_1');

    expect(result).toEqual(existingProduct);
    expect(deps.productRepository.findById).toHaveBeenCalledWith('prod_1');
    expect(deps.productRepository.delete).toHaveBeenCalledWith('prod_1');
    expect(deps.productInstanceRepository.bulkDelete).toHaveBeenCalledWith(['pi_1', 'pi_2']);
    expect(deps.batchDeleteCatalogObjectsFromExternalIds).toHaveBeenCalled();
    expect(deps.syncProducts).toHaveBeenCalled();
    expect(deps.syncProductInstances).toHaveBeenCalled();
    expect(deps.recomputeCatalog).toHaveBeenCalled();
  });

  it('should return null when product not found', async () => {
    const deps = createMockProductDeps({});
    (deps.productRepository.findById as jest.Mock).mockResolvedValue(null);

    const result = await deleteProduct(deps, 'nonexistent');

    expect(result).toBeNull();
  });
});

// =============================================================================
// batchDeleteProduct Tests
// =============================================================================

describe('batchDeleteProduct', () => {
  it('should batch delete products and all their instances', async () => {
    const instance1 = createMockProductInstance({
      id: 'pi_1',
      externalIDs: [{ key: 'SQID_ITEM_VARIATION', value: 'sq_var_1' }],
    });
    const instance2 = createMockProductInstance({
      id: 'pi_2',
      externalIDs: [{ key: 'SQID_ITEM_VARIATION', value: 'sq_var_2' }],
    });

    const product1 = createMockProduct({ id: 'prod_1', instances: ['pi_1'] });
    const product2 = createMockProduct({ id: 'prod_2', instances: ['pi_2'] });

    const deps = createMockProductDeps({
      catalog: {
        products: [product1, product2],
        productInstances: [instance1, instance2],
      },
    });

    (deps.productRepository.bulkDelete as jest.Mock).mockResolvedValue(2);
    (deps.productInstanceRepository.bulkDelete as jest.Mock).mockResolvedValue(2);

    const result = await batchDeleteProduct(deps, ['prod_1', 'prod_2']);

    expect(result).toEqual({ deletedCount: 2, acknowledged: true });
    expect(deps.productRepository.bulkDelete).toHaveBeenCalledWith(['prod_1', 'prod_2']);
    expect(deps.productInstanceRepository.bulkDelete).toHaveBeenCalledWith(['pi_1', 'pi_2']);
    expect(deps.batchDeleteCatalogObjectsFromExternalIds).toHaveBeenCalled();
    expect(deps.syncProducts).toHaveBeenCalled();
    expect(deps.syncProductInstances).toHaveBeenCalled();
    expect(deps.recomputeCatalog).toHaveBeenCalled();
  });

  it('should return null when no products deleted', async () => {
    const deps = createMockProductDeps({});
    (deps.productRepository.bulkDelete as jest.Mock).mockResolvedValue(0);

    const result = await batchDeleteProduct(deps, ['nonexistent']);

    expect(result).toBeNull();
  });
});

// =============================================================================
// createProductInstance Tests
// =============================================================================

describe('createProductInstance', () => {
  it('should create a visible product instance and add to Square', async () => {
    const existingProduct = createMockProduct({
      id: 'prod_1',
      instances: ['pi_1'],
    });

    const deps = createMockProductDeps({
      catalog: {
        products: [existingProduct],
        productInstances: [createMockProductInstance({ id: 'pi_1' })],
      },
    });

    const newInstance = createMockProductInstance({
      displayName: 'New Instance',
      shortcode: 'NEW',
      externalIDs: [],
      displayFlags: createMockProductInstanceDisplayFlags({
        pos: createMockProductInstanceDisplayFlagsPos({ hide: false }),
      }),
    });

    const { id: _id, ...instanceWithoutId } = newInstance;

    // Mock Square upsert response
    (deps.squareService.UpsertCatalogObject as jest.Mock).mockResolvedValue({
      success: true,
      result: {
        catalogObject: {},
        idMappings: [{ clientObjectId: '#new_pi', objectId: 'sq_new_var' }],
      },
    });

    // Mock repository create
    const createdInstance = { ...instanceWithoutId, id: 'pi_new' };
    (deps.productInstanceRepository.create as jest.Mock).mockResolvedValue(createdInstance);

    const result = await createProductInstance(deps, 'prod_1', instanceWithoutId);

    expect(result).toEqual(createdInstance);
    expect(deps.squareService.UpsertCatalogObject).toHaveBeenCalled();
    expect(deps.productInstanceRepository.create).toHaveBeenCalled();
    expect(deps.syncProductInstances).toHaveBeenCalled();
    expect(deps.recomputeCatalog).toHaveBeenCalled();
  });

  it('should create a hidden instance without calling Square', async () => {
    const existingProduct = createMockProduct({
      id: 'prod_1',
      instances: ['pi_1'],
    });

    const deps = createMockProductDeps({
      catalog: {
        products: [existingProduct],
        productInstances: [createMockProductInstance({ id: 'pi_1' })],
      },
    });

    const newInstance = createMockProductInstance({
      displayName: 'Hidden Instance',
      shortcode: 'HID',
      externalIDs: [],
      displayFlags: createMockProductInstanceDisplayFlags({
        pos: createMockProductInstanceDisplayFlagsPos({ hide: true }), // Hidden from POS
      }),
    });

    const { id: _id, ...instanceWithoutId } = newInstance;

    const createdInstance = { ...instanceWithoutId, id: 'pi_hidden' };
    (deps.productInstanceRepository.create as jest.Mock).mockResolvedValue(createdInstance);

    const result = await createProductInstance(deps, 'prod_1', instanceWithoutId);

    expect(result).toEqual(createdInstance);
    expect(deps.squareService.UpsertCatalogObject).not.toHaveBeenCalled();
    expect(deps.productInstanceRepository.create).toHaveBeenCalled();
  });
});

// =============================================================================
// batchUpdateProductInstance Tests
// =============================================================================

describe('batchUpdateProductInstance', () => {
  it('should batch update product instances and sync with Square', async () => {
    const existingInstance1 = createMockProductInstance({
      id: 'pi_1',
      displayName: 'Instance 1',
      externalIDs: [{ key: 'SQID_ITEM_VARIATION', value: 'sq_var_1' }],
    });
    const existingInstance2 = createMockProductInstance({
      id: 'pi_2',
      displayName: 'Instance 2',
      externalIDs: [{ key: 'SQID_ITEM_VARIATION', value: 'sq_var_2' }],
    });

    const existingProduct = createMockProduct({
      id: 'prod_1',
      instances: ['pi_1', 'pi_2'],
    });

    const deps = createMockProductDeps({
      catalog: {
        products: [existingProduct],
        productInstances: [existingInstance1, existingInstance2],
      },
    });

    // Mock Square retrieve
    (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue({
      success: true,
      result: { objects: [] },
    });

    // Mock Square upsert
    (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue({
      success: true,
      result: { idMappings: [] },
    });

    // Mock repository update
    (deps.productInstanceRepository.bulkUpdate as jest.Mock).mockResolvedValue(2);

    const result = await batchUpdateProductInstance(deps, [
      {
        piid: 'pi_1',
        product: existingProduct,
        productInstance: { id: 'pi_1', displayName: 'Updated Instance 1' },
      },
      {
        piid: 'pi_2',
        product: existingProduct,
        productInstance: { id: 'pi_2', displayName: 'Updated Instance 2' },
      },
    ]);

    expect(result).not.toBeNull();
    expect(result?.length).toBe(2);
    expect(deps.squareService.BatchRetrieveCatalogObjects).toHaveBeenCalled();
    expect(deps.squareService.BatchUpsertCatalogObjects).toHaveBeenCalled();
    expect(deps.productInstanceRepository.bulkUpdate).toHaveBeenCalled();
    expect(deps.syncProductInstances).toHaveBeenCalled();
    expect(deps.recomputeCatalog).toHaveBeenCalled();
  });
});

// =============================================================================
// updateProductInstance Tests (wrapper around batchUpdateProductInstance)
// =============================================================================

describe('updateProductInstance', () => {
  it('should update a single instance and return the first result', async () => {
    const existingInstance = createMockProductInstance({
      id: 'pi_1',
      displayName: 'Original Instance',
      externalIDs: [{ key: 'SQID_ITEM_VARIATION', value: 'sq_var_1' }],
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

    // Mock Square retrieve
    (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue({
      success: true,
      result: { objects: [] },
    });

    // Mock Square upsert
    (deps.squareService.BatchUpsertCatalogObjects as jest.Mock).mockResolvedValue({
      success: true,
      result: { idMappings: [] },
    });

    // Mock repository update
    (deps.productInstanceRepository.bulkUpdate as jest.Mock).mockResolvedValue(1);

    const result = await updateProductInstance(deps, {
      piid: 'pi_1',
      product: existingProduct,
      productInstance: { id: 'pi_1', displayName: 'Updated Instance' },
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe('pi_1');
  });
});
