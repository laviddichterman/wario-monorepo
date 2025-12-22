import { chunk } from 'es-toolkit/compat';
import type { PinoLogger } from 'nestjs-pino';
import type { CatalogIdMapping, CatalogObject } from 'square/legacy';

import {
  type CreateIProductInstanceRequest,
  type CreateIProductRequest,
  type CreateIProductRequestDto,
  type ICatalog,
  type ICatalogSelectors,
  type ICategory,
  type IOptionType,
  type IProduct,
  type IProductInstance,
  type KeyValue,
  type PrinterGroup,
  ReduceArrayToMapByKey,
  type UpdateIProductInstanceRequest,
  type UpdateIProductRequest,
  type UpdateIProductRequestDto,
  type UpsertIProductInstanceRequest,
} from '@wcp/wario-shared';

import type { AppConfigService } from 'src/config/app-config.service';
import {
  GetExistingSquareCatalogObjectInfoForProduct,
  GetNonSquareExternalIds,
  GetSquareExternalIds,
  IdMappingsToExternalIds,
  ProductInstanceToSquareCatalogHelper,
  ProductInstanceToSquareCatalogObject,
  ValidateModifiersForInstance,
} from 'src/config/square-wario-bridge';
import type { DataProviderService } from 'src/modules/data-provider/data-provider.service';

import type { IProductInstanceRepository } from '../../repositories/interfaces/product-instance.repository.interface';
import type { IProductRepository } from '../../repositories/interfaces/product.repository.interface';
import { IsSetOfUniqueStrings } from '../../utils/utils';
import type { SquareService } from '../integrations/square/square.service';

import {
  isCreateProductInstance,
  isUpdateProduct,
  isUpdateProductInstance,
  LocationsConsidering3pFlag,
  type UpsertProductInstanceProps,
} from './catalog.types';

type IndexedUpsertIProductRequest = { product: CreateIProductRequestDto | UpdateIProductRequestDto; index: number };
type IndexedUpdateIProductRequest = { product: UpdateIProductRequestDto; index: number };
type IndexedCreateIProductRequest = { product: CreateIProductRequestDto; index: number };
type IndexedUpdateProductWithSplitInstances = IndexedUpdateIProductRequest & {
  noOpInstances: { instance: string; index: number }[];
  updateIProductInstances: { instance: UpdateIProductInstanceRequest; index: number }[];
  insertIProductInstances: { instance: CreateIProductInstanceRequest; index: number }[];
};

// ============================================================================
// Dependencies Interface
// ============================================================================

export interface ProductDeps {
  productRepository: IProductRepository;
  productInstanceRepository: IProductInstanceRepository;
  logger: PinoLogger;
  squareService: SquareService;
  dataProviderService: DataProviderService;
  appConfig: AppConfigService;

  // State
  catalog: ICatalog;
  catalogSelectors: ICatalogSelectors;
  modifierTypes: IOptionType[];
  categories: Record<string, ICategory>;
  printerGroups: Record<string, PrinterGroup>;
  productInstanceFunctions: Record<string, unknown>; // Only keys strictly needed using Object.hasOwn

  // Callbacks
  syncProducts: () => Promise<boolean>;
  syncProductInstances: () => Promise<boolean>;
  recomputeCatalog: () => void;
  batchDeleteCatalogObjectsFromExternalIds: (ids: KeyValue[]) => Promise<unknown>;
}

// ============================================================================
// Helpers
// ============================================================================

const getLocationsConsidering3pFlag = (deps: ProductDeps, is3p: boolean) =>
  LocationsConsidering3pFlag(
    is3p,
    deps.dataProviderService.getKeyValueConfig().SQUARE_LOCATION_ALTERNATE,
    deps.dataProviderService.getKeyValueConfig().SQUARE_LOCATION,
    deps.dataProviderService.getKeyValueConfig().SQUARE_LOCATION_3P,
  );

const ValidateProductModifiersFunctionsCategoriesPrinterGroups = function (
  modifiers: { mtid: string; enable?: string | null }[],
  category_ids: string[],
  printer_group_ids: string[],
  deps: ProductDeps,
) {
  const found_all_modifiers = modifiers
    .map(
      (entry) =>
        deps.modifierTypes.some((x) => x.id === entry.mtid) &&
        (entry.enable == null || Object.hasOwn(deps.productInstanceFunctions, entry.enable)),
    )
    .every((x) => x);
  const found_all_categories = category_ids.map((cid) => Object.hasOwn(deps.categories, cid)).every((x) => x);
  const found_all_printer_groups = printer_group_ids
    .map((pgid) => Object.hasOwn(deps.printerGroups, pgid))
    .every((x) => x);
  return found_all_categories && found_all_modifiers && found_all_printer_groups;
};

// ============================================================================
// Operations
// ============================================================================

