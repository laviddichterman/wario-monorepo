import {
  type BatchDeleteCatalogObjectsResponse,
  type BatchRetrieveCatalogObjectsResponse,
  type BatchUpsertCatalogObjectsResponse,
  type CatalogCategory,
  type CatalogIdMapping,
  type CatalogItem,
  type CatalogItemVariation,
  type CatalogModifier,
  type CatalogModifierList,
  type CatalogObject,
  type CatalogObjectBatch,
} from 'square';

import {
  type SquareProviderApiCallReturnSuccess,
  type SquareProviderApiCallReturnValue,
} from '../../src/config/square/square.service';

// ============================================================================
// ID Mapping Types & Helpers
// ============================================================================

/**
 * Creates a mock CatalogIdMapping.
 */
export function createMockCatalogIdMapping(clientObjectId?: string, objectId?: string): CatalogIdMapping {
  return {
    clientObjectId,
    objectId,
  };
}

/**
 * Factory that returns a generator function for server IDs.
 */
export function createMockIdMappingGenerator(prefix = 'sq_id_') {
  let counter = 0;
  return () => `${prefix}${String(++counter)}`;
}

/**
 * Tracks client ID -> server ID mappings across batch operations.
 * Simulates Square's behavior of assigning permanent IDs to temporary client IDs.
 */
export class SquareIdMappingTracker {
  private mappings: Map<string, string> = new Map();
  private generateServerId: () => string;

  constructor(idGenerator?: () => string) {
    this.generateServerId = idGenerator ?? createMockIdMappingGenerator();
  }

  /**
   * Gets an existing server ID for a client ID, or creates a new one.
   * If the client ID is not temporary (doesn't start with #), returns it as is.
   */
  getOrCreateServerId(clientId: string): string {
    if (!clientId.startsWith('#')) {
      return clientId;
    }

    if (!this.mappings.has(clientId)) {
      this.mappings.set(clientId, this.generateServerId());
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.mappings.get(clientId)!;
  }

  /**
   * Processes a batch of catalog objects, generating mappings for any temporary IDs.
   */
  processObjectBatch(objects: CatalogObject[]): CatalogIdMapping[] {
    return objects
      .filter((obj) => obj.id && obj.id.startsWith('#'))
      .map((obj) => ({
        clientObjectId: obj.id,

        objectId: this.getOrCreateServerId(obj.id),
      }));
  }

  /**
   * Transforms objects by replacing temporary IDs with server IDs.
   * This is a shallow replacement on the object itself and common reference fields.
   */
  transformObjects(objects: CatalogObject[]): CatalogObject[] {
    return objects.map((obj) => {
      const serverId: string = this.getOrCreateServerId(obj.id);
      const transformed: CatalogObject = {
        ...obj,
        id: serverId,
        updatedAt: new Date().toISOString(),
        version: BigInt((Number(obj.version) || 0) + 1), // Bump version
      };

      // Handle specific type internal references
      if (transformed.type === 'ITEM_VARIATION' && transformed.itemVariationData?.itemId) {
        transformed.itemVariationData = {
          ...transformed.itemVariationData,
          itemId: this.getOrCreateServerId(transformed.itemVariationData.itemId),
        };
      } else if (transformed.type === 'ITEM' && transformed.itemData?.variations) {
        transformed.itemData = {
          ...transformed.itemData,
          variations: this.transformObjects(transformed.itemData.variations),
        };
      }

      return transformed;
    });
  }
}

// ============================================================================
// Catalog Object Generators
// ============================================================================

export function createMockSquareCatalogObject(type: string, overrides: Partial<CatalogObject> = {}): CatalogObject {
  return {
    type,
    id: overrides.id ?? `#temp_${type}_${Math.random().toString(36).substring(7)}`,
    presentAtAllLocations: true,
    version: BigInt(1),
    isDeleted: false,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockSquareItem(
  overrides: Partial<CatalogItem> = {},
  baseOverrides: Partial<CatalogObject> = {},
): CatalogObject {
  return createMockSquareCatalogObject('ITEM', {
    ...baseOverrides,
    itemData: {
      name: 'Mock Item',
      descriptionHtml: '<p>Mock Description</p>',
      variations: [],
      ...overrides,
    },
  });
}

export function createMockSquareItemVariation(
  overrides: Partial<CatalogItemVariation> = {},
  baseOverrides: Partial<CatalogObject> = {},
): CatalogObject {
  return createMockSquareCatalogObject('ITEM_VARIATION', {
    ...baseOverrides,
    itemVariationData: {
      itemId: '', // Should be set by caller or tracker
      name: 'Regular',
      pricingType: 'FIXED_PRICING',
      priceMoney: { amount: 100n, currency: 'USD' },
      ...overrides,
    },
  });
}

export function createMockSquareModifierList(
  overrides: Partial<CatalogModifierList> = {},
  baseOverrides: Partial<CatalogObject> = {},
): CatalogObject {
  return createMockSquareCatalogObject('MODIFIER_LIST', {
    ...baseOverrides,
    modifierListData: {
      name: 'Mock Modifier List',
      modifiers: [],
      ...overrides,
    },
  });
}

export function createMockSquareModifier(
  overrides: Partial<CatalogModifier> = {},
  baseOverrides: Partial<CatalogObject> = {},
): CatalogObject {
  return createMockSquareCatalogObject('MODIFIER', {
    ...baseOverrides,
    modifierData: {
      name: 'Mock Modifier',
      priceMoney: { amount: 50n, currency: 'USD' },
      ...overrides,
    },
  });
}

export function createMockSquareCategory(
  overrides: Partial<CatalogCategory> = {},
  baseOverrides: Partial<CatalogObject> = {},
): CatalogObject {
  return createMockSquareCatalogObject('CATEGORY', {
    ...baseOverrides,
    categoryData: {
      name: 'Mock Category',
      ...overrides,
    },
  });
}

// ============================================================================
// Response Generators
// ============================================================================

export function createMockBatchUpsertResponse(
  catalogObjectBatches: CatalogObjectBatch[],
  tracker: SquareIdMappingTracker = new SquareIdMappingTracker(),
): BatchUpsertCatalogObjectsResponse {
  const allObjects = catalogObjectBatches.flatMap((b) => b.objects);
  const idMappings = tracker.processObjectBatch(allObjects);
  const transformedObjects = tracker.transformObjects(allObjects);

  return {
    objects: transformedObjects,
    idMappings,
    updatedAt: new Date().toISOString(),
  };
}

export function createMockBatchRetrieveResponse(objects: CatalogObject[]): BatchRetrieveCatalogObjectsResponse {
  return {
    objects,
    relatedObjects: [],
  };
}

export function createMockBatchDeleteResponse(objectIds: string[]): BatchDeleteCatalogObjectsResponse {
  return {
    deletedObjectIds: objectIds,
    deletedAt: new Date().toISOString(),
  };
}

/**
 * Helper to wrap a result in a standard Square Service success response.
 */
export function createSquareSuccessResponse<T>(result: T): SquareProviderApiCallReturnSuccess<T> {
  return {
    success: true,
    result,
    error: [],
  };
}

/**
 * Helper to create a failure response.
 */
export function createSquareFailureResponse<T>(
  errors: { category: string; code: string; detail: string }[],
): SquareProviderApiCallReturnValue<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = null;
  return {
    success: false,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    result,
    error: errors,
  };
}
