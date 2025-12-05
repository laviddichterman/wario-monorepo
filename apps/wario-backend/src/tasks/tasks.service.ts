import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { OrderManagerService } from '../config/order-manager/order-manager.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly orderManager: OrderManagerService) { }

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
    await this.orderManager.Query3pOrders();
  }
}