export const batchUpsertProduct = async (
  deps: ProductDeps,
  batches: (CreateIProductRequestDto | UpdateIProductRequestDto)[],
): Promise<{ product: IProduct; instances: IProductInstance[] }[] | null> => {
  // very initial validation
  if (
    !ValidateProductModifiersFunctionsCategoriesPrinterGroups(
      batches.flatMap((x): { mtid: string; enable?: string | null }[] => x.modifiers ?? []), // check invalid mods
      [], // categories are no longer tracked on products
      batches.reduce((pgids: string[], x): string[] => {
        if (x.printerGroup) {
          return [...pgids, x.printerGroup];
        }
        return pgids;
      }, []), // check invalid printer groups
      deps,
    )
  ) {
    return null;
  }
  // split out the two classes of operations
  // keep track by using indexed batches
  const indexedBatches = batches.map((x, i) => ({ product: x, index: i })) as IndexedUpsertIProductRequest[];
  const updateBatches = indexedBatches.filter((b) => isUpdateProduct(b.product)) as IndexedUpdateIProductRequest[];
  const updateBatchesWithSplitInstances: IndexedUpdateProductWithSplitInstances[] = updateBatches.map((b) => {
    const indexedInstances = b.product.instances.map((x, i) => ({ instance: x, index: i }));
    const noOpInstances = indexedInstances.filter((b) => typeof b.instance === 'string') as {
      instance: string;
      index: number;
    }[];
    const updateIProductInstances = indexedInstances.filter(
      (c) => c.instance && isUpdateProductInstance(c.instance),
    ) as { instance: UpdateIProductInstanceRequest; index: number }[];
    const insertIProductInstances = indexedInstances.filter(
      (c) => c.instance && isCreateProductInstance(c.instance),
    ) as { instance: CreateIProductInstanceRequest; index: number }[];
    return {
      ...b,
      noOpInstances,
      updateIProductInstances,
      insertIProductInstances,
    };
  });
  const insertBatches = indexedBatches.filter((b) => !isUpdateProduct(b.product)) as IndexedCreateIProductRequest[];

  // validate everything and error out if needed (OR of any failure cases)
  // validate update batches
  const updateProductIds = updateBatches.map((x) => x.product.id);
  if (!IsSetOfUniqueStrings(updateProductIds)) {
    //an IProduct to update can only appear once, otherwise an error is returned.
    deps.logger.error({ IDs: updateProductIds }, `Batch request specifies multiple of the same Product ID`);
    return null;
  }
  for (const b of updateBatchesWithSplitInstances) {
    const noOpInstances = b.noOpInstances;
    const updateIProductInstances = b.updateIProductInstances;
    const insertInstances = b.insertIProductInstances;
    if (!Object.hasOwn(deps.catalog.products, b.product.id)) {
      // check product being updated exists
      deps.logger.error(`Product ${b.product.id} does not exist`);
      return null;
    }
    const referencedProductInstanceIds = [
      ...updateIProductInstances.map((x) => x.instance.id),
      ...noOpInstances.map((x) => x.instance),
    ];
    if (!IsSetOfUniqueStrings(referencedProductInstanceIds)) {
      deps.logger.error(`Product ${b.product.id} contains duplicate product instance ids`);
      return null;
    }
    const existingProduct = deps.catalog.products[b.product.id];
    const updateInstancesContainsAllExistingProductInstances = referencedProductInstanceIds.every((x) =>
      existingProduct.instances.includes(x),
    );
    if (!updateInstancesContainsAllExistingProductInstances) {
      deps.logger.error(`Product ${b.product.id} does not contain all existing product instances`);
      return null;
    }
    for (const productInstanceId of referencedProductInstanceIds) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!deps.catalog.productInstances[productInstanceId]) {
        deps.logger.error(`Product Instance with id ${productInstanceId} does not exist`);
        return null;
      }
    }
    for (const update of updateIProductInstances) {
      if (
        !ValidateModifiersForInstance(
          b.product.modifiers ?? deps.catalog.products[b.product.id].modifiers,
          update.instance.modifiers ?? deps.catalog.productInstances[update.instance.id].modifiers,
        )
      ) {
        deps.logger.error(`Product ${b.product.id} has invalid modifiers for instance ${update.instance.id}`);
        return null;
      }
    }
    for (const insert of insertInstances) {
      if (
        !ValidateModifiersForInstance(
          b.product.modifiers ?? deps.catalog.products[b.product.id].modifiers,
          insert.instance.modifiers,
        )
      ) {
        deps.logger.error({ instance: insert.instance }, `Product ${b.product.id} has invalid modifiers for instance`);
        return null;
      }
    }
  }
  // validate insert product batches
  for (const b of insertBatches) {
    if (b.product.instances.length === 0) {
      deps.logger.error({ b }, 'Product has no instances');
      return null;
    }
    for (const instance of b.product.instances) {
      if (!ValidateModifiersForInstance(b.product.modifiers, instance.modifiers)) {
        deps.logger.error({ instance }, 'Invalid modifiers for instance');
        return null;
      }
    }
  }

  // validation passed! on to the work

  const catalogObjectsForUpsert: CatalogObject[] = [];
  const existingSquareObjects: CatalogObject[] = [];
  const existingSquareExternalIds: KeyValue[] = [];
  // these need to be deleted from square since they were previously not hidden from POS and now they are
  const externalIdsToDelete: string[] = [];

  // gather IProducts needing update in our DB, IProductInstances needing update in our DB, and products needing upsert in the square catalog
  const adjustedUpdateBatches = updateBatchesWithSplitInstances.map((b, i) => {
    const oldProductEntry = deps.catalog.products[b.product.id];
    let removedModifierTypes: string[] = [];
    let addedModifierTypes = false;
    const adjustedPrice = b.product.price && b.product.price !== oldProductEntry.price ? b.product.price : null;
    const adjustedPrinterGroup = b.product.printerGroup !== oldProductEntry.printerGroup;

    if (b.product.modifiers) {
      const oldModifierTypes = oldProductEntry.modifiers.map((x) => x.mtid);
      const newModifierTypes = b.product.modifiers.map((x) => x.mtid);
      removedModifierTypes = oldModifierTypes.filter((x) => !newModifierTypes.includes(x));
      addedModifierTypes = newModifierTypes.filter((x) => !oldModifierTypes.includes(x)).length > 0;
    }
    const mergedProduct = { ...oldProductEntry, ...(b.product as UpdateIProductRequest) };

    const adjustedInsertInstances = b.insertIProductInstances.map((x) => {
      // we need to filter these external IDs because it'll interfere with adding the new product to the catalog
      return {
        ...x,
        productId: b.product.id,
        externalIDs: GetNonSquareExternalIds(x.instance.externalIDs),
      };
    });
    // add the insert instances
    catalogObjectsForUpsert.push(
      ...adjustedInsertInstances
        .filter((pi) => !pi.instance.displayFlags.pos.hide)
        .map((pi, k) =>
          ProductInstanceToSquareCatalogObject(
            deps.appConfig.isProduction,
            getLocationsConsidering3pFlag(deps, mergedProduct.displayFlags.is3p),
            mergedProduct,
            pi.instance,
            mergedProduct.printerGroup ? deps.printerGroups[mergedProduct.printerGroup] : null,
            deps.catalogSelectors,
            GetExistingSquareCatalogObjectInfoForProduct(pi.instance, [], (i * 1000 + k).toString().padStart(7, '0')),
            deps.logger,
          ),
        ),
    );

    // aggregate implicit updates of product instances,
    const implicitUpdateInstances: { instance: IProductInstance; index: number }[] = b.noOpInstances
      .map((x) => ({ instance: deps.catalog.productInstances[x.instance], index: x.index }))
      .filter(
        (pi) =>
          adjustedPrice !== null ||
          adjustedPrinterGroup ||
          addedModifierTypes ||
          pi.instance.modifiers.filter((mod) => removedModifierTypes.includes(mod.modifierTypeId)).length > 0,
      )
      .map((pi) => ({
        instance: {
          ...pi.instance,
          modifiers: pi.instance.modifiers.filter((x) => !removedModifierTypes.includes(x.modifierTypeId)),
        },
        index: pi.index,
      }));

    // Track pure noOp instances (those that didn't become implicit updates)
    const implicitUpdateIndices = new Set(implicitUpdateInstances.map((x) => x.index));
    const pureNoOpInstances: { id: string; index: number }[] = b.noOpInstances
      .filter((x) => !implicitUpdateIndices.has(x.index))
      .map((x) => ({ id: x.instance, index: x.index }));

    // check for any instances that need to be deleted from square
    externalIdsToDelete.push(
      ...b.updateIProductInstances
        .map((x) =>
          !deps.catalog.productInstances[x.instance.id].displayFlags.pos.hide && x.instance.displayFlags?.pos.hide
            ? GetSquareExternalIds(x.instance.externalIDs ?? deps.catalog.productInstances[x.instance.id].externalIDs)
            : [],
        )
        .flat()
        .map((x) => x.value),
    );

    // aggregate explicit updates of product instances
    const explicitUpdateProductInstances = b.updateIProductInstances.map((x) => {
      const oldInstance = deps.catalog.productInstances[x.instance.id];
      // these need to be deleted from square since they were previously not hidden from POS and now they are
      const needToDeleteSquareCatalogItem = !oldInstance.displayFlags.pos.hide && x.instance.displayFlags?.pos.hide;
      const mergedExternalIds = x.instance.externalIDs ?? deps.catalog.productInstances[x.instance.id].externalIDs;
      const newExternalIds = needToDeleteSquareCatalogItem
        ? GetNonSquareExternalIds(mergedExternalIds)
        : mergedExternalIds;
      if (needToDeleteSquareCatalogItem) {
        externalIdsToDelete.push(...GetSquareExternalIds(mergedExternalIds).map((x) => x.value));
      }
      return { index: x.index, instance: { ...oldInstance, ...x.instance, externalIDs: newExternalIds } };
    });

    const adjustedUpdatedInstances: { instance: IProductInstance; index: number }[] = [
      ...implicitUpdateInstances,
      ...explicitUpdateProductInstances,
    ];
    existingSquareExternalIds.push(
      ...adjustedUpdatedInstances.map((x) => GetSquareExternalIds(x.instance.externalIDs)).flat(),
    );
    return {
      product: mergedProduct,
      updateInstances: adjustedUpdatedInstances,
      insertInstances: adjustedInsertInstances,
      pureNoOpInstances,
      batchIter: i,
      index: b.index,
    };
  });

  const batchIter = adjustedUpdateBatches.length;
  // first grab all the square catalog objects from the external IDs from products (and instances) being updated
  // by getting these first, we can avoid modifiying anything if we get an error here
  if (existingSquareExternalIds.length > 0) {
    const batchRetrieveCatalogObjectsResponse = await deps.squareService.BatchRetrieveCatalogObjects(
      existingSquareExternalIds.map((x) => x.value),
      false,
    );
    if (!batchRetrieveCatalogObjectsResponse.success) {
      deps.logger.error(
        { err: batchRetrieveCatalogObjectsResponse.error },
        'Getting current square CatalogObjects failed',
      );
      return null;
    }
    existingSquareObjects.push(...(batchRetrieveCatalogObjectsResponse.result.objects ?? []));
  }

  // now that we have retrieved square catalog items we can add on the insert and update objects
  catalogObjectsForUpsert.push(
    ...adjustedUpdateBatches.flatMap((b) => {
      const updateCatalogObjects = b.updateInstances.flatMap((x, j) => {
        if (x.instance.displayFlags.pos.hide) {
          return [];
        }
        const { catalogObject, squareItemsToDelete } = ProductInstanceToSquareCatalogHelper(
          deps.appConfig.isProduction,
          getLocationsConsidering3pFlag(deps, b.product.displayFlags.is3p),
          b.product,
          x.instance,
          b.product.printerGroup ? deps.printerGroups[b.product.printerGroup] : null,
          deps.catalogSelectors,
          existingSquareObjects,
          (b.batchIter * 1000 + j).toString().padStart(7, '0'),
          deps.logger,
        );
        if (squareItemsToDelete.length > 0) {
          externalIdsToDelete.push(...squareItemsToDelete);
        }
        return [catalogObject];
      });
      const insertCatalogObjects = b.insertInstances.flatMap((x, k) => {
        if (x.instance.displayFlags.pos.hide) {
          return [];
        }
        return [
          ProductInstanceToSquareCatalogObject(
            deps.appConfig.isProduction,
            getLocationsConsidering3pFlag(deps, b.product.displayFlags.is3p),
            b.product,
            x.instance,
            b.product.printerGroup ? deps.printerGroups[b.product.printerGroup] : null,
            deps.catalogSelectors,
            GetExistingSquareCatalogObjectInfoForProduct(
              x.instance,
              [],
              (b.batchIter * 1000 + b.updateInstances.length + k).toString().padStart(7, '0'),
            ),
            deps.logger,
          ),
        ];
      });
      return [...updateCatalogObjects, ...insertCatalogObjects];
    }),
  );

  // create the insert product batches and add the instances to the square catalog objects we'll send to square
  const adjustedInsertBatches = insertBatches.map((b, i) => {
    // we're inserting a new product and instances. the first instance is the base product instance
    // we need to filter these square specific external IDs because it'll interfere with adding the new product to the catalog
    // and it doesn't make sense to have a pre-existing external ID for a product that doesn't exist yet
    const adjustedProduct: Omit<IProduct, 'id' | 'instances'> = {
      ...(b.product as Omit<CreateIProductRequest, 'instances'>),
      externalIDs: GetNonSquareExternalIds(b.product.externalIDs),
    };
    const adjustedInstances: Omit<IProductInstance, 'id'>[] = b.product.instances.map((x) => ({
      ...(x as CreateIProductInstanceRequest),
      externalIDs: GetNonSquareExternalIds(x.externalIDs),
    }));
    // first add the stuff to square so we can write to the DB in two operations
    catalogObjectsForUpsert.push(
      ...adjustedInstances
        .filter((pi) => !pi.displayFlags.pos.hide)
        .map((pi, j) =>
          ProductInstanceToSquareCatalogObject(
            deps.appConfig.isProduction,
            getLocationsConsidering3pFlag(deps, adjustedProduct.displayFlags.is3p),
            adjustedProduct,
            pi,
            adjustedProduct.printerGroup ? deps.printerGroups[adjustedProduct.printerGroup] : null,
            deps.catalogSelectors,
            GetExistingSquareCatalogObjectInfoForProduct(
              pi,
              [],
              ((i + batchIter + 2) * 1000 + j).toString().padStart(7, '0'),
            ),
            deps.logger,
          ),
        ),
    );
    return {
      product: adjustedProduct,
      instances: adjustedInstances,
      batchIter: i + batchIter + 2,
      index: i,
    };
  });

  // upsert the catalog objects to square and grab the mappings for the new objects
  let mappings: CatalogIdMapping[] = [];
  if (catalogObjectsForUpsert.length) {
    const upsertResponse = await deps.squareService.BatchUpsertCatalogObjects(
      chunk(catalogObjectsForUpsert, deps.appConfig.squareBatchChunkSize).map((x) => ({
        objects: x,
      })),
    );
    if (!upsertResponse.success) {
      deps.logger.error({ err: upsertResponse.error }, 'Failed to save square products');
      return null;
    }
    mappings = upsertResponse.result.idMappings ?? [];
  }

  // we upserted, so let's delete the stuff we need to
  if (externalIdsToDelete.length) {
    const deleteResponse = await deps.squareService.BatchDeleteCatalogObjects(externalIdsToDelete);
    if (!deleteResponse.success) {
      deps.logger.error({ err: deleteResponse.error }, 'Failed to delete square products');
      return null;
    }
  }

  // now that we have the mappings, we can update the products and instances
  const bulkUpdate = adjustedUpdateBatches.map((b) => {
    return {
      index: b.index,
      product: b.product,
      pureNoOpInstances: b.pureNoOpInstances,
      instances: b.updateInstances.map((x, j) => {
        return {
          index: x.index,
          instance: {
            ...x.instance,
            productId: b.product.id,
            externalIDs: [
              ...x.instance.externalIDs,
              ...IdMappingsToExternalIds(mappings, (b.batchIter * 1000 + j).toString().padStart(7, '0')),
            ],
          },
        };
      }),
    };
  }) as {
    index: number;
    product: IProduct;
    instances: { index: number; instance: IProductInstance }[];
    pureNoOpInstances: { id: string; index: number }[];
  }[];

  // Prepare insert instances for update product batches, we need to track the index in the instances array for these
  const updateBatchesInsertInstances: { instance: Omit<IProductInstance, 'id'>; batch: number; index: number }[][] =
    adjustedUpdateBatches.map((b) =>
      b.insertInstances.map((instance, j) => ({
        instance: {
          ...instance.instance,
          productId: b.product.id,
          externalIDs: [
            ...instance.instance.externalIDs,
            ...IdMappingsToExternalIds(
              mappings,
              (b.batchIter * 1000 + b.updateInstances.length + j).toString().padStart(7, '0'),
            ),
          ],
        },
        batch: b.index,
        index: instance.index,
      })),
    );

  // Create instances for insert batches
  const insertBatchInsertInstances = adjustedInsertBatches.map((b) =>
    b.instances.map((instance, j) => ({
      ...instance,
      externalIDs: [
        ...instance.externalIDs,
        ...IdMappingsToExternalIds(mappings, (b.batchIter * 1000 + j).toString().padStart(7, '0')),
      ],
    })),
  );

  // merge the insert instances for both create product and update product batches
  // into a single batch
  const insertBatchInsertInstancesFlat = insertBatchInsertInstances.flat();
  const updateBatchInsertInstancesFlat = updateBatchesInsertInstances.flat();
  const instanceCreateBatchCall = [
    ...insertBatchInsertInstancesFlat,
    ...updateBatchInsertInstancesFlat.map((x) => x.instance),
  ];
  const createdInstances =
    instanceCreateBatchCall.length > 0 ? await deps.productInstanceRepository.bulkCreate(instanceCreateBatchCall) : [];
  if (createdInstances.length) {
    deps.logger.debug({ count: createdInstances.length }, 'Instances creation result');
  }

  // piece the created instances back into the batches
  let offset = 0;
  const insertBatchInsertInstancesByBatch = insertBatchInsertInstances.map((batchInstances) => {
    const slice = createdInstances.slice(offset, offset + batchInstances.length);
    offset += batchInstances.length;
    return slice;
  });

  // create a map of batch index to instance index to instance
  const batchInstanceInsertMap: Record<number, Record<number, IProductInstance>> = {};
  updateBatchesInsertInstances.forEach((batchInstances) => {
    const slice = createdInstances.slice(offset, offset + batchInstances.length);
    slice.forEach((x, i) => {
      const { batch, index } = batchInstances[i];
      batchInstanceInsertMap[batch] ??= {};
      batchInstanceInsertMap[batch][index] = x;
    });
    offset += batchInstances.length;
  });

  // create the products
  const createProductBatchCall = adjustedInsertBatches.map((b, i) => {
    return {
      ...b.product,
      instances: insertBatchInsertInstancesByBatch[i].map((x) => x.id),
    } as IProduct;
  });
  const createdProducts =
    createProductBatchCall.length > 0 ? await deps.productRepository.bulkCreate(createProductBatchCall) : [];

  // collect the results of the insert batches
  const insertBatchResults = adjustedInsertBatches.map((b, i) => ({
    product: createdProducts[i],
    instances: insertBatchInsertInstancesByBatch[i],
    index: b.index,
  }));

  // we have the instances inserted, we need to interleave them with the update instances in order to create the instances array for the update call
  const updateProductBatchCall = bulkUpdate.map((b) => {
    const updateInstances = b.instances;
    const insertInstances = Object.hasOwn(batchInstanceInsertMap, b.index) ? batchInstanceInsertMap[b.index] : {};
    const pureNoOpInstances = b.pureNoOpInstances;
    const totalInstanceCount = updateInstances.length + Object.keys(insertInstances).length + pureNoOpInstances.length;
    const instancesArray = Array<string>(totalInstanceCount);
    // Fill in updated instances
    updateInstances.forEach((instance) => {
      instancesArray[instance.index] = instance.instance.id;
    });
    // Fill in newly inserted instances
    Object.keys(insertInstances).forEach((key) => {
      const numericKey = Number(key);
      instancesArray[numericKey] = insertInstances[numericKey].id;
    });
    // Fill in pure noOp instances (unchanged instances)
    pureNoOpInstances.forEach((instance) => {
      instancesArray[instance.index] = instance.id;
    });
    const { id, ...productWithoutId } = b.product;
    return {
      id,
      data: {
        ...productWithoutId,
        instances: instancesArray,
      },
    };
  }) satisfies {
    id: string;
    data: Partial<Omit<IProduct, 'id'>>;
  }[];
  if (updateProductBatchCall.length) {
    await deps.productRepository.bulkUpdate(updateProductBatchCall);
    deps.logger.debug({ count: updateProductBatchCall.length }, 'Bulk update of products successful');
  }
  const updateProductInstanceBatchCall = bulkUpdate.flatMap((b) =>
    b.instances.map((pi) => {
      const { id, ...instanceWithoutId } = pi.instance;
      return { id, data: instanceWithoutId };
    }),
  );
  if (updateProductInstanceBatchCall.length) {
    await deps.productInstanceRepository.bulkUpdate(updateProductInstanceBatchCall);
    deps.logger.debug({ count: updateProductInstanceBatchCall.length }, 'Bulk update of product instances successful');
  }

  await Promise.all([deps.syncProducts(), deps.syncProductInstances()]);
  deps.recomputeCatalog();

  // Reconstruct results
  const reconstructedBatches = ReduceArrayToMapByKey(insertBatchResults, 'index');
  bulkUpdate.forEach((b) => {
    reconstructedBatches[b.index] = {
      product: b.product,
      instances: b.instances.map((x) => x.instance),
      index: b.index,
    };
  });

  // Map created instances (from insert operations) back to their update batches
  // batchInstanceInsertMap: Record<batchIndex, Record<instancePositionInBatch, IProductInstance>>
  Object.keys(batchInstanceInsertMap).forEach((batchIndexStr) => {
    const batchIndex = Number(batchIndexStr);
    const insertedInstancesMap = batchInstanceInsertMap[batchIndex];
    const insertedInstances = Object.keys(insertedInstancesMap)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => insertedInstancesMap[Number(key)]);
    // Interleave: the instances in reconstructedBatches are already ordered by their original index,
    // so we just concatenate since insertedInstances go at their designated positions
    reconstructedBatches[batchIndex].instances = [...reconstructedBatches[batchIndex].instances, ...insertedInstances];
  });

  return Object.values(reconstructedBatches)
    .sort((a, b) => a.index - b.index)
    .map((x) => ({
      product: x.product,
      instances: x.instances,
    }));
};

