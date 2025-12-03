import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { WOrderInstanceFunctionModel } from './order/WOrderInstanceFunction';
import { WProductInstanceFunctionModel } from './product/WProductInstanceFunction';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'WOrderInstanceFunction',
        schema: WOrderInstanceFunctionModel.schema,
      },
      {
        name: 'WProductInstanceFunction',
        schema: WProductInstanceFunctionModel.schema,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class QueryModule {}
