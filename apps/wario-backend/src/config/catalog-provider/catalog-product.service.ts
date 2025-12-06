import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectModel } from '@nestjs/mongoose';
import { chunk } from 'es-toolkit/compat';
import { Model } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogIdMapping, CatalogObject } from 'square';

import {
  CreateProductBatchRequest,
  IProduct,
  IProductInstance,
  KeyValue,
  UncommittedIProduct,
  UncommittedIProductInstance,
  UpdateIProductRequest,
  UpdateIProductUpdateIProductInstance,
  UpdateProductBatchRequest,
  UpsertProductBatchRequest,
} from '@wcp/wario-shared';

import { IsSetOfUniqueStrings } from '../../utils/utils';
import { AppConfigService } from '../app-config.service';
import { DataProviderService } from '../data-provider/data-provider.service';
import {
  GetNonSquareExternalIds,
  GetSquareExternalIds,
  IdMappingsToExternalIds,
  ProductInstanceToSquareCatalogObject,
  ProductInstanceUpdateMergeExternalIds,
  ValidateModifiersForInstance,
} from '../square-wario-bridge';
import { SquareService } from '../square/square.service';

import { CatalogProviderService } from './catalog-provider.service';
import { CatalogSquareSyncService } from './catalog-square-sync.service';
import {
  isUpdateProduct,
  isUpdateProductInstance,
  LocationsConsidering3pFlag,
  UpdateProductInstanceProps,
} from './catalog.types';

const ValidateProductModifiersFunctionsCategoriesPrinterGroups = function (
  modifiers: { mtid: string; enable: string | null }[],
  category_ids: string[],
  printer_group_ids: string[],
  catalogProvider: CatalogProviderService,
) {
  const found_all_modifiers = modifiers
    .map(
      (entry) =>
        catalogProvider.ModifierTypes.some((x) => x.id === entry.mtid) &&
        (entry.enable === null || Object.hasOwn(catalogProvider.ProductInstanceFunctions, entry.enable)),
    )
    .every((x) => x);
  const found_all_categories = category_ids
    .map((cid) => Object.hasOwn(catalogProvider.Categories, cid))
    .every((x) => x);
  const found_all_printer_groups = printer_group_ids
    .map((pgid) => Object.hasOwn(catalogProvider.PrinterGroups, pgid))
    .every((x) => x);
  return found_all_categories && found_all_modifiers && found_all_printer_groups;
};

@Injectable()
export class CatalogProductService {
  constructor(
    private readonly appConfig: AppConfigService,
    @InjectModel('WProduct') private wProductModel: Model<IProduct>,
    @InjectModel('WProductInstance') private wProductInstanceModel: Model<IProductInstance>,
    @Inject(forwardRef(() => CatalogProviderService))
    private catalogProvider: CatalogProviderService,
    private dataProviderService: DataProviderService,
    @Inject(forwardRef(() => SquareService))
    private squareService: SquareService,
    @Inject(forwardRef(() => CatalogSquareSyncService))
    private catalogSquareSyncService: CatalogSquareSyncService,
    @InjectPinoLogger(CatalogProductService.name)
    private readonly logger: PinoLogger,
  ) { }

  private getLocationsConsidering3pFlag = (is3p: boolean) =>
    LocationsConsidering3pFlag(
      is3p,
      this.dataProviderService.KeyValueConfig.SQUARE_LOCATION_ALTERNATE,
      this.dataProviderService.KeyValueConfig.SQUARE_LOCATION,
      this.dataProviderService.KeyValueConfig.SQUARE_LOCATION_3P,
    );

  CreateProduct = async (
    product: Omit<IProduct, 'id' | 'baseProductId'>,
    instances: Omit<IProductInstance, 'id' | 'productId'>[],
  ) => {
    const result = await this.BatchUpsertProduct([{ product: product, instances }]);
    return result ? result[0] : null;
  };

