import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import DBVersion, { DBVersionSchema } from '../DBVersionSchema';

import { WCategoryModel } from './category/WCategorySchema';
import { WOptionModel } from './options/WOptionSchema';
import { WOptionTypeModel } from './options/WOptionTypeSchema';
import { WProductInstanceModel } from './products/WProductInstanceSchema';
import { WProductModel } from './products/WProductSchema';
import { PrinterGroupModel } from './WPrinterGroupSchema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DBVersion.modelName, schema: DBVersionSchema },
      { name: WCategoryModel.modelName, schema: WCategoryModel.schema },
      { name: WOptionModel.modelName, schema: WOptionModel.schema },
      { name: WOptionTypeModel.modelName, schema: WOptionTypeModel.schema },
      { name: WProductInstanceModel.modelName, schema: WProductInstanceModel.schema },
      { name: WProductModel.modelName, schema: WProductModel.schema },
      { name: PrinterGroupModel.modelName, schema: PrinterGroupModel.schema },
    ]),
  ],
  exports: [MongooseModule],
})
export class CatalogModule {}
