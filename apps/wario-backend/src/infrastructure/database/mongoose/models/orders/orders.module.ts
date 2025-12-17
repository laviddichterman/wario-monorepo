import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { WOrderInstanceModel } from './WOrderInstance';
import { SeatingResourceModel } from './WSeatingResource';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'WOrderInstance', schema: WOrderInstanceModel.schema },
      { name: 'SeatingResource', schema: SeatingResourceModel.schema },
    ]),
  ],
  exports: [MongooseModule],
})
export class OrdersModule {}
