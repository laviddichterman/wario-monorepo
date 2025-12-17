import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';

import { DataProviderService } from 'src/config/data-provider/data-provider.service';
import type { KeyValueConfigDto } from 'src/dtos/key-value-store.dto';

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
