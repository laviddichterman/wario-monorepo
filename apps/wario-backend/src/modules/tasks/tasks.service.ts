import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { OrderManagerService } from 'src/config/order-manager/order-manager.service';
import { PrinterService } from 'src/config/printer/printer.service';
import { ThirdPartyOrderService } from 'src/config/third-party-order/third-party-order.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly orderManager: OrderManagerService,
    private readonly printerService: PrinterService,
    private readonly thirdPartyOrderService: ThirdPartyOrderService,
    @InjectPinoLogger(TasksService.name)
    private readonly logger: PinoLogger,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleSendOrders() {
    this.logger.debug('Running SendOrders task');
    await this.orderManager.SendOrders();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleClearPastOrders() {
    this.logger.debug('Running ClearPastOrders task');
    await this.printerService.ClearPastOrders();
  }

  @Cron('*/35 * * * * *') // Every 35 seconds
  async handleQuery3pOrders() {
    this.logger.debug('Running Query3pOrders task');
    await this.thirdPartyOrderService.Query3pOrders();
  }
}