  BatchUpsertProduct = async (
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
        this.catalogProvider,
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
        const insertInstances = b.instances.filter(
          (b) => !isUpdateProductInstance(b),
        ) as UncommittedIProductInstance[];
        return (
          acc ||
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          this.catalogProvider.Catalog.products[b.product.id] === undefined || // check product being updated exists
          updateIProductInstances.reduce(
            (instanceParentAcc, ins) =>
              instanceParentAcc ||
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              this.catalogProvider.Catalog.productInstances[ins.id] === undefined || // IProductInstance being updated must exist
              this.catalogProvider.Catalog.productInstances[ins.id].productId !== b.product.id,
            false,
          ) || // IProductInstance being updated must belong to its parent IProduct
          !IsSetOfUniqueStrings(updateIProductInstances.map((x) => x.id)) || // IProductInstance being updated must only appear once in the instances array
          updateIProductInstances.reduce(
            (instanceAcc, ins) =>
              !ValidateModifiersForInstance(
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                b.product.modifiers ?? this.catalogProvider.Catalog.products[b.product.id].product.modifiers ?? [],
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                this.catalogProvider.Catalog.productInstances[ins.id].modifiers ?? ins.modifiers ?? [],
              ),
            false,
          ) || // for product update check product update instances have valid modifier spec
          insertInstances.reduce(
            (instanceAcc, ins) =>
              instanceAcc ||
              !ValidateModifiersForInstance(
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                b.product.modifiers ?? this.catalogProvider.Catalog.products[b.product.id].product.modifiers ?? [],
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
      const oldProductEntry = this.catalogProvider.Catalog.products[b.product.id];
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

      const insertInstances = b.instances.filter(
        (b) => !isUpdateProductInstance(b),
      ) as UncommittedIProductInstance[];
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
              this.getLocationsConsidering3pFlag(mergedProduct.displayFlags.is3p),
              mergedProduct,
              pi,
              mergedProduct.printerGroup ? this.catalogProvider.PrinterGroups[mergedProduct.printerGroup] : null,
              this.catalogProvider.CatalogSelectors,
              [],
              // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
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
        .map((piId) => this.catalogProvider.Catalog.productInstances[piId])
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
            !this.catalogProvider.Catalog.productInstances[pi.id].displayFlags.pos.hide && pi.displayFlags?.pos.hide
              ?
              GetSquareExternalIds(
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                pi.externalIDs ?? this.catalogProvider.Catalog.productInstances[pi.id].externalIDs,
              )
              : [],
          )
          .flat(),
      );
      const adjustedUpdatedInstances: IProductInstance[] = [
        ...implicitUpdateInstances,
        ...explicitUpdateInstances.map((pi) => {
          const oldInstance = this.catalogProvider.Catalog.productInstances[pi.id];
          // these need to be deleted from square since they were previously not hidden from POS and now they are
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          const needToDeleteSquareCatalogItem = !oldInstance.displayFlags.pos.hide && pi.displayFlags?.pos.hide;
          const mergedExternalIds = ProductInstanceUpdateMergeExternalIds(
            this.catalogProvider.Catalog.productInstances[pi.id].externalIDs,
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
      const batchRetrieveCatalogObjectsResponse = await this.squareService.BatchRetrieveCatalogObjects(
        existingSquareExternalIds.map((x) => x.value),
        false,
      );
      if (!batchRetrieveCatalogObjectsResponse.success) {
        this.logger.error(
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
                this.getLocationsConsidering3pFlag(b.product.displayFlags.is3p),
                b.product,
                pi,
                b.product.printerGroup ? this.catalogProvider.PrinterGroups[b.product.printerGroup] : null,
                this.catalogProvider.CatalogSelectors,
                existingSquareObjects,
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                ('0000000' + (b.batchIter * 1000 + j)).slice(-7),
              ),
            ];
        });
        const insertCatalogObjects = b.insertInstances.flatMap((pi, k) => {
          return pi.displayFlags.pos.hide
            ? []
            : [
              ProductInstanceToSquareCatalogObject(
                this.getLocationsConsidering3pFlag(b.product.displayFlags.is3p),
                b.product,
                pi,
                b.product.printerGroup ? this.catalogProvider.PrinterGroups[b.product.printerGroup] : null,
                this.catalogProvider.CatalogSelectors,
                [],
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
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
              this.getLocationsConsidering3pFlag(adjustedProduct.displayFlags.is3p),
              adjustedProduct,
              pi,
              adjustedProduct.printerGroup
                ? this.catalogProvider.PrinterGroups[adjustedProduct.printerGroup]
                : null,
              this.catalogProvider.CatalogSelectors,
              [],
              // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
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
      const upsertResponse = await this.squareService.BatchUpsertCatalogObjects(
        chunk(catalogObjectsForUpsert, this.appConfig.squareBatchChunkSize).map((x) => ({
          objects: x,
        })),
      );
      if (!upsertResponse.success) {
        this.logger.error({ err: upsertResponse.error }, 'Failed to save square products');
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
              // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
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
          return new this.wProductInstanceModel({
            ...pi,
            productId: b.product.id,
            externalIDs: [
              ...pi.externalIDs,
              ...IdMappingsToExternalIds(
                mappings,
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                ('0000000' + (b.batchIter * 1000 + b.updateInstances.length + j)).slice(-7),
              ),
            ],
          });
        }),
      };
    });
    const insertBatchInserts = adjustedInsertBatches.map((b) => {
      const productDoc = new this.wProductModel(b.product);
      const batchInstanceDocs = b.instances.map(
        (x, j) =>
          new this.wProductInstanceModel({
            ...x,
            productId: productDoc.id as string,
            externalIDs: [
              ...x.externalIDs,
              // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
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
      const bulkProductInsert = await this.wProductModel.insertMany(insertBatchInserts.map((o) => o.product));
      this.logger.debug({ count: bulkProductInsert.length }, 'Saved new WProductModels');
    }
    const productInstanceInserts = [...insertBatchInserts, ...updateBatchesInserts];
    if (productInstanceInserts.length) {
      const bulkProductInstanceInsert = await this.wProductInstanceModel.insertMany(
        [...insertBatchInserts, ...updateBatchesInserts].flatMap((x) => x.instances),
      );
      this.logger.debug(
        { count: bulkProductInstanceInsert.length },
        'Instances creation result',
      );
    }
    if (bulkUpdate.length) {
      const bulkProductUpdate = await this.wProductModel.bulkWrite(
        bulkUpdate.map((b) => ({
          updateOne: {
            filter: { id: b.product.id },
            update: b.product,
          },
        })),
      );
      this.logger.debug({ result: bulkProductUpdate }, 'Bulk update of WProductModel successful');
      const bulkProductInstanceUpdate = await this.wProductInstanceModel.bulkWrite(
        bulkUpdate.flatMap((b) =>
          b.instances.map((pi) => ({
            updateOne: {
              filter: { id: pi.id },
              update: pi,
            },
          })),
        ),
      );
      this.logger.debug(
        { result: bulkProductInstanceUpdate },
        'Bulk update of WProductInstanceModel successful',
      );
    }
    await Promise.all([this.catalogProvider.SyncProducts(), this.catalogProvider.SyncProductInstances()]);
    this.catalogProvider.RecomputeCatalogAndEmit();

    const reconstructedBatches: Record<
      number,
      { product: IProduct; instances: IProductInstance[]; index: number }
    > = {};
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

  UpdateProduct = async (pid: string, product: Partial<Omit<IProduct, 'id'>>) => {
    const result = await this.BatchUpsertProduct([
      { product: { id: pid, ...product } as UpdateIProductRequest, instances: [] },
    ]);
    return result ? result[0].product : null;
  };

  BatchDeleteProduct = async (p_ids: string[], suppress_catalog_recomputation: boolean = false) => {
    this.logger.debug({ p_ids }, 'Removing Product(s)');
    const productEntries = p_ids.map((x) => this.catalogProvider.Catalog.products[x]);

    // needs to be ._id, NOT .id
    const doc = await this.wProductModel.deleteMany({ _id: { $in: p_ids } }).exec();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!doc) {
      return null;
    }
    // removing ALL product instances from Square
    await this.catalogSquareSyncService.BatchDeleteCatalogObjectsFromExternalIds(
      productEntries
        .reduce<string[]>((acc, pe) => [...acc, ...pe.instances], [])
        .reduce<KeyValue[]>(
          (acc, pi) => [...acc, ...this.catalogProvider.Catalog.productInstances[pi].externalIDs],
          [],
        ),
    );

    const product_instance_delete = await this.wProductInstanceModel
      .deleteMany({ productId: { $in: p_ids } })
      .exec();
    if (product_instance_delete.deletedCount > 0) {
      this.logger.debug(`Removed ${product_instance_delete.deletedCount.toString()} Product Instances.`);
      await this.catalogProvider.SyncProductInstances();
    }
    await this.catalogProvider.SyncProducts();
    if (!suppress_catalog_recomputation) {
      this.catalogProvider.RecomputeCatalogAndEmit();
    }
    return { deletedCount: doc.deletedCount, acknowledged: doc.acknowledged };
  };

  DeleteProduct = async (p_id: string) => {
    this.logger.debug({ p_id }, 'Removing Product');
    const productEntry = this.catalogProvider.Catalog.products[p_id];

    const doc = await this.wProductModel.findByIdAndDelete(p_id).exec();
    if (!doc) {
      return null;
    }
    // removing ALL product instances from Square
    await this.catalogSquareSyncService.BatchDeleteCatalogObjectsFromExternalIds(
      productEntry.instances.reduce<KeyValue[]>(
        (acc, pi) => [...acc, ...this.catalogProvider.Catalog.productInstances[pi].externalIDs],
        [],
      ),
    );

    const product_instance_delete = await this.wProductInstanceModel.deleteMany({ productId: p_id }).exec();
    if (product_instance_delete.deletedCount > 0) {
      this.logger.debug(`Removed ${product_instance_delete.deletedCount.toString()} Product Instances.`);
      await this.catalogProvider.SyncProductInstances();
    }
    await this.catalogProvider.SyncProducts();
    this.catalogProvider.RecomputeCatalogAndEmit();
    return doc.toObject();
  };

  CreateProductInstance = async (instance: Omit<IProductInstance, 'id'>) => {
    // we need to filter these external IDs because it'll interfere with adding the new product to the catalog
    const filteredExternalIds = GetNonSquareExternalIds(instance.externalIDs);
    let adjustedInstance: Omit<IProductInstance, 'id'> = {
      ...instance,
      externalIDs: filteredExternalIds,
    };

    if (!instance.displayFlags.pos.hide) {
      // add the product instance to the square catalog here
      const product = this.catalogProvider.Catalog.products[adjustedInstance.productId].product;
      const upsertResponse = await this.squareService.UpsertCatalogObject(
        ProductInstanceToSquareCatalogObject(
          this.getLocationsConsidering3pFlag(product.displayFlags.is3p),
          product,
          adjustedInstance,
          product.printerGroup ? this.catalogProvider.PrinterGroups[product.printerGroup] : null,
          this.catalogProvider.CatalogSelectors,
          [],
          '',
          this.logger,
        ),
      );
      if (!upsertResponse.success) {
        this.logger.error({ err: upsertResponse.error }, 'failed to add square product');
        return null;
      }
      adjustedInstance = {
        ...adjustedInstance,
        externalIDs: [
          ...adjustedInstance.externalIDs,
          ...IdMappingsToExternalIds(upsertResponse.result.idMappings, ''),
        ],
      };
    }
    const doc = new this.wProductInstanceModel(adjustedInstance);
    await doc.save();
    await this.catalogProvider.SyncProductInstances();
    this.catalogProvider.RecomputeCatalogAndEmit();
    return doc.toObject();
  };

  BatchUpdateProductInstance = async (
    batches: UpdateProductInstanceProps[],
    suppress_catalog_recomputation: boolean = false,
  ): Promise<(IProductInstance | null)[]> => {
    this.logger.debug(
      {
        batches: batches.map((x) => ({ piid: x.piid, changes: x.productInstance })),
        suppress_catalog_recomputation,
      },
      'Updating product instance(s)',
    );

    // TODO: if switching from hideFromPos === false to hideFromPos === true, we need to delete the product in square
    const oldProductInstances = batches.map((b) => this.catalogProvider.Catalog.productInstances[b.piid]);
    const newExternalIdses = batches.map((b, i) =>
      ProductInstanceUpdateMergeExternalIds(
        oldProductInstances[i].externalIDs,
        GetNonSquareExternalIds(b.productInstance.externalIDs),
      ),
    );
    const existingSquareExternalIds = newExternalIdses.map((ids) => GetSquareExternalIds(ids)).flat();
    let existingSquareObjects: CatalogObject[] = [];
    if (existingSquareExternalIds.length > 0) {
      const batchRetrieveCatalogObjectsResponse = await this.squareService.BatchRetrieveCatalogObjects(
        existingSquareExternalIds.map((x) => x.value),
        false,
      );
      if (!batchRetrieveCatalogObjectsResponse.success) {
        this.logger.error(
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
              this.getLocationsConsidering3pFlag(b.product.displayFlags.is3p),
              b.product,
              mergedInstance,
              b.product.printerGroup ? this.catalogProvider.PrinterGroups[b.product.printerGroup] : null,
              this.catalogProvider.CatalogSelectors,
              existingSquareObjects,
              // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
              ('000' + i).slice(-3),
            ),
          ];
      })
      .flat();
    if (catalogObjects.length > 0) {
      const upsertResponse = await this.squareService.BatchUpsertCatalogObjects(
        chunk(catalogObjects, this.appConfig.squareBatchChunkSize).map((x) => ({
          objects: x,
        })),
      );
      if (!upsertResponse.success) {
        this.logger.error({ err: upsertResponse.error }, 'Failed to update square product');
        return batches.map((_) => null);
      }
      mappings.push(...(upsertResponse.result.idMappings ?? []));
    }

    const updated = await Promise.all(
      batches.map(async (b, i) => {
        const doc = await this.wProductInstanceModel
          .findByIdAndUpdate(
            b.piid,
            {
              ...b.productInstance,
              // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
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
      await this.catalogProvider.SyncProductInstances();
      this.catalogProvider.RecomputeCatalogAndEmit();
    }
    return updated;
  };

  UpdateProductInstance = async (
    props: UpdateProductInstanceProps,
    suppress_catalog_recomputation: boolean = false,
  ) => {
    return (await this.BatchUpdateProductInstance([props], suppress_catalog_recomputation))[0];
  };

  DeleteProductInstance = async (pi_id: string, suppress_catalog_recomputation: boolean = false) => {
    const instance = this.catalogProvider.Catalog.productInstances[pi_id];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (instance) {
      const productEntry = this.catalogProvider.Catalog.products[instance.productId];
      if (productEntry.product.baseProductId === pi_id) {
        this.logger.warn({ productId: productEntry.product.id }, 'Attempted to delete base product instance for product');
        return null;
      }

      this.logger.debug({ pi_id }, 'Removing Product Instance');
      const doc = await this.wProductInstanceModel.findByIdAndDelete(pi_id).exec();
      if (!doc) {
        return null;
      }

      await this.catalogSquareSyncService.BatchDeleteCatalogObjectsFromExternalIds(doc.externalIDs);

      if (!suppress_catalog_recomputation) {
        await this.catalogProvider.SyncProductInstances();
        this.catalogProvider.RecomputeCatalogAndEmit();
      }
      return doc.toObject();
    }
    return null;
  };
}
