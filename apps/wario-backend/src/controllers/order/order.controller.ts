import { Body, Controller, Get, Headers, HttpCode, HttpException, InternalServerErrorException, NotFoundException, Param, Post, Put, Query, UseInterceptors } from '@nestjs/common';

import { CreateOrderRequestV2Dto, WOrderStatus } from '@wcp/wario-shared';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { DataProviderService } from '../../config/data-provider/data-provider.service';
import { GoogleService } from '../../config/google/google.service';
import { OrderManagerService } from '../../config/order-manager/order-manager.service';
import { LockOrder } from '../../decorators/lock-order.decorator';
import { RealIp } from '../../decorators/real-ip.decorator';
import {
  CancelOrderRequestDto,
  ConfirmOrderRequestDto,
  MoveOrderRequestDto,
  RescheduleOrderRequestDto,
} from '../../dtos/order.dto';
import { OrderLockInterceptor } from '../../interceptors/order-lock.interceptor';

@Controller('api/v1/order')
export class OrderController {
  constructor(
    private readonly orderManager: OrderManagerService,
    private readonly googleService: GoogleService,
    private readonly dataProvider: DataProviderService,
  ) { }

  private SendFailureNoticeOnErrorCatch(requestData: unknown, error: unknown) {
    const EMAIL_ADDRESS = this.dataProvider.KeyValueConfig.EMAIL_ADDRESS;
    void this.googleService.SendEmail(
      EMAIL_ADDRESS,
      { name: EMAIL_ADDRESS, address: 'dave@windycitypie.com' },
      'ERROR IN ORDER PROCESSING. CONTACT DAVE IMMEDIATELY',
      'dave@windycitypie.com',
      `<p>Request: ${JSON.stringify(requestData)}</p><p>Error info:${JSON.stringify(error)}</p>`,
    );
  }

  @Post()
  @Scopes('write:order')
  @HttpCode(201)
  async postOrder(
    @Body() body: CreateOrderRequestV2Dto,
    @RealIp() ipAddress: string,
  ) {
    try {
      const response = await this.orderManager.CreateOrder(body, ipAddress);
      if (response.status !== 201) {
        throw new HttpException(response, response.status);
      }
      return response;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.SendFailureNoticeOnErrorCatch(body, error);
      throw new InternalServerErrorException(error);
    }
  }

  @Put(':oId/cancel')
  @Scopes('cancel:order')
  @UseInterceptors(OrderLockInterceptor)
  @LockOrder()
  async putCancelOrder(
    @Param('oId') orderId: string,
    @Headers('idempotency-key') _idempotencyKey: string,
    @Body() body: CancelOrderRequestDto,
  ) {
    try {
      const response = await this.orderManager.CancelOrder(
        // idempotencyKey,
        orderId,
        body.reason,
        body.emailCustomer ?? false,
        body.refundToOriginalPayment ?? false,
      );
      if (response.status !== 200) {
        throw new HttpException(response, response.status);
      }
      return response;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.SendFailureNoticeOnErrorCatch(body, error);
      throw new InternalServerErrorException(error);
    }
  }

  @Put(':oId/confirm')
  @Scopes('write:order')
  @UseInterceptors(OrderLockInterceptor)
  @LockOrder()
  async putConfirmOrder(
    @Param('oId') orderId: string,
    @Headers('idempotency-key') _idempotencyKey: string,
    @Body() body: ConfirmOrderRequestDto,
  ) {
    try {
      const response = await this.orderManager.ConfirmOrder(orderId);
      if (response.status !== 200) {
        throw new HttpException(response, response.status);
      }
      return response;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.SendFailureNoticeOnErrorCatch(body, error);
      throw new InternalServerErrorException(error);
    }
  }

  @Put(':oId/move')
  @Scopes('write:order')
  @UseInterceptors(OrderLockInterceptor)
  @LockOrder()
  async putMoveOrder(
    @Param('oId') orderId: string,
    @Headers('idempotency-key') _idempotencyKey: string,
    @Body() body: MoveOrderRequestDto,
  ) {
    try {
      const response = await this.orderManager.SendMoveOrderTicket(
        orderId,
        body.destination,
        body.additionalMessage || '',
      );
      if (response.status !== 200) {
        throw new HttpException(response, response.status);
      }
      return response;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.SendFailureNoticeOnErrorCatch(body, error);
      throw new InternalServerErrorException(error);
    }
  }

  @Put(':oId/reschedule')
  @Scopes('write:order')
  @UseInterceptors(OrderLockInterceptor)
  @LockOrder()
  async putAdjustOrderTime(
    @Param('oId') orderId: string,
    @Headers('idempotency-key') _idempotencyKey: string,
    @Body() body: RescheduleOrderRequestDto,
  ) {
    try {
      const response = await this.orderManager.AdjustOrderTime(
        orderId,
        body,
        body.emailCustomer ?? false,
      );
      if (response.status !== 200) {
        throw new HttpException(response, response.status);
      }
      return response;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.SendFailureNoticeOnErrorCatch(body, error);
      throw new InternalServerErrorException(error);
    }
  }

  @Put('unlock')
  @Scopes('write:order')
  async putUnlock() {
    try {
      const _response = await this.orderManager.ObliterateLocks();
      return { ok: 'yay!' };
    } catch (error) {
      this.SendFailureNoticeOnErrorCatch({}, error);
      throw new InternalServerErrorException(error);
    }
  }

  @Put(':oId/send')
  @Scopes('send:order')
  @UseInterceptors(OrderLockInterceptor)
  @LockOrder()
  async putSendOrder(
    @Param('oId') orderId: string,
    @Headers('idempotency-key') _idempotencyKey: string,
  ) {
    try {
      const response = await this.orderManager.SendOrder(orderId);
      if (response.success) {
        return response;
      } else {
        throw new NotFoundException(response);
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.SendFailureNoticeOnErrorCatch({ orderId }, error);
      throw new InternalServerErrorException(error);
    }
  }

  @Get(':oId')
  @Scopes('read:order')
  async getOrder(@Param('oId') orderId: string) {
    try {
      const response = await this.orderManager.GetOrder(orderId);
      if (response.success) {
        return response;
      } else {
        throw new NotFoundException(response);
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.SendFailureNoticeOnErrorCatch({ orderId }, error);
      throw new InternalServerErrorException(error);
    }
  }

  @Get()
  @Scopes('read:order')
  async getOrders(
    @Query('date') date: string,
    @Query('status') status: string,
  ) {
    try {
      const queryDate = date ? date : null;
      const queryStatus = status ? WOrderStatus[status as keyof typeof WOrderStatus] : null;
      const response = await this.orderManager.GetOrders({
        ...(queryDate ? { $gte: queryDate } : null),
        ...(queryStatus ? { status: queryStatus } : null),
      });
      return response;
    } catch (error) {
      this.SendFailureNoticeOnErrorCatch({ date, status }, error);
      throw new InternalServerErrorException(error);
    }
  }
}
