import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import {
  IOption,
  IProduct,
  IProductInstanceFunction,
  OrderInstanceFunction,
} from '@wcp/wario-shared';

import { CatalogProviderService } from './catalog-provider.service';

@Injectable()
export class CatalogFunctionService {
  constructor(
    @InjectModel('WProductInstanceFunction')
    private wProductInstanceFunctionModel: Model<IProductInstanceFunction>,
    @InjectModel('WOrderInstanceFunction')
    private wOrderInstanceFunctionModel: Model<OrderInstanceFunction>,
    @InjectModel('WOptionSchema') private wOptionModel: Model<IOption>,
    @InjectModel('WProductSchema') private wProductModel: Model<IProduct>,
    @Inject(forwardRef(() => CatalogProviderService))
    private catalogProvider: CatalogProviderService,
    @InjectPinoLogger(CatalogFunctionService.name)
    private readonly logger: PinoLogger,
  ) { }

  CreateProductInstanceFunction = async (productInstanceFunction: Omit<IProductInstanceFunction, 'id'>) => {
    const doc = new this.wProductInstanceFunctionModel(productInstanceFunction);
    await doc.save();
    await this.catalogProvider.SyncProductInstanceFunctions();
    this.catalogProvider.RecomputeCatalog();
    return doc.toObject();
  };

  UpdateProductInstanceFunction = async (
    pif_id: string,
    productInstanceFunction: Partial<Omit<IProductInstanceFunction, 'id'>>,
  ) => {
    const updated = await this.wProductInstanceFunctionModel
      .findByIdAndUpdate(pif_id, productInstanceFunction, { new: true })
      .exec();
    if (!updated) {
      return null;
    }
    await this.catalogProvider.SyncProductInstanceFunctions();
    this.catalogProvider.RecomputeCatalog();
    return updated.toObject();
  };

  DeleteProductInstanceFunction = async (pif_id: string, suppress_catalog_recomputation = false) => {
    this.logger.debug(`Removing Product Instance Function: ${pif_id}`);
    const doc = await this.wProductInstanceFunctionModel.findByIdAndDelete(pif_id).exec();
    if (!doc) {
      return null;
    }
    const options_update = await this.wOptionModel.updateMany({ enable: pif_id }, { $set: { enable: null } }).exec();
    if (options_update.modifiedCount > 0) {
      this.logger.debug(`Removed ${doc.id as string} from ${options_update.modifiedCount.toString()} Modifier Options.`);
      await this.catalogProvider.SyncOptions();
    }
    const products_update = await this.wProductModel
      .updateMany({ 'modifiers.enable': pif_id }, { $set: { 'modifiers.$.enable': null } })
      .exec();
    if (products_update.modifiedCount > 0) {
      this.logger.debug(`Removed ${doc.id as string} from ${products_update.modifiedCount.toString()} Products.`);
      await this.catalogProvider.SyncProducts();
    }

    await this.catalogProvider.SyncProductInstanceFunctions();
    if (!suppress_catalog_recomputation) {
      this.catalogProvider.RecomputeCatalog();
    }
    return doc.toObject();
  };

  CreateOrderInstanceFunction = async (orderInstanceFunction: Omit<OrderInstanceFunction, 'id'>) => {
    const doc = new this.wOrderInstanceFunctionModel(orderInstanceFunction);
    await doc.save();
    await this.catalogProvider.SyncOrderInstanceFunctions();
    this.catalogProvider.RecomputeCatalog();
    return doc.toObject();
  };

  UpdateOrderInstanceFunction = async (
    id: string,
    orderInstanceFunction: Partial<Omit<OrderInstanceFunction, 'id'>>,
  ) => {
    const updated = await this.wOrderInstanceFunctionModel.findByIdAndUpdate(id, orderInstanceFunction, { new: true });
    if (!updated) {
      return null;
    }
    await this.catalogProvider.SyncOrderInstanceFunctions();
    this.catalogProvider.RecomputeCatalog();
    return updated.toObject();
  };

  DeleteOrderInstanceFunction = async (id: string, suppress_catalog_recomputation = false) => {
    this.logger.debug(`Removing Order Instance Function: ${id}`);
    const doc = await this.wOrderInstanceFunctionModel.findByIdAndDelete(id);
    if (!doc) {
      return null;
    }
    await this.catalogProvider.SyncOrderInstanceFunctions();
    if (!suppress_catalog_recomputation) {
      this.catalogProvider.RecomputeCatalog();
    }
    return doc.toObject();
  };
}
