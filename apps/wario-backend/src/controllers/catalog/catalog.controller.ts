import { Controller, Get, Inject } from '@nestjs/common';
import { format } from 'date-fns';

import { WDateUtils } from '@wcp/wario-shared';

import { Public } from 'src/auth/decorators/public.decorator';

import { AppConfigService } from 'src/config/app-config.service';
import { CatalogProviderService } from 'src/modules/catalog-provider/catalog-provider.service';
import { DataProviderService } from 'src/modules/data-provider/data-provider.service';

@Public()
@Controller('api/v1/catalog')
export class CatalogController {
  constructor(
    @Inject(CatalogProviderService) private catalogProvider: CatalogProviderService,
    @Inject(DataProviderService) private dataProvider: DataProviderService,
    @Inject(AppConfigService) private appConfig: AppConfigService,
  ) {}

  @Get()
  getCatalog() {
    return this.catalogProvider.getCatalog();
  }

  @Get('fulfillments')
  getFulfillments() {
    return Object.values(this.dataProvider.getFulfillments());
  }

  @Get('settings')
  getSettings() {
    return this.dataProvider.getSettings();
  }

  @Get('server-time')
  getServerTime() {
    const time = Date.now();
    return {
      time: format(time, WDateUtils.ISODateTimeNoOffset),
      tz: this.appConfig.timezone,
    };
  }
}
