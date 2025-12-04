import { Body, Controller, Delete, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import type { IWSettingsDto, PostBlockedOffToFulfillmentsRequestDto, SetLeadTimesRequest } from '@wcp/wario-shared';

import { DataProviderService } from '../../config/data-provider/data-provider.service';
import { SocketIoService } from '../../config/socket-io/socket-io.service';

@Controller('api/v1/config')
export class SettingsController {
  constructor(
    private readonly dataProvider: DataProviderService,
    private readonly socketIoService: SocketIoService,
  ) { }

  @Post('timing/blockoff')
  async postBlockedOff(@Body() body: PostBlockedOffToFulfillmentsRequestDto, @Req() req: Request, @Res() res: Response) {
    try {
      await this.dataProvider.postBlockedOffToFulfillments(body);
      await this.dataProvider.syncFulfillments();
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.Fulfillments);
      const location = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      res.setHeader('Location', location);
      return res.status(201).send(this.dataProvider.Fulfillments);
    } catch (error) {
      return res.status(500).send(error);
    }
  }

  @Delete('timing/blockoff')
  async deleteBlockedOff(@Body() body: PostBlockedOffToFulfillmentsRequestDto, @Res() res: Response) {
    try {
      await this.dataProvider.deleteBlockedOffFromFulfillments(body);
      await this.dataProvider.syncFulfillments();
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.Fulfillments);
      return res.status(201).send(this.dataProvider.Fulfillments);
    } catch (error) {
      return res.status(500).send(error);
    }
  }

  @Post('timing/leadtime')
  async setLeadtime(@Body() body: SetLeadTimesRequest, @Req() req: Request, @Res() res: Response) {
    try {
      await this.dataProvider.setLeadTimes(body);
      await this.dataProvider.syncFulfillments();
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.Fulfillments);
      const location = `${req.protocol}://${req.get('host')}${req.originalUrl}/`;
      res.setHeader('Location', location);
      return res.status(201).send(this.dataProvider.Fulfillments);
    } catch (error) {
      return res.status(500).send(error);
    }
  }

  @Post('settings')
  async setSettings(@Body() body: IWSettingsDto, @Req() req: Request, @Res() res: Response) {
    try {
      await this.dataProvider.updateSettings(body);
      this.socketIoService.server.emit('WCP_SETTINGS', this.dataProvider.Settings);
      const location = `${req.protocol}://${req.get('host')}${req.originalUrl}/`;
      res.setHeader('Location', location);
      return res.status(201).send(this.dataProvider.Settings);
    } catch (error) {
      return res.status(500).send(error);
    }
  }
}
