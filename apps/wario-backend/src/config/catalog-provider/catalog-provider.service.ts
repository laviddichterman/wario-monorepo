
import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import {
  CatalogGenerator,
  ICatalog,
  ICatalogSelectorWrapper,
  ICategory,
  IOption,
  IOptionType,
  IProduct,
  IProductInstance,
  IProductInstanceFunction,
  OrderInstanceFunction,
  PrinterGroup,
  RecordOrderInstanceFunctions,
  RecordProductInstanceFunctions,
  ReduceArrayToMapByKey,
  SEMVER,
} from '@wcp/wario-shared';

import { AppConfigService } from '../app-config.service';
import { MigrationFlagsService } from '../migration-flags.service';
import { SocketIoService } from '../socket-io/socket-io.service';
import {
  GenerateSquareReverseMapping,
  ICatalogContext,
} from '../square-wario-bridge';
import { SquareService } from '../square/square.service';

import { CatalogFunctionService } from './catalog-function.service';
import { CatalogModifierService } from './catalog-modifier.service';
import { CatalogPrinterGroupService } from './catalog-printer-group.service';
import { CatalogProductService } from './catalog-product.service';
import { CatalogSquareSyncService } from './catalog-square-sync.service';

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
    private appConfig: AppConfigService,
    private migrationFlags: MigrationFlagsService,
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
    @Inject(forwardRef(() => CatalogSquareSyncService))
    private catalogSquareSyncService: CatalogSquareSyncService,
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

  Bootstrap = async () => {
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
        this.logger.warn('Square service not yet initialized, skipping Square Catalog Sync. Will sync on next catalog update.');
      } else {
        this.logger.warn('Suppressing Square Catalog Sync at launch. Catalog skew may result.');
      }
    } else {
      await this.catalogSquareSyncService.CheckAllPrinterGroupsSquareIdsAndFixIfNeeded(this.printerGroups);
      const modifierTypeIdsUpdated = await this.catalogSquareSyncService.CheckAllModifierTypesHaveSquareIdsAndFixIfNeeded();
      this.RecomputeCatalog();
      await this.catalogSquareSyncService.CheckAllProductsHaveSquareIdsAndFixIfNeeded();
      if (modifierTypeIdsUpdated.length > 0) {
        this.logger.info(
          `Going back and updating product instances impacted by earlier CheckAllModifierTypesHaveSquareIdsAndFixIfNeeded call, for ${modifierTypeIdsUpdated.length.toString()} modifier types`,
        );
        await this.UpdateProductsReferencingModifierTypeId(modifierTypeIdsUpdated);
      }
    }

    if (this.migrationFlags.requireSquareRebuild && this.squareService.isInitialized) {
      this._logger.info('Forcing Square catalog rebuild on load');
      await this.catalogSquareSyncService.ForceSquareCatalogCompleteUpsert();
    } else if (this.migrationFlags.requireSquareRebuild) {
      this._logger.warn('Square catalog rebuild requested but Square is not initialized, skipping.');
    }

    this.logger.info(`Finished Bootstrap of CatalogProvider`);
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
