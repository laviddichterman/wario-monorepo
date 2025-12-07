/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { chunk } from 'es-toolkit/compat';
import type { Model } from 'mongoose';
import type { PinoLogger } from 'nestjs-pino';
import type { CatalogIdMapping, CatalogObject } from 'square';

import {
  type CreateProductBatchRequest,
  type ICatalog,
  type ICatalogSelectors,
  type ICategory,
  type IOptionType,
  type IProduct,
  type IProductInstance,
  type KeyValue,
  type PrinterGroup,
  type UncommittedIProduct,
  type UncommittedIProductInstance,
  type UpdateIProductRequest,
  type UpdateIProductUpdateIProductInstance,
  type UpdateProductBatchRequest,
  type UpsertProductBatchRequest,
} from '@wcp/wario-shared';

import { IsSetOfUniqueStrings } from '../../utils/utils';
import type { AppConfigService } from '../app-config.service';
import type { DataProviderService } from '../data-provider/data-provider.service';
import {
  GetNonSquareExternalIds,
  GetSquareExternalIds,
  IdMappingsToExternalIds,
  ProductInstanceToSquareCatalogObject,
  ProductInstanceUpdateMergeExternalIds,
  ValidateModifiersForInstance,
} from '../square-wario-bridge';
import type { SquareService } from '../square/square.service';

import {
  isUpdateProduct,
  isUpdateProductInstance,
  LocationsConsidering3pFlag,
  type UpdateProductInstanceProps,
} from './catalog.types';

export type { UpdateProductInstanceProps };

// ============================================================================
// Dependencies Interface
// ============================================================================

export interface ProductDeps {
  wProductModel: Model<IProduct>;
  wProductInstanceModel: Model<IProductInstance>;
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
    deps.dataProviderService.KeyValueConfig.SQUARE_LOCATION_ALTERNATE,
    deps.dataProviderService.KeyValueConfig.SQUARE_LOCATION,
    deps.dataProviderService.KeyValueConfig.SQUARE_LOCATION_3P,
  );

