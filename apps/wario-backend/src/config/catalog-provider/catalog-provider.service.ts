import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import {
  CatalogGenerator,
  CreateIOptionTypeRequestBody,
  CreateIProductRequest,
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
  UncommittedICategory,
  UpdateIOptionProps,
  UpdateIOptionTypeProps,
  UpdateIProductRequest,
  type UpsertIProductRequest,
} from '@wcp/wario-shared';

import { UpsertProductInstanceProps } from 'src/config/catalog-provider/catalog.types';

import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from '../../repositories/interfaces/category.repository.interface';
import {
  DB_VERSION_REPOSITORY,
  type IDBVersionRepository,
} from '../../repositories/interfaces/db-version.repository.interface';
import {
  type IOptionTypeRepository,
  OPTION_TYPE_REPOSITORY,
} from '../../repositories/interfaces/option-type.repository.interface';
import { type IOptionRepository, OPTION_REPOSITORY } from '../../repositories/interfaces/option.repository.interface';
import {
  type IOrderInstanceFunctionRepository,
  ORDER_INSTANCE_FUNCTION_REPOSITORY,
} from '../../repositories/interfaces/order-instance-function.repository.interface';
import {
  type IPrinterGroupRepository,
  PRINTER_GROUP_REPOSITORY,
} from '../../repositories/interfaces/printer-group.repository.interface';
import {
  type IProductInstanceFunctionRepository,
  PRODUCT_INSTANCE_FUNCTION_REPOSITORY,
} from '../../repositories/interfaces/product-instance-function.repository.interface';
import {
  type IProductInstanceRepository,
  PRODUCT_INSTANCE_REPOSITORY,
} from '../../repositories/interfaces/product-instance.repository.interface';
import {
  type IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../repositories/interfaces/product.repository.interface';
import { AppConfigService } from '../app-config.service';
import { DataProviderService } from '../data-provider/data-provider.service';
import { DatabaseManagerService } from '../database-manager/database-manager.service';
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
    @Inject(DB_VERSION_REPOSITORY)
    private dbVersionRepository: IDBVersionRepository,
    @Inject(OPTION_REPOSITORY)
    private optionRepository: IOptionRepository,
    @Inject(OPTION_TYPE_REPOSITORY)
    private optionTypeRepository: IOptionTypeRepository,
    @Inject(PRODUCT_REPOSITORY)
    private productRepository: IProductRepository,
    @Inject(PRODUCT_INSTANCE_REPOSITORY)
    private productInstanceRepository: IProductInstanceRepository,
    @Inject(PRODUCT_INSTANCE_FUNCTION_REPOSITORY)
    private productInstanceFunctionRepository: IProductInstanceFunctionRepository,
    @Inject(ORDER_INSTANCE_FUNCTION_REPOSITORY)
    private orderInstanceFunctionRepository: IOrderInstanceFunctionRepository,
    @Inject(PRINTER_GROUP_REPOSITORY)
    private printerGroupRepository: IPrinterGroupRepository,
    @Inject(CATEGORY_REPOSITORY)
    private categoryRepository: ICategoryRepository,
    @Inject(AppConfigService) private appConfig: AppConfigService,
    @Inject(DataProviderService) private dataProviderService: DataProviderService,
    @Inject(MigrationFlagsService) private migrationFlags: MigrationFlagsService,
    @Inject(SquareService) private squareService: SquareService,
    // NEEDED to enforce database migrations before loading catalog data
    @Inject(DatabaseManagerService)
    private databaseManager: DatabaseManagerService,
    @InjectPinoLogger(CatalogProviderService.name)
    private readonly _logger: PinoLogger,
  ) {
    // Initialize all fields to prevent undefined getter access issues
    this.categories = {};
    this.printerGroups = {};
    this.modifier_types = [];
    this.options = [];
    this.products = [];
    this.product_instances = [];
    this.product_instance_functions = {};
    this.orderInstanceFunctions = {};
    this.catalog = {} as ICatalog;
    this.squareIdToWarioIdMapping = {};
    this.apiver = { major: 0, minor: 0, patch: 0 };
  }

  public getLogger(): PinoLogger {
    return this._logger;
  }

  public getPrinterGroups() {
    return this.printerGroups;
  }

  public getCategories() {
    return this.categories;
  }

  public getModifierTypes() {
    return this.modifier_types;
  }

  public getModifierOptions() {
    return this.options;
  }

  public getProducts() {
    return this.products;
  }

  public getProductInstances() {
    return this.product_instances;
  }

  public getProductInstanceFunctions() {
    return this.product_instance_functions;
  }

  public getOrderInstanceFunctions() {
    return this.orderInstanceFunctions;
  }

  public getCatalog() {
    return this.catalog;
  }

  public getReverseMappings(): Readonly<Record<string, string>> {
    return this.squareIdToWarioIdMapping;
  }

  public getCatalogSelectors() {
    return ICatalogSelectorWrapper(this.catalog);
  }

  private get functionDeps(): FunctionFns.FunctionDeps {
    return {
      productInstanceFunctionRepository: this.productInstanceFunctionRepository,
      orderInstanceFunctionRepository: this.orderInstanceFunctionRepository,
      optionRepository: this.optionRepository,
      productRepository: this.productRepository,
      logger: this._logger,
    };
  }

  private get categoryDeps(): CategoryFns.CategoryDeps {
    return {
      categoryRepository: this.categoryRepository,
      productRepository: this.productRepository,
      logger: this._logger,
      fulfillments: this.dataProviderService.getFulfillments(),
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
      batchUpsertProduct: (b) => ProductFns.batchUpsertProduct(this.productDeps, b),
      findAllProducts: () => this.productRepository.findAll(),
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

  CreateCategory = async (category: UncommittedICategory) => {
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
      printerGroupRepository: this.printerGroupRepository,
      logger: this._logger,
      squareService: this.squareService,
      dataProviderService: this.dataProviderService,
      printerGroups: this.printerGroups,
      syncPrinterGroups: () => this.SyncPrinterGroups(),
      batchDeleteCatalogObjectsFromExternalIds: (ids) => this.BatchDeleteCatalogObjectsFromExternalIds(ids),
      reassignPrinterGroupForAllProducts: (oldId, newId) =>
        this.productRepository.migratePrinterGroupForAllProducts(oldId, newId),
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
      optionTypeRepository: this.optionTypeRepository,
      optionRepository: this.optionRepository,
      logger: this._logger,
      squareService: this.squareService,
      dataProviderService: this.dataProviderService,
      appConfig: this.appConfig,

      catalog: this.catalog,
      modifierTypes: this.modifier_types,
      modifierOptions: this.options,
      productInstanceFunctions: this.getProductInstanceFunctions(),

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
      deleteProductInstanceFunction: (id, suppress) => this.DeleteProductInstanceFunction(id, suppress),
    };
  }

  CreateModifierType = async (body: CreateIOptionTypeRequestBody) => {
    return ModifierFns.createModifierType(this.modifierDeps, body);
  };

  UpdateModifierType = async (props: UpdateIOptionTypeProps) => {
    return ModifierFns.updateModifierType(this.modifierDeps, props);
  };

  DeleteModifierType = async (mt_id: string) => {
    return ModifierFns.deleteModifierType(this.modifierDeps, mt_id);
  };

  CreateOption = async (modifierTypeId: string, modifierOption: Omit<IOption, 'id'>) => {
    return ModifierFns.createOption(this.modifierDeps, modifierTypeId, modifierOption);
  };

  UpdateModifierOption = async (props: UpdateIOptionProps) => {
    return ModifierFns.updateModifierOption(this.modifierDeps, props);
  };

  DeleteModifierOption = async (
    modifierTypeId: string,
    mo_id: string,
    suppress_catalog_recomputation: boolean = false,
  ) => {
    return ModifierFns.deleteModifierOption(this.modifierDeps, modifierTypeId, mo_id, suppress_catalog_recomputation);
  };

  // ============================================================================
  // Product Orchestration Methods
  // ============================================================================

  private get productDeps(): ProductFns.ProductDeps {
    return {
      productRepository: this.productRepository,
      productInstanceRepository: this.productInstanceRepository,
      logger: this._logger,
      squareService: this.squareService,
      dataProviderService: this.dataProviderService,
      appConfig: this.appConfig,

      catalog: this.catalog,
      catalogSelectors: this.getCatalogSelectors(),
      modifierTypes: this.modifier_types,
      categories: this.categories,
      printerGroups: this.printerGroups,
      productInstanceFunctions: this.getProductInstanceFunctions(),

      syncProducts: () => this.SyncProducts(),
      syncProductInstances: () => this.SyncProductInstances(),
      recomputeCatalog: () => {
        this.RecomputeCatalog();
      },
      batchDeleteCatalogObjectsFromExternalIds: (ids) => this.BatchDeleteCatalogObjectsFromExternalIds(ids),
    };
  }

  CreateProduct = async (product: CreateIProductRequest) => {
    return ProductFns.createProduct(this.productDeps, product);
  };

  BatchUpsertProduct = async (batches: UpsertIProductRequest[]) => {
    return ProductFns.batchUpsertProduct(this.productDeps, batches);
  };

  UpdateProduct = async (pid: string, product: UpdateIProductRequest) => {
    return ProductFns.updateProduct(this.productDeps, pid, product);
  };

  BatchDeleteProduct = async (p_ids: string[], suppress_catalog_recomputation: boolean = false) => {
    return ProductFns.batchDeleteProduct(this.productDeps, p_ids, suppress_catalog_recomputation);
  };

  DeleteProduct = async (p_id: string) => {
    return ProductFns.deleteProduct(this.productDeps, p_id);
  };

  CreateProductInstance = async (productId: string, instance: Omit<IProductInstance, 'id'>) => {
    return ProductFns.createProductInstance(this.productDeps, productId, instance);
  };

  BatchUpdateProductInstance = async (
    batches: UpsertProductInstanceProps[],
    suppress_catalog_recomputation: boolean = false,
  ) => {
    return ProductFns.batchUpdateProductInstance(this.productDeps, batches, suppress_catalog_recomputation);
  };

  UpdateProductInstance = async (
    props: UpsertProductInstanceProps,
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
    const result = await FunctionFns.deleteProductInstanceFunction(this.functionDeps, pif_id);

    if (!result.deleted) return null;

    if (result.optionsModified) await this.SyncOptions();
    if (result.productsModified) await this.SyncProducts();
    await this.SyncProductInstanceFunctions();

    if (!suppressRecompute) this.RecomputeCatalog();
    return result;
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
    this._logger.debug(`Syncing Categories.`);
    try {
      this.categories = ReduceArrayToMapByKey(await this.categoryRepository.findAll(), 'id');
    } catch (err: unknown) {
      this._logger.error({ err }, 'Failed fetching categories');
      return false;
    }
    return true;
  };

  SyncPrinterGroups = async () => {
    this._logger.debug(`Syncing Printer Groups.`);
    try {
      const results = await this.printerGroupRepository.findAll();
      this.printerGroups = ReduceArrayToMapByKey(results, 'id');
    } catch (err: unknown) {
      this._logger.error({ err }, 'Failed fetching printer groups');
      return false;
    }
    return true;
  };

  SyncModifierTypes = async () => {
    this._logger.debug(`Syncing Modifier Types.`);
    try {
      this.modifier_types = await this.optionTypeRepository.findAll();
    } catch (err: unknown) {
      this._logger.error({ err }, 'Failed fetching option types');
      return false;
    }
    return true;
  };

  SyncOptions = async () => {
    this._logger.debug(`Syncing Modifier Options.`);
    try {
      this.options = await this.optionRepository.findAll();
    } catch (err: unknown) {
      this._logger.error({ err }, 'SyncModifierOptions failed');
      return false;
    }
    return true;
  };

  SyncProducts = async () => {
    this._logger.debug(`Syncing Products.`);
    try {
      this.products = await this.productRepository.findAll();
    } catch (err: unknown) {
      this._logger.error({ err }, 'Failed fetching products');
      return false;
    }
    return true;
  };

  SyncProductInstances = async () => {
    this._logger.debug(`Syncing Product Instances.`);
    try {
      this.product_instances = await this.productInstanceRepository.findAll();
    } catch (err: unknown) {
      this._logger.error({ err }, 'SyncProductInstances failed');
      return false;
    }
    return true;
  };

  SyncProductInstanceFunctions = async () => {
    this._logger.debug(`Syncing Product Instance Functions.`);
    try {
      this.product_instance_functions = ReduceArrayToMapByKey(
        await this.productInstanceFunctionRepository.findAll(),
        'id',
      );
    } catch (err: unknown) {
      this._logger.error({ err }, 'Failed fetching product instance functions');
      return false;
    }
    return true;
  };

  SyncOrderInstanceFunctions = async () => {
    this._logger.debug(`Syncing Order Instance Functions.`);
    try {
      this.orderInstanceFunctions = ReduceArrayToMapByKey(await this.orderInstanceFunctionRepository.findAll(), 'id');
    } catch (err: unknown) {
      this._logger.error({ err }, 'Failed fetching order instance functions');
      return false;
    }
    return true;
  };

  RecomputeCatalog = () => {
    this._logger.warn('Recomputing catalog');
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
    this._logger.warn(
      { api: this.catalog.api, productCount: Object.keys(this.catalog.products).length },
      'Recomputed catalog',
    );
    this.squareIdToWarioIdMapping = GenerateSquareReverseMapping(this.catalog);
  };

  async onModuleInit() {
    this._logger.info(`Starting Bootstrap of CatalogProvider, Loading catalog from database...`);

    const newVer = await this.dbVersionRepository.get();
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
        this._logger.warn(
          'Square service not yet initialized, skipping Square Catalog Sync. Will sync on next catalog update.',
        );
      } else {
        this._logger.warn('Suppressing Square Catalog Sync at launch. Catalog skew may result.');
      }
    } else {
      await SquareSyncFns.checkAllPrinterGroupsSquareIdsAndFixIfNeeded(this.squareSyncDeps);
      const modifierTypeIdsUpdated = await SquareSyncFns.checkAllModifierTypesHaveSquareIdsAndFixIfNeeded(
        this.squareSyncDeps,
      );
      this.RecomputeCatalog();
      await SquareSyncFns.checkAllProductsHaveSquareIdsAndFixIfNeeded(this.squareSyncDeps);
      if (modifierTypeIdsUpdated.length > 0) {
        this._logger.info(
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

    this._logger.info(
      {
        catalog: this.getCatalog().api,
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
      await this.BatchUpsertProduct(products.map((p) => ({ ...p, instances: p.instances.map((i) => ({ id: i })) })));
    }
  };

  RemoveModifierTypeFromProducts = async (mt_id: string) => {
    const products_update = await this.productRepository.removeModifierTypeFromAll(mt_id);
    if (products_update > 0) {
      const product_instance_update = await this.productInstanceRepository.removeModifierTypeSelectionsFromAll(mt_id);
      this._logger.debug(
        `Removed ModifierType ID from ${products_update.toString()} products, ${product_instance_update.toString()} product instances.`,
      );
      await this.SyncProducts();
      await this.SyncProductInstances();
    }
  };

  UpdateProductInstancesForOptionChanges = async (updatedOptions: string[]) => {
    // After we've updated the modifiers, we need to rebuild all products with the said modifier option(s) since the ordinal and price might have changed
    // TODO: verify we don't need to update products that could add that modifier too, like any product class with the modifier type enabled on it
    const product_instances_to_update = await this.productInstanceRepository.findAllWithModifierOptions(updatedOptions);
    const batchProductInstanceUpdates = product_instances_to_update
      .map((pi) => {
        // Find the product that contains this instance
        const productId = Object.keys(this.catalog.products).find((pid) =>
          this.catalog.products[pid].instances.includes(pi.id),
        );
        return {
          piid: pi.id,
          product: productId ? this.catalog.products[productId] : null,
          productInstance: {
            modifiers: pi.modifiers,
            id: pi.id,
          },
        };
      })
      .filter((update) => update.product !== null) as Array<{
        piid: string;
        product: IProduct;
        productInstance: { id: string; modifiers: IProductInstance['modifiers'] };
      }>;

    if (batchProductInstanceUpdates.length > 0) {
      this.RecomputeCatalog();
      await this.BatchUpdateProductInstance(batchProductInstanceUpdates, true);
      await this.SyncProductInstances();
    }
  };

  RemoveModifierOptionFromProductInstances = async (modifierTypeId: string, mo_id: string) => {
    const product_instance_options_delete = await this.productInstanceRepository.removeModifierOptionsFromAll(
      modifierTypeId,
      [mo_id],
    );
    if (product_instance_options_delete > 0) {
      this._logger.debug(`Removed ${product_instance_options_delete.toString()} Options from Product Instances.`);
      // TODO: run query for any modifiers.options.length === 0
      await this.SyncProductInstances();
    }
  };

  /**
   * Checks and removes fulfullment ID from ICategory.serviceDisable and IProduct.serviceDisable and IProduct.modifiers.serviceDisable
   * performed BEFORE a fulfillment is deleted from the DataProvider
   *  */
  BackfillRemoveFulfillment = async (id: string) => {
    this._logger.debug(`Removing fulfillment ID ${id} references, if any exist.`);
    const products_update = await this.productRepository.removeServiceDisableFromAll(id);
    if (products_update > 0) {
      this._logger.debug(
        `Removed serviceDisable fulfillment ID from ${products_update.toString()} products and modifiers.`,
      );
      await this.SyncProducts();
    }
    const category_update = await this.categoryRepository.removeServiceDisableFromAll(id);
    if (category_update > 0) {
      this._logger.debug(`Removed serviceDisable fulfillment ID from ${category_update.toString()} categories.`);
      await this.SyncCategories();
    }
    if (products_update > 0 || category_update > 0) {
      this.RecomputeCatalog();
    }
  };
}