export const createProduct = async (deps: ProductDeps, product: CreateIProductRequest) => {
  const result = await batchUpsertProduct(deps, [product]);
  return result ? result[0] : null;
};

export const updateProduct = async (deps: ProductDeps, pid: string, product: UpdateIProductRequest) => {
  const result = await batchUpsertProduct(deps, [product]);
  return result ? result[0].product : null;
};

export const batchDeleteProduct = async (
  deps: ProductDeps,
  p_ids: string[],
  suppress_catalog_recomputation: boolean = false,
) => {
  deps.logger.debug({ p_ids }, 'Removing Product(s)');
  const productEntries = p_ids.map((x) => deps.catalog.products[x]);

  const deletedCount = await deps.productRepository.bulkDelete(p_ids);
  if (deletedCount === 0) {
    return null;
  }
  const instanceIds = productEntries.flatMap((x) => x.instances);
  // removing ALL product instances from Square
  await deps.batchDeleteCatalogObjectsFromExternalIds(
    instanceIds.reduce<KeyValue[]>((acc, pi) => [...acc, ...deps.catalog.productInstances[pi].externalIDs], []),
  );

  const instanceDeleteCount = await deps.productInstanceRepository.bulkDelete(instanceIds);
  if (instanceDeleteCount > 0) {
    deps.logger.debug(`Removed ${instanceDeleteCount.toString()} Product Instances.`);
    await deps.syncProductInstances();
  }
  await deps.syncProducts();
  if (!suppress_catalog_recomputation) {
    deps.recomputeCatalog();
  }
  return { deletedCount, acknowledged: true };
};

