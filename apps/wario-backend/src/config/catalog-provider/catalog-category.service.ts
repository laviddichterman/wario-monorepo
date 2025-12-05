import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ICategory, IProduct } from '@wcp/wario-shared';

import { DataProviderService } from '../data-provider/data-provider.service';

import { CatalogProductService } from './catalog-product.service';
import { CatalogProviderService } from './catalog-provider.service';

@Injectable()
export class CatalogCategoryService {
  private readonly logger = new Logger(CatalogCategoryService.name);

  constructor(
    @InjectModel('WCategory') private wCategoryModel: Model<ICategory>,
    @InjectModel('WProduct') private wProductModel: Model<IProduct>,
    @Inject(forwardRef(() => CatalogProviderService))
    private catalogProvider: CatalogProviderService,
    @Inject(forwardRef(() => CatalogProductService))
    private catalogProductService: CatalogProductService,
    private dataProviderService: DataProviderService,
  ) { }

  CreateCategory = async (category: Omit<ICategory, 'id'>) => {
    const doc = new this.wCategoryModel(category);
    await doc.save();
    await this.catalogProvider.SyncCategories();
    this.catalogProvider.RecomputeCatalogAndEmit();
    return doc.toObject();
  };

  // TODO: support Partial update
  UpdateCategory = async (category_id: string, category: Partial<Omit<ICategory, 'id'>>) => {
    if (!Object.hasOwn(this.catalogProvider.Categories, category_id)) {
      // not found
      return null;
    }
    let cycle_update_promise: Promise<unknown> | null = null;
    const currentCategory = this.catalogProvider.Categories[category_id];
    if (currentCategory.parent_id !== category.parent_id && category.parent_id) {
      // need to check for potential cycle
      let cur: string | null = category.parent_id;
      while (cur && this.catalogProvider.Categories[cur].parent_id !== category_id) {
        cur = this.catalogProvider.Categories[cur].parent_id;
      }
      // if the cursor is not empty/null/blank then we stopped because we found the cycle
      if (cur) {
        this.logger.debug(
          `In changing ${category_id}'s parent_id to ${category.parent_id}, found cycle at ${cur}, blanking out ${cur}'s parent_id to prevent cycle.`,
        );
        // this assignment to #categories seems suspect
        // this.categories[cur].parent_id = null; // Cannot assign to read-only property in service
        // But we are updating DB anyway.
        cycle_update_promise = this.wCategoryModel.findByIdAndUpdate(cur, { parent_id: null }, { new: true }).exec();
      }
    }
    const response = await this.wCategoryModel.findByIdAndUpdate(category_id, category, { new: true }).exec();
    if (cycle_update_promise) {
      await cycle_update_promise;
    }
    if (!response) {
      return null;
    }
    await this.catalogProvider.SyncCategories();
    this.catalogProvider.RecomputeCatalogAndEmit();
    // is this going to still be valid after the Sync above?
    return response.toObject();
  };

  DeleteCategory = async (category_id: string, delete_contained_products: boolean) => {
    this.logger.debug(`Removing ${category_id}`);
    // first make sure this isn't used in a fulfillment
    Object.values(this.dataProviderService.Fulfillments).map((x) => {
      if (x.menuBaseCategoryId === category_id) {
        throw Error(`CategoryId: ${category_id} found as Menu Base for FulfillmentId: ${x.id} (${x.displayName})`);
      }
      if (x.orderBaseCategoryId === category_id) {
        throw Error(`CategoryId: ${category_id} found as Order Base for FulfillmentId: ${x.id} (${x.displayName})`);
      }
      if (x.orderSupplementaryCategoryId === category_id) {
        throw Error(
          `CategoryId: ${category_id} found as Order Supplementary for FulfillmentId: ${x.id} (${x.displayName})`,
        );
      }
    });

    const doc = await this.wCategoryModel.findByIdAndDelete(category_id).exec();
    if (!doc) {
      return null;
    }
    await Promise.all(
      Object.values(this.catalogProvider.Categories).map(async (cat) => {
        if (cat.parent_id && cat.parent_id === category_id) {
          await this.wCategoryModel.findByIdAndUpdate(cat.id, { parent_id: null }, { new: true }).exec();
        }
      }),
    );
    if (delete_contained_products) {
      await this.catalogProductService.BatchDeleteProduct(this.catalogProvider.Catalog.categories[category_id].products, true);
    } else {
      const products_update = await this.wProductModel.updateMany({}, { $pull: { category_ids: category_id } }).exec();
      if (products_update.modifiedCount > 0) {
        this.logger.debug(`Removed Category ID from ${products_update.modifiedCount.toString()} products.`);
        await this.catalogProvider.SyncProducts();
      }
    }
    await this.catalogProvider.SyncCategories();
    this.catalogProvider.RecomputeCatalogAndEmit();
    return doc.toObject();
  };
}
