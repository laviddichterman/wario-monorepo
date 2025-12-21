import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { isValid, parseISO } from 'date-fns';

import { CreateOrderRequestV2Dto, WDateUtils, type WOrderInstance, WOrderStatus } from '@wcp/wario-shared';
import { AuthScopes } from '@wcp/wario-shared-private';

import { OrderManagerService } from 'src/domain/order/order-manager/order-manager.service';
import { CancelOrderRequestDto, MoveOrderRequestDto, RescheduleOrderRequestDto } from 'src/dtos/order.dto';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { LockOrder } from '../../decorators/lock-order.decorator';
import { LockedOrder } from '../../decorators/locked-order.decorator';
import { RealIp } from '../../decorators/real-ip.decorator';
import { OrderNotFoundException } from '../../exceptions';
import { OrderLockInterceptor } from '../../interceptors/order-lock.interceptor';

function parseAndNormalizeDate(date: string | null | undefined) {
  if (!date) {
    return null;
  }
  const parsedDate = parseISO(date);
  if (!isValid(parsedDate)) {
    return null;
  }
  return WDateUtils.formatISODate(parsedDate);
}

@Controller('api/v1/order')
export class OrderController {
  constructor(private readonly orderManager: OrderManagerService) {}

  @Post()
  @Scopes(AuthScopes.WRITE_ORDER)
  @HttpCode(201)
  async postOrder(@Body() body: CreateOrderRequestV2Dto, @RealIp() ipAddress: string) {
    const response = await this.orderManager.CreateOrder(body, ipAddress);
    if (response.status !== 201) {
      throw new HttpException(response, response.status);
    }
    return response;
  }

  @Put(':oId/cancel')
  @Scopes(AuthScopes.CANCEL_ORDER)
  @UseInterceptors(OrderLockInterceptor)
  @LockOrder()
  async putCancelOrder(
    @LockedOrder() order: (WOrderInstance & Required<{ locked: string }>) | undefined,
    @Body() body: CancelOrderRequestDto,
  ) {
    if (!order) {
      throw new BadRequestException('Failed to acquire lock on order');
    }
    const response = await this.orderManager.CancelLockedOrder(
      order,
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
  @Scopes(AuthScopes.WRITE_ORDER)
  @UseInterceptors(OrderLockInterceptor)
  @LockOrder()
  async putConfirmOrder(@LockedOrder() order: (WOrderInstance & Required<{ locked: string }>) | undefined) {
    if (!order) {
      throw new BadRequestException('Failed to acquire lock on order');
    }
    const response = await this.orderManager.ConfirmLockedOrder(order);
    if (response.status !== 200) {
      throw new HttpException(response, response.status);
    }
    return response;
  }

  @Put(':oId/move')
  @Scopes(AuthScopes.WRITE_ORDER)
  @UseInterceptors(OrderLockInterceptor)
  @LockOrder()
  async putMoveOrder(
    @LockedOrder() order: (WOrderInstance & Required<{ locked: string }>) | undefined,
    @Body() body: MoveOrderRequestDto,
  ) {
    if (!order) {
      throw new BadRequestException('Failed to acquire lock on order');
    }
    const response = await this.orderManager.SendMoveLockedOrderTicket(
      order,
      body.destination,
      body.additionalMessage || '',
    );
    if (response.status !== 200) {
      throw new HttpException(response, response.status);
    }
    return response;
  }

  @Put(':oId/reschedule')
  @Scopes(AuthScopes.WRITE_ORDER)
  @UseInterceptors(OrderLockInterceptor)
  @LockOrder()
  async putAdjustOrderTime(
    @LockedOrder() order: (WOrderInstance & Required<{ locked: string }>) | undefined,
    @Body() body: RescheduleOrderRequestDto,
  ) {
    if (!order) {
      throw new BadRequestException('Failed to acquire lock on order');
    }
    const response = await this.orderManager.AdjustLockedOrderTime(order, body, body.emailCustomer ?? false);
    if (response.status !== 200) {
      throw new HttpException(response, response.status);
    }
    return response;
  }

  @Put('unlock')
  @Scopes(AuthScopes.WRITE_ORDER)
  async putUnlock() {
    await this.orderManager.ObliterateLocks();
    return { ok: 'yay!' };
  }

  @Put(':oId/send')
  @Scopes(AuthScopes.SEND_ORDER)
  @UseInterceptors(OrderLockInterceptor)
  @LockOrder()
  async putSendOrder(@LockedOrder() order: (WOrderInstance & Required<{ locked: string }>) | undefined) {
    if (!order) {
      throw new BadRequestException('Failed to acquire lock on order');
    }
    const response = await this.orderManager.SendLockedOrder(order);
    if (!response.success) {
      throw new OrderNotFoundException(order.id);
    }
    return response;
  }

  @Get(':oId')
  @Scopes(AuthScopes.READ_ORDER)
  async getOrder(@Param('oId') orderId: string) {
    const response = await this.orderManager.GetOrder(orderId);
    if (!response.success) {
      throw new OrderNotFoundException(orderId);
    }
    return response;
  }

  @Get()
  @Scopes(AuthScopes.READ_ORDER)
  async getOrders(@Query('date') date: string, @Query('endDate') endDate: string, @Query('status') status: string) {
    const queryDate = parseAndNormalizeDate(date);
    const queryEndDate = parseAndNormalizeDate(endDate);
    const queryStatus = status ? WOrderStatus[status as keyof typeof WOrderStatus] : null;
    const response = await this.orderManager.GetOrders({
      date: queryDate,
      endDate: queryEndDate,
      status: queryStatus,
    });
    if (!response.success) {
      throw new HttpException(response, response.status);
    }
    return response.result;
  }
}