export const deleteProduct = async (deps: ProductDeps, p_id: string) => {
  deps.logger.debug({ p_id }, 'Removing Product');
  const productEntry = deps.catalog.products[p_id];

  const existing = await deps.productRepository.findById(p_id);
  if (!existing) {
    return null;
  }

  const deleted = await deps.productRepository.delete(p_id);
  if (!deleted) {
    return null;
  }

  // removing ALL product instances from Square
  await deps.batchDeleteCatalogObjectsFromExternalIds(
    productEntry.instances.reduce<KeyValue[]>(
      (acc, pi) => [...acc, ...deps.catalog.productInstances[pi].externalIDs],
      [],
    ),
  );

  const instanceDeleteCount = await deps.productInstanceRepository.bulkDelete(productEntry.instances);
  if (instanceDeleteCount > 0) {
    deps.logger.debug(`Removed ${instanceDeleteCount.toString()} Product Instances.`);
    await deps.syncProductInstances();
  }
  await deps.syncProducts();
  deps.recomputeCatalog();
  return existing;
};

export const createProductInstance = async (
  deps: ProductDeps,
  productId: string,
  instance: Omit<IProductInstance, 'id'>,
) => {
  // we need to filter these external IDs because it'll interfere with adding the new product to the catalog
  const filteredExternalIds = GetNonSquareExternalIds(instance.externalIDs);
  let adjustedInstance: Omit<IProductInstance, 'id'> = {
    ...instance,
    externalIDs: filteredExternalIds,
  };

  if (!instance.displayFlags.pos.hide) {
    // add the product instance to the square catalog here
    const product = deps.catalog.products[productId];
    const upsertResponse = await deps.squareService.UpsertCatalogObject(
      ProductInstanceToSquareCatalogObject(
        deps.appConfig.isProduction,
        getLocationsConsidering3pFlag(deps, product.displayFlags.is3p),
        product,
        adjustedInstance,
        product.printerGroup ? deps.printerGroups[product.printerGroup] : null,
        deps.catalogSelectors,
        GetExistingSquareCatalogObjectInfoForProduct(adjustedInstance, [], ''),
        deps.logger,
      ),
    );
    if (!upsertResponse.success) {
      deps.logger.error({ err: upsertResponse.error }, 'failed to add square product');
      return null;
    }
    adjustedInstance = {
      ...adjustedInstance,
      externalIDs: [...adjustedInstance.externalIDs, ...IdMappingsToExternalIds(upsertResponse.result.idMappings, '')],
    };
  }

  const created = await deps.productInstanceRepository.create(adjustedInstance);
  await deps.syncProductInstances();
  deps.recomputeCatalog();
  return created;
};

