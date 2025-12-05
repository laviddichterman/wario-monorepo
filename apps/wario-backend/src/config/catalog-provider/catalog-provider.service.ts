
import { forwardRef, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { CatalogObject } from 'square';

import {
  AbstractExpressionModifierPlacementExpression,
  CatalogGenerator,
  FindHasAnyModifierExpressionsForMTID,
  FindModifierPlacementExpressionsForMTID,
  ICatalog,
  ICatalogSelectorWrapper,
  ICategory,
  IOption,
  IOptionType,
  IProduct,
  IProductInstance,
  IProductInstanceFunction,
  KeyValue,
  OrderInstanceFunction,
  PrinterGroup,
  RecordOrderInstanceFunctions,
  RecordProductInstanceFunctions,
  ReduceArrayToMapByKey,
  SEMVER,
} from '@wcp/wario-shared';

import { DataProviderService } from '../data-provider/data-provider.service';
import { SocketIoService } from '../socket-io/socket-io.service';
import {
  GenerateSquareReverseMapping,
  GetNonSquareExternalIds,
  GetSquareExternalIds,
  GetSquareIdIndexFromExternalIds,
  ICatalogContext,
} from '../square-wario-bridge';
import { SquareService } from '../square/square.service';

import { CatalogFunctionService } from './catalog-function.service';
import { CatalogModifierService } from './catalog-modifier.service';
import { CatalogPrinterGroupService } from './catalog-printer-group.service';
import { CatalogProductService } from './catalog-product.service';
import {
  UncommitedOption,
  UpdateModifierOptionProps,
  UpdateModifierTypeProps,
  UpdatePrinterGroupProps,
} from './catalog.types';


const SUPPRESS_SQUARE_SYNC =
  process.env.WARIO_SUPPRESS_SQUARE_INIT_SYNC === '1' || process.env.WARIO_SUPPRESS_SQUARE_INIT_SYNC === 'true';
const FORCE_SQUARE_CATALOG_REBUILD_ON_LOAD =
  process.env.WARIO_FORCE_SQUARE_CATALOG_REBUILD_ON_LOAD === '1' ||
  process.env.WARIO_SUPPRESS_SQUARE_INIT_SYNC === 'true';




@Injectable()
export class CatalogProviderService implements OnModuleInit, ICatalogContext {
  private readonly logger = new Logger(CatalogProviderService.name);
  private categories: Record<string, ICategory>;
  private printerGroups: Record<string, PrinterGroup>;
  private modifier_types: IOptionType[];
  private options: IOption[];
  private products: IProduct[];
  private product_instances: IProductInstance[];
  private product_instance_functions: RecordProductInstanceFunctions;
  private orderInstanceFunctions: RecordOrderInstanceFunctions;
  private catalog: ICatalog;
  private squareIdToWarioIdMapping: Record<string, string>;
  private apiver: SEMVER;
  private requireSquareRebuild: boolean;

  constructor(
    @InjectModel('DBVersion') private dbVersionModel: Model<SEMVER>,
    @InjectModel('WCategory') private wCategoryModel: Model<ICategory>,
    @InjectModel('WProductInstance')
    private wProductInstanceModel: Model<IProductInstance>,
    @InjectModel('WProduct') private wProductModel: Model<IProduct>,
    @InjectModel('WOption') private wOptionModel: Model<IOption>,
    @InjectModel('WOptionType') private wOptionTypeModel: Model<IOptionType>,
    @InjectModel('WProductInstanceFunction')
    private wProductInstanceFunctionModel: Model<IProductInstanceFunction>,
    @InjectModel('WOrderInstanceFunction')
    private wOrderInstanceFunctionModel: Model<OrderInstanceFunction>,
    @InjectModel('WPrinterGroup')
    private printerGroupModel: Model<PrinterGroup>,
    private dataProviderService: DataProviderService,
    @Inject(forwardRef(() => SquareService))
    private squareService: SquareService,
    @Inject(forwardRef(() => SocketIoService))
    private socketIoService: SocketIoService,
    @Inject(forwardRef(() => CatalogFunctionService))
    private functionService: CatalogFunctionService,
    @Inject(forwardRef(() => CatalogPrinterGroupService))
    private catalogPrinterGroupService: CatalogPrinterGroupService,
    @Inject(forwardRef(() => CatalogModifierService))
    private catalogModifierService: CatalogModifierService,
    @Inject(forwardRef(() => CatalogProductService))
    private catalogProductService: CatalogProductService,
  ) {
    this.apiver = { major: 0, minor: 0, patch: 0 };
    this.requireSquareRebuild = FORCE_SQUARE_CATALOG_REBUILD_ON_LOAD;
    this.squareIdToWarioIdMapping = {};
  }

  set RequireSquareRebuild(value: boolean) {
    this.requireSquareRebuild = value;
  }

  get PrinterGroups() {
    return this.printerGroups;
  }

  get Categories() {
    return this.categories;
  }

  get ModifierTypes() {
    return this.modifier_types;
  }

  get ModifierOptions() {
    return this.options;
  }

  get Products() {
    return this.products;
  }

  get ProductInstances() {
    return this.product_instances;
  }

  get ProductInstanceFunctions() {
    return this.product_instance_functions;
  }

  get OrderInstanceFunctions() {
    return this.orderInstanceFunctions;
  }

  get Catalog() {
    return this.catalog;
  }

  get ReverseMappings(): Readonly<Record<string, string>> {
    return this.squareIdToWarioIdMapping;
  }

  get CatalogSelectors() {
    return ICatalogSelectorWrapper(this.catalog);
  }

  async onModuleInit() {
    // Register with SocketIoService for initial state emission
    this.socketIoService.setCatalogProvider(this);
    await this.Bootstrap();
  }

  SyncCategories = async () => {
    this.logger.debug(`Syncing Categories.`);
    try {
      this.categories = ReduceArrayToMapByKey(
        (await this.wCategoryModel.find().exec()).map((x) => x.toObject()),
        'id',
      );
    } catch (err) {
      this.logger.error(`Failed fetching categories with error: ${JSON.stringify(err)}`);
      return false;
    }
    return true;
  };

  SyncPrinterGroups = async () => {
    this.logger.debug(`Syncing Printer Groups.`);
    try {
      this.printerGroups = ReduceArrayToMapByKey(
        (await this.printerGroupModel.find().exec()).map((x) => x.toObject()),
        'id',
      );
    } catch (err) {
      this.logger.error(`Failed fetching printer groups with error: ${JSON.stringify(err)}`);
      return false;
    }
    return true;
  };

  SyncModifierTypes = async () => {
    this.logger.debug(`Syncing Modifier Types.`);
    try {
      this.modifier_types = (await this.wOptionTypeModel.find().exec()).map((x) => x.toObject());
    } catch (err) {
      this.logger.error(`Failed fetching option types with error: ${JSON.stringify(err)}`);
      return false;
    }
    return true;
  };

  SyncOptions = async () => {
    this.logger.debug(`Syncing Modifier Options.`);
    try {
      this.options = (await this.wOptionModel.find().exec()).map((x) => x.toObject());
    } catch (err) {
      this.logger.error(`Failed fetching options with error: ${JSON.stringify(err)}`);
      return false;
    }
    return true;
  };

  SyncProducts = async () => {
    this.logger.debug(`Syncing Products.`);
    try {
      this.products = (await this.wProductModel.find().exec()).map((x) => x.toObject());
    } catch (err) {
      this.logger.error(`Failed fetching products with error: ${JSON.stringify(err)}`);
      return false;
    }
    return true;
  };

  SyncProductInstances = async () => {
    this.logger.debug(`Syncing Product Instances.`);
    try {
      this.product_instances = (await this.wProductInstanceModel.find().exec()).map((x) => x.toObject());
    } catch (err) {
      this.logger.error(`Failed fetching product instances with error: ${JSON.stringify(err)}`);
      return false;
    }
    return true;
  };

  SyncProductInstanceFunctions = async () => {
    this.logger.debug(`Syncing Product Instance Functions.`);
    try {
      this.product_instance_functions = ReduceArrayToMapByKey(
        (await this.wProductInstanceFunctionModel.find().exec()).map((x) => x.toObject()),
        'id',
      );
    } catch (err) {
      this.logger.error(`Failed fetching product instance functions with error: ${JSON.stringify(err)}`);
      return false;
    }
    return true;
  };

  SyncOrderInstanceFunctions = async () => {
    this.logger.debug(`Syncing Order Instance Functions.`);
    try {
      this.orderInstanceFunctions = ReduceArrayToMapByKey(
        (await this.wOrderInstanceFunctionModel.find().exec()).map((x) => x.toObject()),
        'id',
      );
    } catch (err) {
      this.logger.error(`Failed fetching order instance functions with error: ${JSON.stringify(err)}`);
      return false;
    }
    return true;
  };

  RecomputeCatalog = () => {
    this.logger.debug('Recomputing catalog');
    this.catalog = CatalogGenerator(
      Object.values(this.categories),
      this.modifier_types,
      this.options,
      this.products,
      this.product_instances,
      this.product_instance_functions,
      this.orderInstanceFunctions,
      this.apiver,
    );
    this.squareIdToWarioIdMapping = GenerateSquareReverseMapping(this.catalog);
  };

  RecomputeCatalogAndEmit = () => {
    this.RecomputeCatalog();
    this.socketIoService.EmitCatalog(this.catalog);
  };



  BatchDeleteCatalogObjectsFromExternalIds = async (externalIds: KeyValue[]) => {
    const squareKV = GetSquareExternalIds(externalIds);
    if (squareKV.length > 0) {
      this.logger.debug(`Removing from square... ${squareKV.map((x) => `${x.key}: ${x.value}`).join(', ')}`);
      return await this.squareService.BatchDeleteCatalogObjects(squareKV.map((x) => x.value));
    }
    return true;
  };

  private CheckAllPrinterGroupsSquareIdsAndFixIfNeeded = async () => {
    const squareCatalogObjectIds = Object.values(this.printerGroups)
      .map((printerGroup) => GetSquareExternalIds(printerGroup.externalIDs).map((x) => x.value))
      .flat();
    if (squareCatalogObjectIds.length > 0) {
      const catalogObjectResponse = await this.squareService.BatchRetrieveCatalogObjects(squareCatalogObjectIds, false);
      if (catalogObjectResponse.success) {
        const foundObjects = catalogObjectResponse.result.objects as CatalogObject[];
        const missingSquareCatalogObjectBatches: UpdatePrinterGroupProps[] = [];
        Object.values(this.printerGroups).forEach((x) => {
          const missingIDs = GetSquareExternalIds(x.externalIDs).filter(
            (kv) => foundObjects.findIndex((o) => o.id === kv.value) === -1,
          );
          if (missingIDs.length > 0) {
            missingSquareCatalogObjectBatches.push({
              id: x.id,
              printerGroup: {
                externalIDs: x.externalIDs.filter(
                  (kv) => missingIDs.findIndex((idKV) => idKV.value === kv.value) === -1,
                ),
              },
            });
          }
        });
        if (missingSquareCatalogObjectBatches.length > 0) {
          await this.catalogPrinterGroupService.BatchUpdatePrinterGroup(missingSquareCatalogObjectBatches);
        }
      }
    }
    const batches = Object.values(this.printerGroups)
      .filter(
        (pg) =>
          GetSquareIdIndexFromExternalIds(pg.externalIDs, 'CATEGORY') === -1 ||
          GetSquareIdIndexFromExternalIds(pg.externalIDs, 'ITEM') === -1 ||
          GetSquareIdIndexFromExternalIds(pg.externalIDs, 'ITEM_VARIATION') === -1,
      )
      .map((pg) => ({ id: pg.id, printerGroup: {} }));
    return batches.length > 0 ? await this.catalogPrinterGroupService.BatchUpdatePrinterGroup(batches) : null;
  };

  private CheckAllModifierTypesHaveSquareIdsAndFixIfNeeded = async () => {
    // const updatedModifierTypeIds: string[] = [];
    const squareCatalogObjectIds = Object.values(this.Catalog.modifiers)
      .map((modifierTypeEntry) => GetSquareExternalIds(modifierTypeEntry.modifierType.externalIDs).map((x) => x.value))
      .flat();
    if (squareCatalogObjectIds.length > 0) {
      const catalogObjectResponse = await this.squareService.BatchRetrieveCatalogObjects(squareCatalogObjectIds, false);
      if (catalogObjectResponse.success) {
        const foundObjects = catalogObjectResponse.result.objects as CatalogObject[];
        const missingSquareCatalogObjectBatches: UpdateModifierTypeProps[] = [];
        const optionUpdates: { id: string; externalIDs: KeyValue[] }[] = [];
        Object.values(this.Catalog.modifiers)
          .filter((x) =>
            GetSquareExternalIds(x.modifierType.externalIDs).reduce(
              (acc, kv) => acc || foundObjects.findIndex((o) => o.id === kv.value) === -1,
              false,
            ),
          )
          .forEach((x) => {
            missingSquareCatalogObjectBatches.push({
              id: x.modifierType.id,
              modifierType: {
                externalIDs: GetNonSquareExternalIds(x.modifierType.externalIDs),
              },
            });
            this.logger.log(`Pruning square catalog IDs from options: ${x.options.join(', ')}`);
            optionUpdates.push(
              ...x.options.map((oId) => ({
                id: oId,
                externalIDs: GetNonSquareExternalIds(this.Catalog.options[oId].externalIDs),
              })),
            );
          });
        if (missingSquareCatalogObjectBatches.length > 0) {
          await this.catalogModifierService.BatchUpdateModifierType(missingSquareCatalogObjectBatches, false, false);
        }
        if (optionUpdates.length > 0) {
          await this.catalogModifierService.BatchUpdateModifierOption(
            optionUpdates.map((x) => ({
              id: x.id,
              modifierTypeId: this.Catalog.options[x.id].modifierTypeId,
              modifierOption: { externalIDs: x.externalIDs },
            })),
          );
        }
      }
    }
    const batches = Object.values(this.Catalog.modifiers)
      .filter(
        (x) =>
          GetSquareIdIndexFromExternalIds(x.modifierType.externalIDs, 'MODIFIER_LIST') === -1 ||
          x.options.reduce(
            (acc, oId) =>
              acc || GetSquareIdIndexFromExternalIds(this.Catalog.options[oId].externalIDs, 'MODIFIER') === -1,
            false,
          ),
      )
      .map((x) => ({ id: x.modifierType.id, modifierType: {} }));

    if (batches.length > 0) {
      const result = await this.catalogModifierService.BatchUpdateModifierType(batches, false, false);
      return result.filter((x): x is IOptionType => x !== null).map((x) => x.id);
    }
    return [];
  };

  CheckAllProductsHaveSquareIdsAndFixIfNeeded = async () => {
    const squareCatalogObjectIds = Object.values(this.catalog.products)
      .map((p) =>
        p.instances
          .map((piid) => GetSquareExternalIds(this.catalog.productInstances[piid].externalIDs).map((x) => x.value))
          .flat(),
      )
      .flat();
    if (squareCatalogObjectIds.length > 0) {
      const catalogObjectResponse = await this.squareService.BatchRetrieveCatalogObjects(squareCatalogObjectIds, false);
      if (catalogObjectResponse.success) {
        const foundObjects = catalogObjectResponse.result.objects as CatalogObject[];
        const missingSquareCatalogObjectBatches = Object.values(this.catalog.products)
          .map((p) =>
            p.instances
              .filter((x) =>
                GetSquareExternalIds(this.catalog.productInstances[x].externalIDs).reduce(
                  (acc, kv) => acc || foundObjects.findIndex((o) => o.id === kv.value) === -1,
                  false,
                ),
              )
              .map((piid) => ({
                piid,
                product: {
                  modifiers: p.product.modifiers,
                  price: p.product.price,
                  printerGroup: p.product.printerGroup,
                  disabled: p.product.disabled,
                  displayFlags: p.product.displayFlags,
                },
                productInstance: {
                  externalIDs: GetNonSquareExternalIds(this.catalog.productInstances[piid].externalIDs),
                },
              })),
          )
          .flat();
        if (missingSquareCatalogObjectBatches.length > 0) {
          await this.catalogProductService.BatchUpdateProductInstance(missingSquareCatalogObjectBatches, true);
          await this.SyncProductInstances();
          this.RecomputeCatalog();
        }
      }
    }

    const batches = Object.values(this.catalog.products)
      .map((p) =>
        p.instances
          .filter((piid) => {
            const pi = this.catalog.productInstances[piid];
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            return pi && !pi.displayFlags.pos.hide && GetSquareIdIndexFromExternalIds(pi.externalIDs, 'ITEM') === -1;
          })
          .map((piid) => ({
            piid,
            product: {
              modifiers: p.product.modifiers,
              price: p.product.price,
              printerGroup: p.product.printerGroup,
              disabled: p.product.disabled,
              displayFlags: p.product.displayFlags,
            },
            productInstance: {},
          })),
      )
      .flat();
    if (batches.length > 0) {
      await this.catalogProductService.BatchUpdateProductInstance(batches, true);
      await this.SyncProductInstances();
      this.RecomputeCatalog();
    }
  };

  ForceSquareCatalogCompleteUpsert = async () => {
    const printerGroupUpdates = Object.values(this.printerGroups).map((pg) => ({
      id: pg.id,
      printerGroup: {},
    }));
    await this.catalogPrinterGroupService.BatchUpdatePrinterGroup(printerGroupUpdates);
    const modifierTypeUpdates = Object.values(this.Catalog.modifiers).map((x) => ({
      id: x.modifierType.id,
      modifierType: {},
    }));
    await this.catalogModifierService.BatchUpdateModifierType(modifierTypeUpdates, true, true);
    void this.SyncModifierTypes();
    void this.SyncOptions();
    void this.SyncProductInstances();
    void this.SyncProducts();
    this.RecomputeCatalog();

    await this.UpdateProductsWithConstraint({}, {}, true);
    void this.SyncModifierTypes();
    void this.SyncOptions();
    void this.SyncProductInstances();
    void this.SyncProducts();
    this.RecomputeCatalog();
  };

  Bootstrap = async () => {
    this.logger.log(`Starting Bootstrap of CatalogProvider, Loading catalog from database...`);

    const newVer = await this.dbVersionModel.findOne().exec();
    this.apiver = newVer as SEMVER;

    await Promise.all([
      this.SyncPrinterGroups(),
      this.SyncCategories(),
      this.SyncModifierTypes(),
      this.SyncOptions(),
      this.SyncProducts(),
      this.SyncProductInstances(),
      this.SyncProductInstanceFunctions(),
      this.SyncOrderInstanceFunctions(),
    ]);

    this.RecomputeCatalog();

    if (SUPPRESS_SQUARE_SYNC) {
      this.logger.warn('Suppressing Square Catalog Sync at launch. Catalog skew may result.');
    } else {
      await this.CheckAllPrinterGroupsSquareIdsAndFixIfNeeded();
      const modifierTypeIdsUpdated = await this.CheckAllModifierTypesHaveSquareIdsAndFixIfNeeded();
      this.RecomputeCatalog();
      await this.CheckAllProductsHaveSquareIdsAndFixIfNeeded();
      if (modifierTypeIdsUpdated.length > 0) {
        this.logger.log(
          `Going back and updating product instances impacted by earlier CheckAllModifierTypesHaveSquareIdsAndFixIfNeeded call, for ${modifierTypeIdsUpdated.length.toString()} modifier types`,
        );
        await this.UpdateProductsReferencingModifierTypeId(modifierTypeIdsUpdated);
      }
    }

    if (this.requireSquareRebuild) {
      this.logger.log('Forcing Square catalog rebuild on load');
      await this.ForceSquareCatalogCompleteUpsert();
    }

    this.logger.log(`Finished Bootstrap of CatalogProvider`);
  };









  CreateModifierType = async (modifierType: Omit<IOptionType, 'id'>, options: UncommitedOption[]) => {
    options.forEach(opt => {
      if (!this.ValidateOption(modifierType, opt)) {
        throw Error('Failed validation on modifier option in a single select modifier type');
      }
    })
    const doc = new this.wOptionTypeModel({ ...modifierType, externalIDs: GetNonSquareExternalIds(modifierType.externalIDs) });
    await doc.save();
    const modifierTypeId = doc.id as string;
    await this.SyncModifierTypes();
    if (options.length > 0) {
      // we need to filter these external IDs because it'll interfere with adding the new modifier to the catalog
      const adjustedOptions: Omit<IOption, 'id'>[] = options.map(opt => ({ ...opt, modifierTypeId, externalIDs: GetNonSquareExternalIds(opt.externalIDs) })).sort((a, b) => a.ordinal - b.ordinal);
      const optionDocuments = adjustedOptions.map(x => new this.wOptionModel(x));
      // add the new option to the db, sync and recompute the catalog, then use UpdateModifierType to clean up
      const _bulkWriteResult = await this.wOptionModel.bulkWrite(optionDocuments.map(o => ({
        insertOne: {
          document: o
        }
      })));
      await this.SyncOptions();
      this.RecomputeCatalog();
      await this.catalogModifierService.UpdateModifierType({ id: modifierTypeId, modifierType: {} });
    }
    this.RecomputeCatalogAndEmit();
    return doc.toObject();
  };

  UpdateProductsReferencingModifierTypeId = async (mtids: string[]) => {
    // find all products that have this modifier type enabled
    const products = Object.values(this.products).filter((p) => p.modifiers.some((m) => mtids.includes(m.mtid)));
    if (products.length > 0) {
      // update them
      await this.catalogProductService.BatchUpsertProduct(products.map((p) => ({ product: p, instances: [] })));
    }
  };

  public UpdateProductsWithConstraint = async (
    product_query: FilterQuery<IProduct>,
    update: Partial<IProduct>,
    suppress_catalog_recomputation: boolean,
  ) => {
    const products = await this.wProductModel.find(product_query).exec();
    if (products.length > 0) {
      const batches = products.map((p) => ({
        product: { ...p.toObject(), ...update },
        instances: [],
      }));
      await this.catalogProductService.BatchUpsertProduct(batches);
    }
    if (!suppress_catalog_recomputation) {
      this.RecomputeCatalogAndEmit();
    }
  };

  DeleteModifierType = async (mt_id: string) => {
    this.logger.debug(`Removing Modifier Type: ${mt_id}`);
    const doc = await this.wOptionTypeModel.findByIdAndDelete(mt_id).exec();
    if (!doc) {
      this.logger.warn('Unable to delete the ModifierType from the database.');
      return null;
    }
    const modifierTypeEntry = this.catalog.modifiers[mt_id];

    // if there are any square ids associated with this modifier type then we delete them first
    await this.BatchDeleteCatalogObjectsFromExternalIds(modifierTypeEntry.modifierType.externalIDs);

    await Promise.all(this.catalog.modifiers[mt_id].options.map((op) => this.DeleteModifierOption(op, true)));

    await this.RemoveModifierTypeFromProducts(mt_id);
    // need to delete any ProductInstanceFunctions that use this MT
    await Promise.all(
      Object.values(this.product_instance_functions).map(async (pif) => {
        if (FindModifierPlacementExpressionsForMTID(pif.expression, mt_id).length > 0) {
          this.logger.debug(`Found product instance function composed of ${mt_id}, removing PIF with ID: ${pif.id}.`);
          // the PIF and any dependent objects will be synced, but the catalog will not be recomputed / emitted
          await this.functionService.DeleteProductInstanceFunction(pif.id, true);
        } else if (FindHasAnyModifierExpressionsForMTID(pif.expression, mt_id).length > 0) {
          this.logger.debug(`Found product instance function composed of ${mt_id}, removing PIF with ID: ${pif.id}.`);
          // the PIF and any dependent objects will be synced, but the catalog will not be recomputed / emitted
          await this.functionService.DeleteProductInstanceFunction(pif.id, true);
        }
      }),
    );
    await this.SyncOptions();
    await this.SyncModifierTypes();
    this.RecomputeCatalogAndEmit();
    return doc.toObject();
  };

  ValidateOption = (modifierType: Pick<IOptionType, 'max_selected'>, modifierOption: Partial<UncommitedOption>) => {
    if (modifierType.max_selected === 1) {
      return !modifierOption.metadata || (!modifierOption.metadata.allowOTS && !modifierOption.metadata.can_split);
    }
    return true;
  };

  CreateOption = async (modifierOption: Omit<IOption, 'id'>) => {
    // first find the Modifier Type ID in the catalog
    if (!Object.hasOwn(this.Catalog.modifiers, modifierOption.modifierTypeId)) {
      return null;
    }

    const modifierTypeEntry = this.Catalog.modifiers[modifierOption.modifierTypeId];
    if (!this.ValidateOption(modifierTypeEntry.modifierType, modifierOption)) {
      throw Error('Failed validation on modifier option in a single select modifier type');
    }

    // we need to filter these external IDs because it'll interfere with adding the new modifier to the catalog
    const filteredExternalIds = GetNonSquareExternalIds(modifierOption.externalIDs);
    const adjustedOption: Omit<IOption, 'id'> = {
      ...modifierOption,
      externalIDs: filteredExternalIds,
    };

    // add the new option to the db, sync and recompute the catalog, then use UpdateModifierType to clean up
    const doc = new this.wOptionModel(adjustedOption);
    await doc.save();
    await this.SyncOptions();
    this.RecomputeCatalog();
    await this.catalogModifierService.UpdateModifierType({
      id: modifierOption.modifierTypeId,
      modifierType: {},
    });
    this.RecomputeCatalogAndEmit();
    // since we have new external IDs, we need to pull the modifier option from the catalog after the above syncing
    return this.Catalog.options[doc.id as string];
  };

  UpdateModifierOption = async (props: UpdateModifierOptionProps) => {
    return (await this.catalogModifierService.BatchUpdateModifierOption([props]))[0];
  };

  RemoveModifierTypeFromProducts = async (mt_id: string) => {
    const products_update = await this.wProductModel.updateMany({}, { $pull: { modifiers: { mtid: mt_id } } }).exec();
    if (products_update.modifiedCount > 0) {
      const product_instance_update = await this.wProductInstanceModel
        .updateMany({}, { $pull: { modifiers: { modifierTypeId: mt_id } } })
        .exec();
      this.logger.debug(
        `Removed ModifierType ID from ${products_update.modifiedCount.toString()} products, ${product_instance_update.modifiedCount.toString()} product instances.`,
      );
      await this.SyncProducts();
      await this.SyncProductInstances();
    }
  };

  UpdateProductInstancesForOptionChanges = async (updatedOptions: string[]) => {
    // After we've updated the modifiers, we need to rebuild all products with the said modifier option(s) since the ordinal and price might have changed
    // TODO: verify we don't need to update products that could add that modifier too, like any product class with the modifier type enabled on it
    const product_instances_to_update = await this.wProductInstanceModel
      .find({
        'modifiers.options': {
          $elemMatch: { optionId: { $in: updatedOptions } },
        },
      })
      .exec();
    product_instances_to_update.map((x) => x.id as string);
    const batchProductInstanceUpdates = product_instances_to_update.map((pi) => ({
      piid: pi.id as string,
      product: this.catalog.products[pi.productId].product,
      productInstance: {
        modifiers: pi.modifiers,
      },
    }));

    if (batchProductInstanceUpdates.length > 0) {
      this.RecomputeCatalog();
      await this.catalogProductService.BatchUpdateProductInstance(batchProductInstanceUpdates, true);
      await this.SyncProductInstances();
    }
  };

  RemoveModifierOptionFromProductInstances = async (modifierTypeId: string, mo_id: string) => {
    const product_instance_options_delete = await this.wProductInstanceModel
      .updateMany(
        { 'modifiers.modifierTypeId': modifierTypeId },
        { $pull: { 'modifiers.$.options': { optionId: mo_id } } },
      )
      .exec();
    if (product_instance_options_delete.modifiedCount > 0) {
      this.logger.debug(`Removed ${product_instance_options_delete.modifiedCount.toString()} Options from Product Instances.`);
      // TODO: run query for any modifiers.options.length === 0
      await this.SyncProductInstances();
    }
  };

  DeleteModifierOption = async (mo_id: string, suppress_catalog_recomputation: boolean = false) => {
    this.logger.debug(`Removing Modifier Option ${mo_id}`);
    const doc = await this.wOptionModel.findByIdAndDelete(mo_id).exec();
    if (!doc) {
      return null;
    }

    // NOTE: this removes the modifiers from the Square ITEMs and ITEM_VARIATIONs as well
    await this.BatchDeleteCatalogObjectsFromExternalIds(doc.externalIDs);

    await this.RemoveModifierOptionFromProductInstances(doc.modifierTypeId, mo_id);
    await this.SyncOptions();
    // need to delete any ProductInstanceFunctions that use this MO
    await Promise.all(
      Object.values(this.product_instance_functions).map(async (pif) => {
        const dependent_pfi_expressions = FindModifierPlacementExpressionsForMTID(
          pif.expression,
          doc.modifierTypeId,
        ) as AbstractExpressionModifierPlacementExpression[];
        const filtered = dependent_pfi_expressions.filter((x) => x.expr.moid === mo_id);
        if (filtered.length > 0) {
          this.logger.debug(
            `Found product instance function composed of ${doc.modifierTypeId}:${mo_id}, removing PIF with ID: ${pif.id}.`,
          );
          // the PIF and any dependent objects will be synced, but the catalog will not be recomputed / emitted
          await this.functionService.DeleteProductInstanceFunction(pif.id, true);
        }
      }),
    );
    if (!suppress_catalog_recomputation) {
      this.RecomputeCatalogAndEmit();
    }
    return doc.toObject();
  };































  /**
   * Checks and removes fulfullment ID from ICategory.serviceDisable and IProduct.serviceDisable and IProduct.modifiers.serviceDisable
   * performed BEFORE a fulfillment is deleted from the DataProvider
   *  */
  BackfillRemoveFulfillment = async (id: string) => {
    this.logger.debug(`Removing fulfillment ID ${id} references, if any exist.`);
    const products_update = await this.wProductModel
      .updateMany({}, { $pull: { serviceDisable: id, 'modifiers.$[].serviceDisable': id } })
      .exec();
    if (products_update.modifiedCount > 0) {
      this.logger.debug(
        `Removed serviceDisable fulfillment ID from ${products_update.modifiedCount.toString()} products and modifiers.`,
      );
      await this.SyncProducts();
    }
    const category_update = await this.wCategoryModel.updateMany({}, { $pull: { serviceDisable: id } }).exec();
    if (category_update.modifiedCount > 0) {
      this.logger.debug(`Removed serviceDisable fulfillment ID from ${category_update.modifiedCount.toString()} categories.`);
      await this.SyncCategories();
    }
    if (products_update.modifiedCount > 0 || category_update.modifiedCount > 0) {
      this.RecomputeCatalogAndEmit();
    }
  };
}
