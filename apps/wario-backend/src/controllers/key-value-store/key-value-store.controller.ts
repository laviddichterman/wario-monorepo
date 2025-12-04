import { Body, Controller, Get, Next, Post, Req, Res } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { DataProviderService } from '../../config/data-provider/data-provider.service';

@Controller('api/v1/config/kvstore')
export class KeyValueStoreController {
  constructor(private readonly dataProvider: DataProviderService) {}

  @Get()
  async getKvStore(@Res() response: Response, @Next() next: NextFunction) {
    try {
      return response.status(200).send(this.dataProvider.KeyValueConfig);
    } catch (error) {
      next(error);
      return;
    }
  }

  @Post()
  async setKvStore(@Body() body: any, @Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    try {
      await this.dataProvider.updateKeyValueConfig(body);
      const location = `${req.protocol}://${req.get('host')}${req.originalUrl}/`;
      res.setHeader('Location', location);
      return res.status(201).send(this.dataProvider.KeyValueConfig);
    } catch (error) {
      next(error);
      return;
    }
  }
}
