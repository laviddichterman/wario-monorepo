import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import {
  CatalogGenerator,
  DeletePrinterGroupRequest,
  type ICatalog,
  ICatalogSelectorWrapper,
  type ICategory,
  type IOption,
  IOptionType,
  IProduct,
  IProductInstance,
  type IProductInstanceFunction,
  type KeyValue,
  type OrderInstanceFunction,
  type PrinterGroup,
  type RecordOrderInstanceFunctions,
  type RecordProductInstanceFunctions,
  ReduceArrayToMapByKey,
  SEMVER,
  UpsertProductBatchRequest,
} from '@wcp/wario-shared';

import { AppConfigService } from '../app-config.service';
import { DataProviderService } from '../data-provider/data-provider.service';
import { MigrationFlagsService } from '../migration-flags.service';
import { GenerateSquareReverseMapping, ICatalogContext } from '../square-wario-bridge';
import { SquareService } from '../square/square.service';

import * as CategoryFns from './catalog-category.functions';
import * as FunctionFns from './catalog-function.functions';
import * as ModifierFns from './catalog-modifier.functions';
import * as PrinterGroupFns from './catalog-printer-group.functions';
import * as ProductFns from './catalog-product.functions';
import * as SquareSyncFns from './catalog-square-sync.functions';

@Injectable()
export class CatalogProviderService implements OnModuleInit, ICatalogContext {
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

  constructor(
    @InjectModel('DBVersionSchema') private dbVersionModel: Model<SEMVER>,
    @InjectModel('WCategorySchema') private wCategoryModel: Model<ICategory>,
    @InjectModel('WProductInstanceSchema')
    private wProductInstanceModel: Model<IProductInstance>,
    @InjectModel('WProductSchema') private wProductModel: Model<IProduct>,
    @InjectModel('WOptionSchema') private wOptionModel: Model<IOption>,
    @InjectModel('WOptionTypeSchema') private wOptionTypeModel: Model<IOptionType>,
    @InjectModel('WProductInstanceFunction')
    private wProductInstanceFunctionModel: Model<IProductInstanceFunction>,
    @InjectModel('WOrderInstanceFunction')
    private wOrderInstanceFunctionModel: Model<OrderInstanceFunction>,
    @InjectModel('WPrinterGroupSchema')
    private printerGroupModel: Model<PrinterGroup>,
    @Inject(AppConfigService) private appConfig: AppConfigService,
    @Inject(DataProviderService) private dataProviderService: DataProviderService,
    @Inject(MigrationFlagsService) private migrationFlags: MigrationFlagsService,
    @Inject(SquareService) private squareService: SquareService,
    @InjectPinoLogger(CatalogProviderService.name)
    private readonly _logger: PinoLogger,
  ) {
    this.apiver = { major: 0, minor: 0, patch: 0 };
    this.squareIdToWarioIdMapping = {};
  }

