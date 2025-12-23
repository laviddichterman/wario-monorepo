/**
 * Unit Tests for catalog-square-sync.functions.ts
 *
 * Regression tests ensuring we don't trigger unnecessary updates on boot
 * when the catalog already has valid Square IDs.
 */

import { createMockSquareSyncDeps } from 'test/utils';

import {
  createMockOption,
  createMockOptionType,
  createMockProduct,
  createMockProductInstance,
  createMockProductInstanceDisplayFlags,
  createMockProductInstanceDisplayFlagsPos,
} from '@wcp/wario-shared/testing';

import { WARIO_SQUARE_ID_METADATA_KEY } from 'src/config/square-wario-bridge';

import {
  checkAllModifierTypesHaveSquareIdsAndFixIfNeeded,
  checkAllProductsHaveSquareIdsAndFixIfNeeded,
} from './catalog-square-sync.functions';

// Helper to create Square external ID key-value pairs
const createSquareExternalId = (type: string, value: string) => ({
  key: `${WARIO_SQUARE_ID_METADATA_KEY}${type}`,
  value,
});

// =============================================================================
// checkAllModifierTypesHaveSquareIdsAndFixIfNeeded Tests
// =============================================================================

describe('checkAllModifierTypesHaveSquareIdsAndFixIfNeeded', () => {
  describe('when all modifier types have valid Square IDs', () => {
    it('should return empty array and NOT trigger any updates', async () => {
      // Create options with proper Square IDs (MODIFIER_WHOLE is what's actually stored)
      const optionWithSquareIds = createMockOption({
        id: 'opt_1',
        externalIDs: [
          createSquareExternalId('MODIFIER_WHOLE', 'SQ_MODIFIER_123'),
          createSquareExternalId('MODIFIER_HEAVY', 'SQ_MODIFIER_HEAVY_123'),
        ],
      });

      const optionWithSquareIds2 = createMockOption({
        id: 'opt_2',
        externalIDs: [createSquareExternalId('MODIFIER_WHOLE', 'SQ_MODIFIER_456')],
      });

      // Create modifier type with proper Square IDs
      const modifierTypeWithSquareIds = createMockOptionType({
        id: 'mt_1',
        options: ['opt_1', 'opt_2'],
        externalIDs: [createSquareExternalId('MODIFIER_LIST', 'SQ_MODIFIER_LIST_123')],
      });

      const deps = createMockSquareSyncDeps({
        catalog: {
          modifierTypes: [modifierTypeWithSquareIds],
          options: [optionWithSquareIds, optionWithSquareIds2],
        },
      });

      // Mock Square to return all objects as found (they exist)
      (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue({
        success: true,
        result: {
          objects: [
            { id: 'SQ_MODIFIER_LIST_123' },
            { id: 'SQ_MODIFIER_123' },
            { id: 'SQ_MODIFIER_HEAVY_123' },
            { id: 'SQ_MODIFIER_456' },
          ],
        },
      });

      const result = await checkAllModifierTypesHaveSquareIdsAndFixIfNeeded(deps);

      // Should return empty array - no modifications needed
      expect(result).toEqual([]);

      // batchUpdateModifierType should NOT have been called
      expect(deps.batchUpdateModifierType).not.toHaveBeenCalled();
    });
  });

  describe('when modifier types are missing MODIFIER_LIST Square ID', () => {
    it('should return the modifier type ID and trigger update', async () => {
      // Option has Square ID
      const optionWithSquareIds = createMockOption({
        id: 'opt_1',
        externalIDs: [createSquareExternalId('MODIFIER_WHOLE', 'SQ_MODIFIER_123')],
      });

      // Modifier type is MISSING the MODIFIER_LIST Square ID
      const modifierTypeMissingSquareId = createMockOptionType({
        id: 'mt_1',
        options: ['opt_1'],
        externalIDs: [], // No Square IDs!
      });

      const deps = createMockSquareSyncDeps({
        catalog: {
          modifierTypes: [modifierTypeMissingSquareId],
          options: [optionWithSquareIds],
        },
      });

      // Mock successful update
      (deps.batchUpdateModifierType as jest.Mock).mockResolvedValue([{ id: 'mt_1' }]);

      const result = await checkAllModifierTypesHaveSquareIdsAndFixIfNeeded(deps);

      // Should return the modifier type ID that needed updating
      expect(result).toContain('mt_1');

      // batchUpdateModifierType SHOULD have been called
      expect(deps.batchUpdateModifierType).toHaveBeenCalled();
    });
  });

  describe('when options are missing MODIFIER_WHOLE Square ID', () => {
    it('should return the modifier type ID and trigger update', async () => {
      // Option is MISSING the MODIFIER_WHOLE Square ID (the key bug we fixed)
      const optionMissingSquareId = createMockOption({
        id: 'opt_1',
        externalIDs: [], // No Square IDs!
      });

      // Modifier type has Square ID
      const modifierTypeWithSquareIds = createMockOptionType({
        id: 'mt_1',
        options: ['opt_1'],
        externalIDs: [createSquareExternalId('MODIFIER_LIST', 'SQ_MODIFIER_LIST_123')],
      });

      const deps = createMockSquareSyncDeps({
        catalog: {
          modifierTypes: [modifierTypeWithSquareIds],
          options: [optionMissingSquareId],
        },
      });

      // Mock Square to return modifier list as found
      (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue({
        success: true,
        result: { objects: [{ id: 'SQ_MODIFIER_LIST_123' }] },
      });

      // Mock successful update
      (deps.batchUpdateModifierType as jest.Mock).mockResolvedValue([{ id: 'mt_1' }]);

      const result = await checkAllModifierTypesHaveSquareIdsAndFixIfNeeded(deps);

      // Should return the modifier type ID because its option is missing Square IDs
      expect(result).toContain('mt_1');

      // batchUpdateModifierType SHOULD have been called
      expect(deps.batchUpdateModifierType).toHaveBeenCalled();
    });

    it('should NOT falsely flag modifier types when options have MODIFIER_WHOLE (regression test)', async () => {
      // This is the key regression test for the MODIFIER vs MODIFIER_WHOLE bug
      // Options have MODIFIER_WHOLE but NOT MODIFIER - this should be valid

      const optionWithModifierWhole = createMockOption({
        id: 'opt_1',
        externalIDs: [
          // Has MODIFIER_WHOLE (correct) but not MODIFIER (old incorrect check)
          createSquareExternalId('MODIFIER_WHOLE', 'SQ_MODIFIER_123'),
        ],
      });

      const modifierTypeValid = createMockOptionType({
        id: 'mt_1',
        options: ['opt_1'],
        externalIDs: [createSquareExternalId('MODIFIER_LIST', 'SQ_MODIFIER_LIST_123')],
      });

      const deps = createMockSquareSyncDeps({
        catalog: {
          modifierTypes: [modifierTypeValid],
          options: [optionWithModifierWhole],
        },
      });

      // Mock Square to return all objects as found
      (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue({
        success: true,
        result: {
          objects: [{ id: 'SQ_MODIFIER_LIST_123' }, { id: 'SQ_MODIFIER_123' }],
        },
      });

      const result = await checkAllModifierTypesHaveSquareIdsAndFixIfNeeded(deps);

      // Should return empty - no updates needed
      expect(result).toEqual([]);

      // batchUpdateModifierType should NOT have been called
      expect(deps.batchUpdateModifierType).not.toHaveBeenCalled();
    });
  });

  describe('when Square objects exist in DB but not in Square catalog', () => {
    it('should prune stale IDs and return the affected modifier type IDs', async () => {
      // Option and modifier type have Square IDs that no longer exist in Square
      const optionWithStaleId = createMockOption({
        id: 'opt_1',
        externalIDs: [createSquareExternalId('MODIFIER_WHOLE', 'STALE_SQ_ID_123')],
      });

      const modifierTypeWithStaleId = createMockOptionType({
        id: 'mt_1',
        options: ['opt_1'],
        externalIDs: [createSquareExternalId('MODIFIER_LIST', 'STALE_SQ_MODIFIER_LIST')],
      });

      const deps = createMockSquareSyncDeps({
        catalog: {
          modifierTypes: [modifierTypeWithStaleId],
          options: [optionWithStaleId],
        },
      });

      // Mock Square to return EMPTY - these IDs don't exist in Square!
      (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue({
        success: true,
        result: { objects: [] },
      });

      // Mock successful update after pruning
      (deps.batchUpdateModifierType as jest.Mock).mockResolvedValue([{ id: 'mt_1' }]);

      const result = await checkAllModifierTypesHaveSquareIdsAndFixIfNeeded(deps);

      // Should return the modifier type ID that had stale IDs pruned
      expect(result).toContain('mt_1');

      // batchUpdateModifierType SHOULD have been called to regenerate IDs
      expect(deps.batchUpdateModifierType).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// checkAllProductsHaveSquareIdsAndFixIfNeeded Tests
// =============================================================================

describe('checkAllProductsHaveSquareIdsAndFixIfNeeded', () => {
  describe('when all product instances have valid Square IDs', () => {
    it('should NOT trigger any updates', async () => {
      // Create product instance with proper Square IDs (ITEM and ITEM_VARIATION)
      const productInstanceWithSquareIds = createMockProductInstance({
        id: 'pi_1',
        externalIDs: [
          createSquareExternalId('ITEM', 'SQ_ITEM_123'),
          createSquareExternalId('ITEM_VARIATION', 'SQ_ITEM_VAR_123'),
        ],
        // displayFlags default to hide: false which is what we want
      });

      // Create product with the instance
      const productWithSquareIds = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1'],
      });

      const deps = createMockSquareSyncDeps({
        catalog: {
          products: [productWithSquareIds],
          productInstances: [productInstanceWithSquareIds],
        },
      });

      // Mock Square to return all objects as found
      (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue({
        success: true,
        result: {
          objects: [{ id: 'SQ_ITEM_123' }, { id: 'SQ_ITEM_VAR_123' }],
        },
      });

      await checkAllProductsHaveSquareIdsAndFixIfNeeded(deps);

      // batchUpdateProductInstance should NOT have been called
      expect(deps.batchUpdateProductInstance).not.toHaveBeenCalled();
    });
  });

  describe('when product instances are missing ITEM Square ID', () => {
    it('should trigger update for the product instance', async () => {
      // Product instance is MISSING the ITEM Square ID
      const productInstanceMissingSquareId = createMockProductInstance({
        id: 'pi_1',
        externalIDs: [], // No Square IDs!
        // displayFlags default to hide: false which is what we want
      });

      const product = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1'],
      });

      const deps = createMockSquareSyncDeps({
        catalog: {
          products: [product],
          productInstances: [productInstanceMissingSquareId],
        },
      });

      // Mock successful update
      (deps.batchUpdateProductInstance as jest.Mock).mockResolvedValue([{ id: 'pi_1' }]);

      await checkAllProductsHaveSquareIdsAndFixIfNeeded(deps);

      // batchUpdateProductInstance SHOULD have been called
      expect(deps.batchUpdateProductInstance).toHaveBeenCalled();
    });
  });

  describe('when product instances are hidden in POS', () => {
    it('should NOT trigger updates for hidden instances (regression test)', async () => {
      // Product instance is missing Square IDs BUT is hidden in POS
      const hiddenProductInstance = createMockProductInstance({
        id: 'pi_hidden',
        externalIDs: [], // No Square IDs, but hidden so should be skipped
        displayFlags: createMockProductInstanceDisplayFlags({
          pos: createMockProductInstanceDisplayFlagsPos({ hide: true }),
        }),
      });

      const product = createMockProduct({
        id: 'prod_1',
        instances: ['pi_hidden'],
      });

      const deps = createMockSquareSyncDeps({
        catalog: {
          products: [product],
          productInstances: [hiddenProductInstance],
        },
      });

      await checkAllProductsHaveSquareIdsAndFixIfNeeded(deps);

      // batchUpdateProductInstance should NOT have been called
      // (hidden instances don't need Square IDs)
      expect(deps.batchUpdateProductInstance).not.toHaveBeenCalled();
    });
  });

  describe('when Square objects exist in DB but not in Square catalog', () => {
    it('should prune stale IDs and trigger update', async () => {
      // Product instance has Square IDs that no longer exist in Square
      const productInstanceWithStaleId = createMockProductInstance({
        id: 'pi_1',
        externalIDs: [
          createSquareExternalId('ITEM', 'STALE_SQ_ITEM_123'),
          createSquareExternalId('ITEM_VARIATION', 'STALE_SQ_ITEM_VAR_123'),
        ],
        // displayFlags default to hide: false which is what we want
      });

      const product = createMockProduct({
        id: 'prod_1',
        instances: ['pi_1'],
      });

      const deps = createMockSquareSyncDeps({
        catalog: {
          products: [product],
          productInstances: [productInstanceWithStaleId],
        },
      });

      // Mock Square to return EMPTY - these IDs don't exist in Square!
      (deps.squareService.BatchRetrieveCatalogObjects as jest.Mock).mockResolvedValue({
        success: true,
        result: { objects: [] },
      });

      // Mock successful update after pruning
      (deps.batchUpdateProductInstance as jest.Mock).mockResolvedValue([{ piid: 'pi_1' }]);

      await checkAllProductsHaveSquareIdsAndFixIfNeeded(deps);

      // batchUpdateProductInstance SHOULD have been called to regenerate IDs
      expect(deps.batchUpdateProductInstance).toHaveBeenCalled();
    });
  });
});
