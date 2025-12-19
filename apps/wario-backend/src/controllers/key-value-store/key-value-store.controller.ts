import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';

import type { KeyValueConfigDto } from 'src/dtos/key-value-store.dto';
import { DataProviderService } from 'src/modules/data-provider/data-provider.service';

@Controller('api/v1/config/kvstore')
export class KeyValueStoreController {
  constructor(private readonly dataProvider: DataProviderService) {}

  @Get()
  getKvStore() {
    return this.dataProvider.getKeyValueConfig();
  }

  @Post()
  @HttpCode(201)
  async setKvStore(@Body() body: KeyValueConfigDto) {
    await this.dataProvider.updateKeyValueConfig(body);
    return this.dataProvider.getKeyValueConfig();
  }
}