const ValidateProductModifiersFunctionsCategoriesPrinterGroups = function (
  modifiers: { mtid: string; enable: string | null }[],
  category_ids: string[],
  printer_group_ids: string[],
  deps: ProductDeps,
) {
  const found_all_modifiers = modifiers
    .map(
      (entry) =>
        deps.modifierTypes.some((x) => x.id === entry.mtid) &&
        (entry.enable === null || Object.hasOwn(deps.productInstanceFunctions, entry.enable)),
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
  batches: UpsertProductBatchRequest[],
): Promise<{ product: IProduct; instances: IProductInstance[] }[] | null> => {
  if (
    !ValidateProductModifiersFunctionsCategoriesPrinterGroups(
      batches.flatMap((x) => x.product.modifiers), // check invalid mods
      batches.flatMap((x) => x.product.category_ids), // check invalid categories
      batches.reduce(
        (pgids, x) => (x.product.printerGroup ? [...pgids, x.product.printerGroup] : pgids),
        [] satisfies string[],
      ), // check invalid printer groups
      deps,
    )
  ) {
    return null;
  }
  // split out the two classes of operations
  // keep track by using indexed batches
  const indexedBatches = batches.map((x, i) => ({ ...x, index: i }));
  const updateBatches = indexedBatches.filter((b) => isUpdateProduct(b)) as (UpdateProductBatchRequest & {
    index: number;
  })[];
  const insertBatches = indexedBatches.filter((b) => !isUpdateProduct(b)) as (CreateProductBatchRequest & {
    index: number;
  })[];
  if (
    !IsSetOfUniqueStrings(updateBatches.map((x) => x.product.id)) || //an IProduct to update can only appear once, otherwise an error is returned.
    updateBatches.reduce((acc, b) => {
      const updateIProductInstances = b.instances.filter((b) =>
        isUpdateProductInstance(b),
      ) as UpdateIProductUpdateIProductInstance[];
      const insertInstances = b.instances.filter((b) => !isUpdateProductInstance(b)) as UncommittedIProductInstance[];
      return (
        acc ||
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        deps.catalog.products[b.product.id] === undefined || // check product being updated exists
        updateIProductInstances.reduce(
          (instanceParentAcc, ins) =>
            instanceParentAcc ||
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            deps.catalog.productInstances[ins.id] === undefined || // IProductInstance being updated must exist
            deps.catalog.productInstances[ins.id].productId !== b.product.id,
          false,
        ) || // IProductInstance being updated must belong to its parent IProduct
        !IsSetOfUniqueStrings(updateIProductInstances.map((x) => x.id)) || // IProductInstance being updated must only appear once in the instances array
        updateIProductInstances.reduce(
          (instanceAcc, ins) =>
            !ValidateModifiersForInstance(
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              b.product.modifiers ?? deps.catalog.products[b.product.id].product.modifiers ?? [],
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              deps.catalog.productInstances[ins.id].modifiers ?? ins.modifiers ?? [],
            ),
          false,
        ) || // for product update check product update instances have valid modifier spec
        insertInstances.reduce(
          (instanceAcc, ins) =>
            instanceAcc ||
            !ValidateModifiersForInstance(
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              b.product.modifiers ?? deps.catalog.products[b.product.id].product.modifiers ?? [],
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              ins.modifiers ?? [],
            ),
          false,
        ) || // for product update check product insert instances have valid modifier spec
        insertBatches.reduce(
          (acc, b) =>
            acc ||
            b.instances.length === 0 || // check product add has at least one instance
            b.instances.reduce(
              (instanceAcc, ins) => instanceAcc || !ValidateModifiersForInstance(b.product.modifiers, ins.modifiers),
              false,
            ),
          false,
        )
      ); // for product add check product instances have valid modifier spec
    }, false)
  ) {
    return null;
  }
  // validation passed! on to the work

  const catalogObjectsForUpsert: CatalogObject[] = [];
  const existingSquareObjects: CatalogObject[] = [];
  const existingSquareExternalIds: KeyValue[] = [];
  // these need to be deleted from square since they were previously not hidden from POS and now they are
  const externalIdsToDelete: KeyValue[] = [];

  // gather IProducts needing update in our DB, IProductInstances needing update in our DB, and products needing upsert in the square catalog
  const adjustedUpdateBatches = updateBatches.map((b, i) => {
    const oldProductEntry = deps.catalog.products[b.product.id];
    let removedModifierTypes: string[] = [];
    let addedModifierTypes = false;
    const adjustedPrice =
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      b.product.price && b.product.price !== oldProductEntry.product.price ? b.product.price : null;
    const adjustedPrinterGroup = b.product.printerGroup !== oldProductEntry.product.printerGroup;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (b.product.modifiers) {
      const oldModifierTypes = oldProductEntry.product.modifiers.map((x) => x.mtid);
      const newModifierTypes = b.product.modifiers.map((x) => x.mtid);
      removedModifierTypes = oldModifierTypes.filter((x) => !newModifierTypes.includes(x));
      addedModifierTypes = newModifierTypes.filter((x) => !oldModifierTypes.includes(x)).length > 0;
    }
    const mergedProduct = { ...(oldProductEntry.product as IProduct), ...(b.product as UpdateIProductRequest) };

    const insertInstances = b.instances.filter((b) => !isUpdateProductInstance(b)) as UncommittedIProductInstance[];
    const adjustedInsertInstances: Omit<IProductInstance, 'id'>[] = insertInstances.map((x) => {
      // we need to filter these external IDs because it'll interfere with adding the new product to the catalog
      return {
        ...x,
        productId: b.product.id,
        externalIDs: GetNonSquareExternalIds(x.externalIDs),
      };
    });
    // add the insert instances
    catalogObjectsForUpsert.push(
      ...adjustedInsertInstances
        .filter((pi) => !pi.displayFlags.pos.hide)
        .map((pi, k) =>
          ProductInstanceToSquareCatalogObject(
            getLocationsConsidering3pFlag(deps, mergedProduct.displayFlags.is3p),
            mergedProduct,
            pi,
            mergedProduct.printerGroup ? deps.printerGroups[mergedProduct.printerGroup] : null,
            deps.catalogSelectors,
            [],

            ('0000000' + (i * 1000 + k)).slice(-7),
          ),
        ),
    );
    // aggregate explicit and implicit updates of product instances, and what square products might need deletion
    const explicitUpdateInstances = b.instances.filter((b) =>
      isUpdateProductInstance(b),
    ) as UpdateIProductUpdateIProductInstance[];
    const updateInstanceIds = explicitUpdateInstances.map((x) => x.id);
    const implicitUpdateInstances: IProductInstance[] = oldProductEntry.instances
      .filter((x) => !updateInstanceIds.includes(x))
      .map((piId) => deps.catalog.productInstances[piId])
      .filter(
        (pi) =>
          adjustedPrice !== null ||
          adjustedPrinterGroup ||
          addedModifierTypes ||
          pi.modifiers.filter((mod) => removedModifierTypes.includes(mod.modifierTypeId)).length > 0,
      )
      .map((pi) => ({
        ...(pi as IProductInstance),
        modifiers: pi.modifiers.filter((x) => !removedModifierTypes.includes(x.modifierTypeId)),
      }));
    externalIdsToDelete.push(
      ...explicitUpdateInstances
        .map((pi) =>
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          !deps.catalog.productInstances[pi.id].displayFlags.pos.hide && pi.displayFlags?.pos.hide
            ? GetSquareExternalIds(
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                pi.externalIDs ?? deps.catalog.productInstances[pi.id].externalIDs,
              )
            : [],
        )
        .flat(),
    );
    const adjustedUpdatedInstances: IProductInstance[] = [
      ...implicitUpdateInstances,
      ...explicitUpdateInstances.map((pi) => {
        const oldInstance = deps.catalog.productInstances[pi.id];
        // these need to be deleted from square since they were previously not hidden from POS and now they are
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const needToDeleteSquareCatalogItem = !oldInstance.displayFlags.pos.hide && pi.displayFlags?.pos.hide;
        const mergedExternalIds = ProductInstanceUpdateMergeExternalIds(
          deps.catalog.productInstances[pi.id].externalIDs,
          pi.externalIDs,
        );
        const newExternalIds = needToDeleteSquareCatalogItem
          ? GetNonSquareExternalIds(mergedExternalIds)
          : mergedExternalIds;
        if (needToDeleteSquareCatalogItem) {
          externalIdsToDelete.push(...GetSquareExternalIds(mergedExternalIds));
        }
        return { ...(oldInstance as IProductInstance), ...pi, externalIDs: newExternalIds };
      }),
    ];
    existingSquareExternalIds.push(
      ...adjustedUpdatedInstances.map((pi) => GetSquareExternalIds(pi.externalIDs)).flat(),
    );
    return {
      product: mergedProduct,
      updateInstances: adjustedUpdatedInstances,
      insertInstances: adjustedInsertInstances,
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

  // now that we have square catalog items we can add on the insert and update objects
  catalogObjectsForUpsert.push(
    ...adjustedUpdateBatches.flatMap((b) => {
      const updateCatalogObjects = b.updateInstances.flatMap((pi, j) => {
        return pi.displayFlags.pos.hide
          ? []
          : [
              ProductInstanceToSquareCatalogObject(
                getLocationsConsidering3pFlag(deps, b.product.displayFlags.is3p),
                b.product,
                pi,
                b.product.printerGroup ? deps.printerGroups[b.product.printerGroup] : null,
                deps.catalogSelectors,
                existingSquareObjects,

                ('0000000' + (b.batchIter * 1000 + j)).slice(-7),
              ),
            ];
      });
      const insertCatalogObjects = b.insertInstances.flatMap((pi, k) => {
        return pi.displayFlags.pos.hide
          ? []
          : [
              ProductInstanceToSquareCatalogObject(
                getLocationsConsidering3pFlag(deps, b.product.displayFlags.is3p),
                b.product,
                pi,
                b.product.printerGroup ? deps.printerGroups[b.product.printerGroup] : null,
                deps.catalogSelectors,
                [],

                ('0000000' + (b.batchIter * 1000 + b.updateInstances.length + k)).slice(-7),
              ),
            ];
      });
      return [...updateCatalogObjects, ...insertCatalogObjects];
    }),
  );

  const adjustedInsertBatches = insertBatches.map((b, i) => {
    // we're inserting a new product and instances. the first instance is the base product instance
    // we need to filter these square specific external IDs because it'll interfere with adding the new product to the catalog
    const adjustedProduct: Omit<IProduct, 'id' | 'baseProductId'> = {
      ...(b.product as UncommittedIProduct),
      externalIDs: GetNonSquareExternalIds(b.product.externalIDs),
    };
    const adjustedInstances: Omit<IProductInstance, 'id' | 'productId'>[] = b.instances.map((x) => ({
      ...(x as UncommittedIProductInstance),
      externalIDs: GetNonSquareExternalIds(x.externalIDs),
    }));
    // first add the stuff to square so we can write to the DB in two operations
    catalogObjectsForUpsert.push(
      ...adjustedInstances
        .filter((pi) => !pi.displayFlags.pos.hide)
        .map((pi, j) =>
          ProductInstanceToSquareCatalogObject(
            getLocationsConsidering3pFlag(deps, adjustedProduct.displayFlags.is3p),
            adjustedProduct,
            pi,
            adjustedProduct.printerGroup ? deps.printerGroups[adjustedProduct.printerGroup] : null,
            deps.catalogSelectors,
            [],

            ('0000000' + ((i + batchIter + 2) * 1000 + j)).slice(-7),
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

  const bulkUpdate = adjustedUpdateBatches.map((b) => {
    return {
      index: b.index,
      product: b.product,
      instances: b.updateInstances.map((pi, j) => {
        return {
          ...pi,
          productId: b.product.id,
          externalIDs: [
            ...pi.externalIDs,

            ...IdMappingsToExternalIds(mappings, ('0000000' + (b.batchIter * 1000 + j)).slice(-7)),
          ],
        };
      }),
    };
  }) as { product: IProduct; instances: IProductInstance[]; index: number }[];
  const updateBatchesInserts = adjustedUpdateBatches.map((b) => {
    return {
      index: b.index,
      instances: b.insertInstances.map((pi, j) => {
        return new deps.wProductInstanceModel({
          ...pi,
          productId: b.product.id,
          externalIDs: [
            ...pi.externalIDs,
            ...IdMappingsToExternalIds(
              mappings,

              ('0000000' + (b.batchIter * 1000 + b.updateInstances.length + j)).slice(-7),
            ),
          ],
        });
      }),
    };
  });
  const insertBatchInserts = adjustedInsertBatches.map((b) => {
    const productDoc = new deps.wProductModel(b.product);
    const batchInstanceDocs = b.instances.map(
      (x, j) =>
        new deps.wProductInstanceModel({
          ...x,
          productId: productDoc.id as string,
          externalIDs: [
            ...x.externalIDs,

            ...IdMappingsToExternalIds(mappings, ('0000000' + (b.batchIter * 1000 + j)).slice(-7)),
          ],
        }),
    );
    productDoc.baseProductId = batchInstanceDocs[0].id as string;
    return {
      product: productDoc,
      instances: batchInstanceDocs,
      index: b.index,
    };
  });
  if (insertBatchInserts.length) {
    const bulkProductInsert = await deps.wProductModel.insertMany(insertBatchInserts.map((o) => o.product));
    deps.logger.debug({ count: bulkProductInsert.length }, 'Saved new WProductModels');
  }
  const productInstanceInserts = [...insertBatchInserts, ...updateBatchesInserts];
  if (productInstanceInserts.length) {
    const bulkProductInstanceInsert = await deps.wProductInstanceModel.insertMany(
      [...insertBatchInserts, ...updateBatchesInserts].flatMap((x) => x.instances),
    );
    deps.logger.debug({ count: bulkProductInstanceInsert.length }, 'Instances creation result');
  }
  if (bulkUpdate.length) {
    const bulkProductUpdate = await deps.wProductModel.bulkWrite(
      bulkUpdate.map((b) => ({
        updateOne: {
          filter: { id: b.product.id },
          update: b.product,
        },
      })),
    );
    deps.logger.debug({ result: bulkProductUpdate }, 'Bulk update of WProductModel successful');
    const bulkProductInstanceUpdate = await deps.wProductInstanceModel.bulkWrite(
      bulkUpdate.flatMap((b) =>
        b.instances.map((pi) => ({
          updateOne: {
            filter: { id: pi.id },
            update: pi,
          },
        })),
      ),
    );
    deps.logger.debug({ result: bulkProductInstanceUpdate }, 'Bulk update of WProductInstanceModel successful');
  }
  await Promise.all([deps.syncProducts(), deps.syncProductInstances()]);
  deps.recomputeCatalog();

  const reconstructedBatches: Record<number, { product: IProduct; instances: IProductInstance[]; index: number }> = {};
  insertBatchInserts.forEach((b) => {
    const product = b.product.toObject();
    const instances = b.instances.map((x) => x.toObject());
    reconstructedBatches[b.index] = { product, instances, index: b.index };
  });
  bulkUpdate.forEach((b) => {
    reconstructedBatches[b.index] = {
      product: b.product,
      instances: b.instances,
      index: b.index,
    };
  });
  updateBatchesInserts.forEach((b) => {
    reconstructedBatches[b.index].instances = [
      ...b.instances.map((x) => x.toObject()),
      ...reconstructedBatches[b.index].instances,
    ];
  });
  return Object.values(reconstructedBatches)
    .sort((a, b) => a.index - b.index)
    .map((x) => ({
      product: x.product,
      instances: x.instances.sort((a, b) => a.ordinal - b.ordinal),
    }));
};

export const createProduct = async (
  deps: ProductDeps,
  product: Omit<IProduct, 'id' | 'baseProductId'>,
  instances: Omit<IProductInstance, 'id' | 'productId'>[],
) => {
  const result = await batchUpsertProduct(deps, [{ product: product, instances }]);
  return result ? result[0] : null;
};

export const updateProduct = async (deps: ProductDeps, pid: string, product: Partial<Omit<IProduct, 'id'>>) => {
  const result = await batchUpsertProduct(deps, [
    { product: { id: pid, ...product } as UpdateIProductRequest, instances: [] },
  ]);
  return result ? result[0].product : null;
};

export const batchDeleteProduct = async (
  deps: ProductDeps,
  p_ids: string[],
  suppress_catalog_recomputation: boolean = false,
) => {
  deps.logger.debug({ p_ids }, 'Removing Product(s)');
  const productEntries = p_ids.map((x) => deps.catalog.products[x]);

  // needs to be ._id, NOT .id
  const doc = await deps.wProductModel.deleteMany({ _id: { $in: p_ids } }).exec();
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!doc) {
    return null;
  }
  // removing ALL product instances from Square
  await deps.batchDeleteCatalogObjectsFromExternalIds(
    productEntries
      .reduce<string[]>((acc, pe) => [...acc, ...pe.instances], [])
      .reduce<KeyValue[]>((acc, pi) => [...acc, ...deps.catalog.productInstances[pi].externalIDs], []),
  );

  const product_instance_delete = await deps.wProductInstanceModel.deleteMany({ productId: { $in: p_ids } }).exec();
  if (product_instance_delete.deletedCount > 0) {
    deps.logger.debug(`Removed ${product_instance_delete.deletedCount.toString()} Product Instances.`);
    await deps.syncProductInstances();
  }
  await deps.syncProducts();
  if (!suppress_catalog_recomputation) {
    deps.recomputeCatalog();
  }
  return { deletedCount: doc.deletedCount, acknowledged: doc.acknowledged };
};

export const deleteProduct = async (deps: ProductDeps, p_id: string) => {
  deps.logger.debug({ p_id }, 'Removing Product');
  const productEntry = deps.catalog.products[p_id];

  const doc = await deps.wProductModel.findByIdAndDelete(p_id).exec();
  if (!doc) {
    return null;
  }
  // removing ALL product instances from Square
  await deps.batchDeleteCatalogObjectsFromExternalIds(
    productEntry.instances.reduce<KeyValue[]>(
      (acc, pi) => [...acc, ...deps.catalog.productInstances[pi].externalIDs],
      [],
    ),
  );

  const product_instance_delete = await deps.wProductInstanceModel.deleteMany({ productId: p_id }).exec();
  if (product_instance_delete.deletedCount > 0) {
    deps.logger.debug(`Removed ${product_instance_delete.deletedCount.toString()} Product Instances.`);
    await deps.syncProductInstances();
  }
  await deps.syncProducts();
  deps.recomputeCatalog();
  return doc.toObject();
};

export const createProductInstance = async (deps: ProductDeps, instance: Omit<IProductInstance, 'id'>) => {
  // we need to filter these external IDs because it'll interfere with adding the new product to the catalog
  const filteredExternalIds = GetNonSquareExternalIds(instance.externalIDs);
  let adjustedInstance: Omit<IProductInstance, 'id'> = {
    ...instance,
    externalIDs: filteredExternalIds,
  };

  if (!instance.displayFlags.pos.hide) {
    // add the product instance to the square catalog here
    const product = deps.catalog.products[adjustedInstance.productId].product;
    const upsertResponse = await deps.squareService.UpsertCatalogObject(
      ProductInstanceToSquareCatalogObject(
        getLocationsConsidering3pFlag(deps, product.displayFlags.is3p),
        product,
        adjustedInstance,
        product.printerGroup ? deps.printerGroups[product.printerGroup] : null,
        deps.catalogSelectors,
        [],
        '',
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
  const doc = new deps.wProductInstanceModel(adjustedInstance);
  await doc.save();
  await deps.syncProductInstances();
  deps.recomputeCatalog();
  return doc.toObject();
};

export const batchUpdateProductInstance = async (
  deps: ProductDeps,
  batches: UpdateProductInstanceProps[],
  suppress_catalog_recomputation: boolean = false,
): Promise<(IProductInstance | null)[]> => {
  deps.logger.debug(
    {
      batches: batches.map((x) => ({ piid: x.piid, changes: x.productInstance })),
      suppress_catalog_recomputation,
    },
    'Updating product instance(s)',
  );

  // TODO: if switching from hideFromPos === false to hideFromPos === true, we need to delete the product in square
  const oldProductInstances = batches.map((b) => deps.catalog.productInstances[b.piid]);
  const newExternalIdses = batches.map((b, i) =>
    ProductInstanceUpdateMergeExternalIds(
      oldProductInstances[i].externalIDs,
      GetNonSquareExternalIds(b.productInstance.externalIDs),
    ),
  );
  const existingSquareExternalIds = newExternalIdses.map((ids) => GetSquareExternalIds(ids)).flat();
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
      return batches.map((_) => null);
    }
    existingSquareObjects = batchRetrieveCatalogObjectsResponse.result.objects ?? [];
  }

  const mappings: CatalogIdMapping[] = [];
  const catalogObjects = batches
    .map((b, i) => {
      const mergedInstance = {
        ...(oldProductInstances[i] as IProductInstance),
        ...b.productInstance,
      };
      return mergedInstance.displayFlags.pos.hide
        ? []
        : [
            ProductInstanceToSquareCatalogObject(
              getLocationsConsidering3pFlag(deps, b.product.displayFlags.is3p),
              b.product,
              mergedInstance,
              b.product.printerGroup ? deps.printerGroups[b.product.printerGroup] : null,
              deps.catalogSelectors,
              existingSquareObjects,

              ('000' + i).slice(-3),
            ),
          ];
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
      return batches.map((_) => null);
    }
    mappings.push(...(upsertResponse.result.idMappings ?? []));
  }

  const updated = await Promise.all(
    batches.map(async (b, i) => {
      const doc = await deps.wProductInstanceModel
        .findByIdAndUpdate(
          b.piid,
          {
            ...b.productInstance,

            externalIDs: [...newExternalIdses[i], ...IdMappingsToExternalIds(mappings, ('000' + i).slice(-3))],
          },
          { new: true },
        )
        .exec();
      if (!doc) {
        return null;
      }
      return doc.toObject();
    }),
  );

  if (!suppress_catalog_recomputation) {
    await deps.syncProductInstances();
    deps.recomputeCatalog();
  }
  return updated;
};

export const updateProductInstance = async (
  deps: ProductDeps,
  props: UpdateProductInstanceProps,
  suppress_catalog_recomputation: boolean = false,
) => {
  return (await batchUpdateProductInstance(deps, [props], suppress_catalog_recomputation))[0];
};

export const deleteProductInstance = async (
  deps: ProductDeps,
  pi_id: string,
  suppress_catalog_recomputation: boolean = false,
) => {
  const instance = deps.catalog.productInstances[pi_id];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (instance) {
    const productEntry = deps.catalog.products[instance.productId];
    if (productEntry.product.baseProductId === pi_id) {
      deps.logger.warn({ productId: productEntry.product.id }, 'Attempted to delete base product instance for product');
      return null;
    }

    deps.logger.debug({ pi_id }, 'Removing Product Instance');
    const doc = await deps.wProductInstanceModel.findByIdAndDelete(pi_id).exec();
    if (!doc) {
      return null;
    }

    await deps.batchDeleteCatalogObjectsFromExternalIds(doc.externalIDs);

    if (!suppress_catalog_recomputation) {
      await deps.syncProductInstances();
      deps.recomputeCatalog();
    }
    return doc.toObject();
  }
  return null;
};
