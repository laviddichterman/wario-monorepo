import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { WCategoryModel } from './category/WCategorySchema';
import { WOptionModel } from './options/WOptionSchema';
import { WOptionTypeModel } from './options/WOptionTypeSchema';
import { WProductInstanceModel } from './products/WProductInstanceSchema';
import { WProductModel } from './products/WProductSchema';
import { PrinterGroupModel } from './WPrinterGroupSchema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'WCategorySchema', schema: WCategoryModel.schema },
      { name: 'WOptionSchema', schema: WOptionModel.schema },
      { name: 'WOptionTypeSchema', schema: WOptionTypeModel.schema },
      { name: 'WProductInstanceSchema', schema: WProductInstanceModel.schema },
      { name: 'WProductSchema', schema: WProductModel.schema },
      { name: 'WPrinterGroupSchema', schema: PrinterGroupModel.schema },
    ]),
  ],
  exports: [MongooseModule],
})
export class CatalogModule {}