const ValidateAndPrepareProductInstanceUpdate = (deps: ProductDeps, batch: UpsertProductInstanceProps) => {
  const oldProductInstance = deps.catalog.productInstances[batch.piid] as IProductInstance | undefined;
  if (!oldProductInstance) {
    throw new Error(`Product Instance ${batch.piid} does not exist`);
  }
  const existingSquareExternalIds = GetSquareExternalIds(oldProductInstance.externalIDs);
  const newExternalIds = batch.productInstance.externalIDs ?? oldProductInstance.externalIDs;
  if (new Set(newExternalIds.map((x) => x.key)).size !== newExternalIds.length) {
    deps.logger.error({ newExternalIds }, 'Duplicate external IDs');
    throw new Error('Duplicate external IDs');
  }
  const isNowHiddenFromPos =
    !oldProductInstance.displayFlags.pos.hide && batch.productInstance.displayFlags?.pos.hide === true;
  const squareIdsToDelete =
    // if we're now hidden from POS, we need to delete the product instance from Square,
    isNowHiddenFromPos
      ? existingSquareExternalIds
      : // if we're not hidden from POS, we need to delete the product instance from Square if it's not in the new external IDs
        existingSquareExternalIds.filter((x) => !newExternalIds.some((y) => y.key === x.key));

  const { id: _id, ...oldProductInstanceData } = oldProductInstance;
  const { id: __id, ...newProductInstanceData } = batch.productInstance as UpsertIProductInstanceRequest & {
    id?: unknown;
  };
  const newProductInstance = {
    ...oldProductInstanceData,
    ...newProductInstanceData,
  };
  return {
    piid: batch.piid,
    product: batch.product,
    squareIdsToDelete: squareIdsToDelete.map((x) => x.value),
    newProductInstance,
  };
};

