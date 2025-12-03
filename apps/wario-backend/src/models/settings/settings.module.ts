import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import DBVersionModel from '../DBVersionSchema';

import { DeliveryAreaModel } from './DeliveryAreaSchema';
import { FulfillmentModel } from './FulfillmentSchema';
import { KeyValueModel } from './KeyValueSchema';
import { SettingsModel } from './SettingsSchema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'DeliveryAreaSchema', schema: DeliveryAreaModel.schema },
      { name: 'FulfillmentSchema', schema: FulfillmentModel.schema },
      { name: 'KeyValueSchema', schema: KeyValueModel.schema },
      { name: 'SettingsSchema', schema: SettingsModel.schema },
      { name: 'DBVersionSchema', schema: DBVersionModel.schema },
    ]),
  ],
  exports: [MongooseModule],
})
export class SettingsModule {}
