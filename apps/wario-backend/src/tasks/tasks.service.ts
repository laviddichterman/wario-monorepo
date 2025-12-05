import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { OrderManagerService } from '../config/order-manager/order-manager.service';
import { ThirdPartyOrderService } from '../config/third-party-order/third-party-order.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly orderManager: OrderManagerService,
    private readonly thirdPartyOrderService: ThirdPartyOrderService,
  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleSendOrders() {
    this.logger.debug('Running SendOrders task');
    await this.orderManager.SendOrders();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleClearPastOrders() {
    this.logger.debug('Running ClearPastOrders task');
    await this.orderManager.ClearPastOrders();
  }


  @Cron('*/35 * * * * *') // Every 35 seconds
  async handleQuery3pOrders() {
    this.logger.debug('Running Query3pOrders task');
    await this.thirdPartyOrderService.Query3pOrders();
  }
}