export const batchUpdateProductInstance = async (
  deps: ProductDeps,
  batches: UpsertProductInstanceProps[],
  suppress_catalog_recomputation: boolean = false,
): Promise<IProductInstance[] | null> => {
  deps.logger.debug(
    {
      batches: batches.map((x) => ({ piid: x.piid, changes: x.productInstance })),
      suppress_catalog_recomputation,
    },
    'Updating product instance(s)',
  );

  const batchedUpdates = batches.map((batch) => ValidateAndPrepareProductInstanceUpdate(deps, batch));
  const existingSquareExternalIds = batchedUpdates
    .map((b) => GetSquareExternalIds(b.newProductInstance.externalIDs))
    .flat();
  let existingSquareObjects: CatalogObject[] = [];
  if (existingSquareExternalIds.length > 0) {
    const batchRetrieveCatalogObjectsResponse = await deps.squareService.BatchRetrieveCatalogObjects(
      existingSquareExternalIds.map((x) => x.value),
      false,
    );
    if (!batchRetrieveCatalogObjectsResponse.success) {
      deps.logger.error(
        { err: batchRetrieveCatalogObjectsResponse.error },
        'Getting current square CatalogObjects failed',
      );
      return null;
    }
    existingSquareObjects = batchRetrieveCatalogObjectsResponse.result.objects ?? [];
  }

  const squareItemsToDelete = batchedUpdates.map((b) => b.squareIdsToDelete).flat();
  const mappings: CatalogIdMapping[] = [];
  const catalogObjects = batchedUpdates
    .map((b, i) => {
      if (b.newProductInstance.displayFlags.pos.hide) {
        return [] as CatalogObject[];
      }
      const { catalogObject, squareItemsToDelete: squareItemsToDeleteForThisProduct } =
        ProductInstanceToSquareCatalogHelper(
          deps.appConfig.isProduction,
          getLocationsConsidering3pFlag(deps, b.product.displayFlags.is3p),
          b.product,
          b.newProductInstance,
          b.product.printerGroup ? deps.printerGroups[b.product.printerGroup] : null,
          deps.catalogSelectors,
          existingSquareObjects,
          i.toString().padStart(3, '0'),
          deps.logger,
        );
      if (squareItemsToDeleteForThisProduct.length > 0) {
        squareItemsToDelete.push(...squareItemsToDeleteForThisProduct);
      }
      return [catalogObject];
    })
    .flat();
  if (catalogObjects.length > 0) {
    const upsertResponse = await deps.squareService.BatchUpsertCatalogObjects(
      chunk(catalogObjects, deps.appConfig.squareBatchChunkSize).map((x) => ({
        objects: x,
      })),
    );
    if (!upsertResponse.success) {
      deps.logger.error({ err: upsertResponse.error }, 'Failed to update square product');
      throw new Error('Failed to update square product');
    }
    mappings.push(...(upsertResponse.result.idMappings ?? []));
  }

  // now we're going to delete the square items that we need to delete
  if (squareItemsToDelete.length > 0) {
    const deleteResponse = await deps.squareService.BatchDeleteCatalogObjects(squareItemsToDelete);
    if (!deleteResponse.success) {
      deps.logger.error({ err: deleteResponse.error, squareItemsToDelete }, 'Failed to delete square items');
      throw new Error('Failed to delete square items');
    }
  }

  const updateBulkProps = batchedUpdates.map((b, i) => {
    const newExternalIdMappings = IdMappingsToExternalIds(mappings, i.toString().padStart(3, '0'));
    const newExternalIds = [
      ...(newExternalIdMappings.length
        ? GetNonSquareExternalIds(b.newProductInstance.externalIDs)
        : b.newProductInstance.externalIDs),
      ...newExternalIdMappings,
    ];
    return {
      id: b.piid,
      data: {
        ...b.newProductInstance,
        externalIDs: newExternalIds,
      },
    };
  });

  const updatedCount = await deps.productInstanceRepository.bulkUpdate(updateBulkProps);
  if (updatedCount !== batches.length) {
    deps.logger.warn({ updatedCount, batchesLength: batches.length }, 'Failed to update product instance(s)');
    return null;
  }

  if (!suppress_catalog_recomputation) {
    await deps.syncProductInstances();
    deps.recomputeCatalog();
  }
  return updateBulkProps.map((b) => ({ ...b.data, id: b.id })) as IProductInstance[];
};

