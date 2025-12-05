import { Body, Controller, Get, Headers, HttpCode, HttpException, Param, Post, Put, Query, UseInterceptors } from '@nestjs/common';

import { CreateOrderRequestV2Dto, WOrderStatus } from '@wcp/wario-shared';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { OrderManagerService } from '../../config/order-manager/order-manager.service';
import { LockOrder } from '../../decorators/lock-order.decorator';
import { RealIp } from '../../decorators/real-ip.decorator';
import {
  CancelOrderRequestDto,
  ConfirmOrderRequestDto,
  MoveOrderRequestDto,
  RescheduleOrderRequestDto,
} from '../../dtos/order.dto';
import { OrderNotFoundException } from '../../exceptions';
import { OrderLockInterceptor } from '../../interceptors/order-lock.interceptor';

@Controller('api/v1/order')
export class OrderController {
  constructor(
    private readonly orderManager: OrderManagerService,
  ) { }

  @Post()
  @Scopes('write:order')
  @HttpCode(201)
  async postOrder(
    @Body() body: CreateOrderRequestV2Dto,
    @RealIp() ipAddress: string,
  ) {
    const response = await this.orderManager.CreateOrder(body, ipAddress);
    if (response.status !== 201) {
      throw new HttpException(response, response.status);
    }
    return response;
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
    const response = await this.orderManager.CancelOrder(
      orderId,
      body.reason,
      body.emailCustomer ?? false,
      body.refundToOriginalPayment ?? false,
    );
    if (response.status !== 200) {
      throw new HttpException(response, response.status);
    }
    return response;
  }

  @Put(':oId/confirm')
  @Scopes('write:order')
  @UseInterceptors(OrderLockInterceptor)
  @LockOrder()
  async putConfirmOrder(
    @Param('oId') orderId: string,
    @Headers('idempotency-key') _idempotencyKey: string,
    @Body() _body: ConfirmOrderRequestDto,
  ) {
    const response = await this.orderManager.ConfirmOrder(orderId);
    if (response.status !== 200) {
      throw new HttpException(response, response.status);
    }
    return response;
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
    const response = await this.orderManager.SendMoveOrderTicket(
      orderId,
      body.destination,
      body.additionalMessage || '',
    );
    if (response.status !== 200) {
      throw new HttpException(response, response.status);
    }
    return response;
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
    const response = await this.orderManager.AdjustOrderTime(
      orderId,
      body,
      body.emailCustomer ?? false,
    );
    if (response.status !== 200) {
      throw new HttpException(response, response.status);
    }
    return response;
  }

  @Put('unlock')
  @Scopes('write:order')
  async putUnlock() {
    await this.orderManager.ObliterateLocks();
    return { ok: 'yay!' };
  }

  @Put(':oId/send')
  @Scopes('send:order')
  @UseInterceptors(OrderLockInterceptor)
  @LockOrder()
  async putSendOrder(
    @Param('oId') orderId: string,
    @Headers('idempotency-key') _idempotencyKey: string,
  ) {
    const response = await this.orderManager.SendOrder(orderId);
    if (!response.success) {
      throw new OrderNotFoundException(orderId);
    }
    return response;
  }

  @Get(':oId')
  @Scopes('read:order')
  async getOrder(@Param('oId') orderId: string) {
    const response = await this.orderManager.GetOrder(orderId);
    if (!response.success) {
      throw new OrderNotFoundException(orderId);
    }
    return response;
  }

  @Get()
  @Scopes('read:order')
  async getOrders(
    @Query('date') date: string,
    @Query('status') status: string,
  ) {
    const queryDate = date ? date : null;
    const queryStatus = status ? WOrderStatus[status as keyof typeof WOrderStatus] : null;
    const response = await this.orderManager.GetOrders({
      ...(queryDate ? { $gte: queryDate } : null),
      ...(queryStatus ? { status: queryStatus } : null),
    });
    return response;
  }
}