  public get logger(): PinoLogger {
    return this._logger;
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

  private get functionDeps(): FunctionFns.FunctionDeps {
    return {
      wProductInstanceFunctionModel: this.wProductInstanceFunctionModel,
      wOrderInstanceFunctionModel: this.wOrderInstanceFunctionModel,
      wOptionModel: this.wOptionModel,
      wProductModel: this.wProductModel,
      logger: this._logger,
    };
  }

  private get categoryDeps(): CategoryFns.CategoryDeps {
    return {
      wCategoryModel: this.wCategoryModel,
      wProductModel: this.wProductModel,
      logger: this._logger,
      fulfillments: this.dataProviderService.Fulfillments,
      categories: this.categories,
      catalog: this.catalog,
      batchDeleteProducts: async (pids, suppress) => this.BatchDeleteProduct(pids, suppress),
    };
  }

  private get squareSyncDeps(): SquareSyncFns.SquareSyncDeps {
    return {
      logger: this._logger,
      squareService: this.squareService,
      printerGroups: this.printerGroups,
      catalog: this.catalog,
      batchUpdatePrinterGroup: (b) => PrinterGroupFns.batchUpdatePrinterGroup(this.printerGroupDeps, b),
      batchUpdateModifierType: (b, s, u) => ModifierFns.batchUpdateModifierType(this.modifierDeps, b, s, u),
      batchUpdateModifierOption: (b) => ModifierFns.batchUpdateModifierOption(this.modifierDeps, b),
      batchUpdateProductInstance: (b, s) => ProductFns.batchUpdateProductInstance(this.productDeps, b, s),
      updateProductsWithConstraint: (q, u, f) => this.UpdateProductsWithConstraint(q, u, f),
      syncModifierTypes: () => this.SyncModifierTypes(),
      syncOptions: () => this.SyncOptions(),
      syncProductInstances: () => this.SyncProductInstances(),
      syncProducts: () => this.SyncProducts(),
      recomputeCatalog: () => {
        this.RecomputeCatalog();
      },
    };
  }

  BatchDeleteCatalogObjectsFromExternalIds = async (externalIds: KeyValue[]) => {
    return SquareSyncFns.batchDeleteCatalogObjectsFromExternalIds(this.squareSyncDeps, externalIds);
  };

  // ============================================================================
  // Category Orchestration Methods
  // ============================================================================

  CreateCategory = async (category: Omit<ICategory, 'id'>) => {
    const doc = await CategoryFns.createCategory(this.categoryDeps, category);
    await this.SyncCategories();
    this.RecomputeCatalog();
    return doc;
  };

  UpdateCategory = async (category_id: string, category: Partial<Omit<ICategory, 'id'>>) => {
    const doc = await CategoryFns.updateCategory(this.categoryDeps, category_id, category);
    if (!doc) return null;
    await this.SyncCategories();
    this.RecomputeCatalog();
    return doc;
  };

  DeleteCategory = async (category_id: string, delete_contained_products: boolean) => {
    const result = await CategoryFns.deleteCategory(this.categoryDeps, category_id, delete_contained_products);
    if (!result.deleted) return null;

    if (result.productsModified) {
      await this.SyncProducts();
    }
    await this.SyncCategories();
    this.RecomputeCatalog();
    return result.deleted;
  };

  // ============================================================================
  // Printer Group Orchestration Methods
  // ============================================================================

  private get printerGroupDeps(): PrinterGroupFns.PrinterGroupDeps {
    return {
      wPrinterGroupModel: this.printerGroupModel,
      logger: this._logger,
      squareService: this.squareService,
      dataProviderService: this.dataProviderService,
      printerGroups: this.printerGroups,
      syncPrinterGroups: () => this.SyncPrinterGroups(),
      batchDeleteCatalogObjectsFromExternalIds: (ids) => this.BatchDeleteCatalogObjectsFromExternalIds(ids),
      updateProductsWithConstraint: (q, u, f) => this.UpdateProductsWithConstraint(q, u, f),
    };
  }

  CreatePrinterGroup = async (printerGroup: Omit<PrinterGroup, 'id'>) => {
    return PrinterGroupFns.createPrinterGroup(this.printerGroupDeps, printerGroup);
  };

  UpdatePrinterGroup = async (props: PrinterGroupFns.UpdatePrinterGroupProps) => {
    // We already moved UpdatePrinterGroupProps to catalog-printer-group.functions or catalog.types
    // Since catalog.types is imported locally in functions file, we can just assume type compatibility or re-import
    return PrinterGroupFns.updatePrinterGroup(this.printerGroupDeps, props);
  };

  DeletePrinterGroup = async (request: DeletePrinterGroupRequest & { id: string }) => {
    return PrinterGroupFns.deletePrinterGroup(this.printerGroupDeps, request);
  };

  BatchUpdatePrinterGroup = async (batches: PrinterGroupFns.UpdatePrinterGroupProps[]) => {
    // Exposed for possible external batch updates if needed, although mostly internal
    return PrinterGroupFns.batchUpdatePrinterGroup(this.printerGroupDeps, batches);
  };

  // ============================================================================
  // Modifier Orchestration Methods
  // ============================================================================

  private get modifierDeps(): ModifierFns.ModifierDeps {
    return {
      wOptionTypeModel: this.wOptionTypeModel,
      wOptionModel: this.wOptionModel,
      logger: this._logger,
      squareService: this.squareService,
      dataProviderService: this.dataProviderService,
      appConfig: this.appConfig,

      catalog: this.catalog,
      modifierTypes: this.modifier_types,
      modifierOptions: this.options,
      productInstanceFunctions: this.ProductInstanceFunctions,

      syncModifierTypes: () => this.SyncModifierTypes(),
      syncOptions: () => this.SyncOptions(),
      syncProductInstances: () => this.SyncProductInstances(),
      recomputeCatalog: () => {
        this.RecomputeCatalog();
      },
      batchDeleteCatalogObjectsFromExternalIds: (ids) => this.BatchDeleteCatalogObjectsFromExternalIds(ids),
      updateProductsReferencingModifierTypeId: (ids) => this.UpdateProductsReferencingModifierTypeId(ids),
      updateProductInstancesForOptionChanges: (ids) => this.UpdateProductInstancesForOptionChanges(ids),
      removeModifierTypeFromProducts: (id) => this.RemoveModifierTypeFromProducts(id),
      removeModifierOptionFromProductInstances: (mtId, moId) =>
        this.RemoveModifierOptionFromProductInstances(mtId, moId),
      deleteProductInstanceFunction: (id, suppress) => this.DeleteProductInstanceFunction(id, suppress), // Assuming this exists or using function
    };
  }

  CreateModifierType = async (modifierType: Omit<IOptionType, 'id'>, options: ModifierFns.UncommitedOption[]) => {
    return ModifierFns.createModifierType(this.modifierDeps, modifierType, options);
  };

  UpdateModifierType = async (props: ModifierFns.UpdateModifierTypeProps) => {
    return ModifierFns.updateModifierType(this.modifierDeps, props);
  };

  DeleteModifierType = async (mt_id: string) => {
    return ModifierFns.deleteModifierType(this.modifierDeps, mt_id);
  };

  CreateOption = async (modifierOption: Omit<IOption, 'id'>) => {
    return ModifierFns.createOption(this.modifierDeps, modifierOption);
  };

  UpdateModifierOption = async (props: ModifierFns.UpdateModifierOptionProps) => {
    return ModifierFns.updateModifierOption(this.modifierDeps, props);
  };

  DeleteModifierOption = async (mo_id: string, suppress_catalog_recomputation: boolean = false) => {
    return ModifierFns.deleteModifierOption(this.modifierDeps, mo_id, suppress_catalog_recomputation);
  };

  ValidateOption = (
    modifierType: Pick<IOptionType, 'max_selected'>,
    modifierOption: Partial<ModifierFns.UncommitedOption>,
  ) => {
    return ModifierFns.validateOption(modifierType, modifierOption);
  };

  // ============================================================================
  // Product Orchestration Methods
  // ============================================================================

  private get productDeps(): ProductFns.ProductDeps {
    return {
      wProductModel: this.wProductModel,
      wProductInstanceModel: this.wProductInstanceModel,
      logger: this._logger,
      squareService: this.squareService,
      dataProviderService: this.dataProviderService,
      appConfig: this.appConfig,

      catalog: this.catalog,
      catalogSelectors: this.CatalogSelectors,
      modifierTypes: this.modifier_types,
      categories: this.categories,
      printerGroups: this.printerGroups,
      productInstanceFunctions: this.ProductInstanceFunctions,

      syncProducts: () => this.SyncProducts(),
      syncProductInstances: () => this.SyncProductInstances(),
      recomputeCatalog: () => {
        this.RecomputeCatalog();
      },
      batchDeleteCatalogObjectsFromExternalIds: (ids) => this.BatchDeleteCatalogObjectsFromExternalIds(ids),
    };
  }

  CreateProduct = async (
    product: Omit<IProduct, 'id' | 'baseProductId'>,
    instances: Omit<IProductInstance, 'id' | 'productId'>[],
  ) => {
    return ProductFns.createProduct(this.productDeps, product, instances);
  };

  BatchUpsertProduct = async (batches: UpsertProductBatchRequest[]) => {
    return ProductFns.batchUpsertProduct(this.productDeps, batches);
  };

  UpdateProduct = async (pid: string, product: Partial<Omit<IProduct, 'id'>>) => {
    return ProductFns.updateProduct(this.productDeps, pid, product);
  };

  BatchDeleteProduct = async (p_ids: string[], suppress_catalog_recomputation: boolean = false) => {
    return ProductFns.batchDeleteProduct(this.productDeps, p_ids, suppress_catalog_recomputation);
  };

  DeleteProduct = async (p_id: string) => {
    return ProductFns.deleteProduct(this.productDeps, p_id);
  };

  CreateProductInstance = async (instance: Omit<IProductInstance, 'id'>) => {
    return ProductFns.createProductInstance(this.productDeps, instance);
  };

  BatchUpdateProductInstance = async (
    batches: ProductFns.UpdateProductInstanceProps[],
    suppress_catalog_recomputation: boolean = false,
  ) => {
    return ProductFns.batchUpdateProductInstance(this.productDeps, batches, suppress_catalog_recomputation);
  };

  UpdateProductInstance = async (
    props: ProductFns.UpdateProductInstanceProps,
    suppress_catalog_recomputation: boolean = false,
  ) => {
    return ProductFns.updateProductInstance(this.productDeps, props, suppress_catalog_recomputation);
  };

  DeleteProductInstance = async (pi_id: string, suppress_catalog_recomputation: boolean = false) => {
    return ProductFns.deleteProductInstance(this.productDeps, pi_id, suppress_catalog_recomputation);
  };

  // ============================================================================
  // Function Orchestration Methods
  // ============================================================================

  CreateProductInstanceFunction = async (pif: Omit<IProductInstanceFunction, 'id'>) => {
    const doc = await FunctionFns.createProductInstanceFunction(this.functionDeps, pif);
    await this.SyncProductInstanceFunctions();
    this.RecomputeCatalog();
    return doc;
  };

  UpdateProductInstanceFunction = async (pif_id: string, updates: Partial<Omit<IProductInstanceFunction, 'id'>>) => {
    const doc = await FunctionFns.updateProductInstanceFunction(this.functionDeps, pif_id, updates);
    if (!doc) return null;
    await this.SyncProductInstanceFunctions();
    this.RecomputeCatalog();
    return doc;
  };

  DeleteProductInstanceFunction = async (pif_id: string, suppressRecompute = false) => {
    const { deleted, optionsModified, productsModified } = await FunctionFns.deleteProductInstanceFunction(
      this.functionDeps,
      pif_id,
    );

    if (!deleted) return null;

    if (optionsModified > 0) await this.SyncOptions();
    if (productsModified > 0) await this.SyncProducts();
    await this.SyncProductInstanceFunctions();

    if (!suppressRecompute) this.RecomputeCatalog();
    return deleted;
  };

  CreateOrderInstanceFunction = async (oif: Omit<OrderInstanceFunction, 'id'>) => {
    const doc = await FunctionFns.createOrderInstanceFunction(this.functionDeps, oif);
    await this.SyncOrderInstanceFunctions();
    this.RecomputeCatalog();
    return doc;
  };

  UpdateOrderInstanceFunction = async (id: string, updates: Partial<Omit<OrderInstanceFunction, 'id'>>) => {
    const doc = await FunctionFns.updateOrderInstanceFunction(this.functionDeps, id, updates);
    if (!doc) return null;
    await this.SyncOrderInstanceFunctions();
    this.RecomputeCatalog();
    return doc;
  };

  DeleteOrderInstanceFunction = async (id: string, suppressRecompute = false) => {
    const doc = await FunctionFns.deleteOrderInstanceFunction(this.functionDeps, id);
    if (!doc) return null;
    await this.SyncOrderInstanceFunctions();
    if (!suppressRecompute) this.RecomputeCatalog();
    return doc;
  };

  SyncCategories = async () => {
    this.logger.debug(`Syncing Categories.`);
    try {
      this.categories = ReduceArrayToMapByKey(
        (await this.wCategoryModel.find().exec()).map((x) => x.toObject()),
        'id',
      );
    } catch (err: unknown) {
      this._logger.error({ err }, 'Failed fetching categories');
      return false;
    }
    return true;
  };

  SyncPrinterGroups = async () => {
    this.logger.debug(`Syncing Printer Groups.`);
    try {
      const results = await this.printerGroupModel.find().exec();
      this.printerGroups = ReduceArrayToMapByKey(
        results.map((x) => x.toObject()),
        'id',
      );
    } catch (err: unknown) {
      this._logger.error({ err }, 'Failed fetching printer groups');
      return false;
    }
    return true;
  };

  SyncModifierTypes = async () => {
    this.logger.debug(`Syncing Modifier Types.`);
    try {
      this.modifier_types = (await this.wOptionTypeModel.find().exec()).map((x) => x.toObject());
    } catch (err: unknown) {
      this._logger.error({ err }, 'Failed fetching option types');
      return false;
    }
    return true;
  };

  SyncOptions = async () => {
    this.logger.debug(`Syncing Modifier Options.`);
    try {
      this.options = (await this.wOptionModel.find().exec()).map((x) => x.toObject());
    } catch (err: unknown) {
      this._logger.error({ err }, 'SyncModifierOptions failed');
      return false;
    }
    return true;
  };

  SyncProducts = async () => {
    this.logger.debug(`Syncing Products.`);
    try {
      this.products = (await this.wProductModel.find().exec()).map((x) => x.toObject());
    } catch (err: unknown) {
      this._logger.error({ err }, 'Failed fetching products');
      return false;
    }
    return true;
  };

  SyncProductInstances = async () => {
    this.logger.debug(`Syncing Product Instances.`);
    try {
      this.product_instances = (await this.wProductInstanceModel.find().exec()).map((x) => x.toObject());
    } catch (err: unknown) {
      this._logger.error({ err }, 'SyncProductInstances failed');
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
    } catch (err: unknown) {
      this._logger.error({ err }, 'Failed fetching product instance functions');
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
    } catch (err: unknown) {
      this._logger.error({ err }, 'Failed fetching order instance functions');
      return false;
    }
    return true;
  };

  RecomputeCatalog = () => {
    this.logger.warn('Recomputing catalog');
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
    this.logger.warn({ api: this.catalog.api, products: this.catalog.products.length }, 'Recomputed catalog');
    this.squareIdToWarioIdMapping = GenerateSquareReverseMapping(this.catalog);
  };

  async onModuleInit() {
    this.logger.info(`Starting Bootstrap of CatalogProvider, Loading catalog from database...`);

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

    const shouldSuppressSquareSync = this.appConfig.suppressSquareInitSync || !this.squareService.isInitialized;
    if (shouldSuppressSquareSync) {
      if (!this.squareService.isInitialized) {
        this.logger.warn(
          'Square service not yet initialized, skipping Square Catalog Sync. Will sync on next catalog update.',
        );
      } else {
        this.logger.warn('Suppressing Square Catalog Sync at launch. Catalog skew may result.');
      }
    } else {
      await SquareSyncFns.checkAllPrinterGroupsSquareIdsAndFixIfNeeded(this.squareSyncDeps);
      const modifierTypeIdsUpdated = await SquareSyncFns.checkAllModifierTypesHaveSquareIdsAndFixIfNeeded(
        this.squareSyncDeps,
      );
      this.RecomputeCatalog();
      await SquareSyncFns.checkAllProductsHaveSquareIdsAndFixIfNeeded(this.squareSyncDeps);
      if (modifierTypeIdsUpdated.length > 0) {
        this.logger.info(
          `Going back and updating product instances impacted by earlier CheckAllModifierTypesHaveSquareIdsAndFixIfNeeded call, for ${modifierTypeIdsUpdated.length.toString()} modifier types`,
        );
        await this.UpdateProductsReferencingModifierTypeId(modifierTypeIdsUpdated);
      }
    }

    if (this.migrationFlags.requireSquareRebuild && this.squareService.isInitialized) {
      this._logger.info('Forcing Square catalog rebuild on load');
      await SquareSyncFns.forceSquareCatalogCompleteUpsert(this.squareSyncDeps);
    } else if (this.migrationFlags.requireSquareRebuild) {
      this._logger.warn('Square catalog rebuild requested but Square is not initialized, skipping.');
    }

    this.logger.info(
      {
        catalog: this.Catalog.api,
        productCount: this.products.length,
        modifierTypeCount: this.modifier_types.length,
        categoryCount: Object.keys(this.categories).length,
      },
      'Finished Bootstrap of CatalogProvider',
    );
  }

  UpdateProductsReferencingModifierTypeId = async (mtids: string[]) => {
    // find all products that have this modifier type enabled
    const products = Object.values(this.products).filter((p) => p.modifiers.some((m) => mtids.includes(m.mtid)));
    if (products.length > 0) {
      // update them
      await this.BatchUpsertProduct(products.map((p) => ({ product: p, instances: [] })));
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
      // would be good to handle the partial update more gracefully
      await this.BatchUpsertProduct(batches);
    }
    if (!suppress_catalog_recomputation) {
      this.RecomputeCatalog();
    }
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
      await this.BatchUpdateProductInstance(batchProductInstanceUpdates, true);
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
      this.logger.debug(
        `Removed ${product_instance_options_delete.modifiedCount.toString()} Options from Product Instances.`,
      );
      // TODO: run query for any modifiers.options.length === 0
      await this.SyncProductInstances();
    }
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
      this.logger.debug(
        `Removed serviceDisable fulfillment ID from ${category_update.modifiedCount.toString()} categories.`,
      );
      await this.SyncCategories();
    }
    if (products_update.modifiedCount > 0 || category_update.modifiedCount > 0) {
      this.RecomputeCatalog();
    }
  };
}
