import { Body, Controller, Delete, HttpCode, InternalServerErrorException, Post } from '@nestjs/common';

import type { IWSettingsDto, PostBlockedOffToFulfillmentsRequestDto, SetLeadTimesRequest } from '@wcp/wario-shared';

import { DataProviderService } from '../../config/data-provider/data-provider.service';
import { SocketIoService } from '../../config/socket-io/socket-io.service';

@Controller('api/v1/config')
export class SettingsController {
  constructor(
    private readonly dataProvider: DataProviderService,
    private readonly socketIoService: SocketIoService,
  ) {}

  @Post('timing/blockoff')
  @HttpCode(201)
  async postBlockedOff(@Body() body: PostBlockedOffToFulfillmentsRequestDto) {
    try {
      await this.dataProvider.postBlockedOffToFulfillments(body);
      await this.dataProvider.syncFulfillments();
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.getFulfillments());
      return this.dataProvider.getFulfillments();
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Delete('timing/blockoff')
  async deleteBlockedOff(@Body() body: PostBlockedOffToFulfillmentsRequestDto) {
    try {
      await this.dataProvider.deleteBlockedOffFromFulfillments(body);
      await this.dataProvider.syncFulfillments();
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.getFulfillments());
      return this.dataProvider.getFulfillments();
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Post('timing/leadtime')
  @HttpCode(201)
  async setLeadtime(@Body() body: SetLeadTimesRequest) {
    try {
      await this.dataProvider.setLeadTimes(body);
      await this.dataProvider.syncFulfillments();
      this.socketIoService.EmitFulfillmentsTo(this.socketIoService.server, this.dataProvider.getFulfillments());
      return this.dataProvider.getFulfillments();
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Post('settings')
  @HttpCode(201)
  async setSettings(@Body() body: IWSettingsDto) {
    try {
      await this.dataProvider.updateSettings(body);
      this.socketIoService.server.emit('WCP_SETTINGS', this.dataProvider.getSettings());
      return this.dataProvider.getSettings();
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