export const updateProductInstance = async (
  deps: ProductDeps,
  props: UpsertProductInstanceProps,
  suppress_catalog_recomputation: boolean = false,
) => {
  const update = await batchUpdateProductInstance(deps, [props], suppress_catalog_recomputation);
  return update ? update[0] : null;
};

export const deleteProductInstance = async (
  deps: ProductDeps,
  pi_id: string,
  suppress_catalog_recomputation: boolean = false,
) => {
  const instance = deps.catalog.productInstances[pi_id] as IProductInstance | undefined;
  if (instance) {
    // Find the product that contains this instance
    const productId = Object.keys(deps.catalog.products).find((pid) =>
      deps.catalog.products[pid].instances.includes(pi_id),
    );
    if (!productId) {
      deps.logger.warn({ pi_id }, 'Could not find product for product instance');
      return null;
    }
    const product = deps.catalog.products[productId];
    // Cannot delete the base product instance (first in the instances array)
    if (product.instances[0] === pi_id) {
      deps.logger.warn({ productId }, 'Attempted to delete base product instance for product');
      return null;
    }

    deps.logger.debug({ pi_id }, 'Removing Product Instance');

    const existing = await deps.productInstanceRepository.findById(pi_id);
    if (!existing) {
      return null;
    }

    const deleted = await deps.productInstanceRepository.delete(pi_id);
    if (!deleted) {
      return null;
    }

    await deps.batchDeleteCatalogObjectsFromExternalIds(existing.externalIDs);

    if (!suppress_catalog_recomputation) {
      await deps.syncProductInstances();
      deps.recomputeCatalog();
    }
    return existing;
  }
  return null;
};
