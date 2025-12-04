import { Body, Controller, Get, Headers, Next, Param, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { NextFunction, Request, Response } from 'express';

import { CreateOrderRequestV2Dto, WOrderStatus } from '@wcp/wario-shared';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { ScopesGuard } from '../../auth/guards/scopes.guard';
import { DataProviderService } from '../../config/data-provider/data-provider.service';
import { GoogleService } from '../../config/google/google.service';
import { OrderManagerService } from '../../config/order-manager/order-manager.service';
import {
  CancelOrderRequestDto,
  ConfirmOrderRequestDto,
  MoveOrderRequestDto,
  RescheduleOrderRequestDto,
} from '../../dtos/order.dto';

@Controller('api/v1/order')
@UseGuards(AuthGuard('jwt'), ScopesGuard)
export class OrderController {
  constructor(
    private readonly orderManager: OrderManagerService,
    private readonly googleService: GoogleService,
    private readonly dataProvider: DataProviderService,
  ) { }

  private SendFailureNoticeOnErrorCatch(req: Request, error: unknown) {
    const EMAIL_ADDRESS = this.dataProvider.KeyValueConfig.EMAIL_ADDRESS;
    void this.googleService.SendEmail(
      EMAIL_ADDRESS,
      { name: EMAIL_ADDRESS, address: 'dave@windycitypie.com' },
      'ERROR IN ORDER PROCESSING. CONTACT DAVE IMMEDIATELY',
      'dave@windycitypie.com',
      `<p>Request: ${JSON.stringify(req.body)}</p><p>Error info:${JSON.stringify(error)}</p>`,
    );
  }

  @Post()
  @Scopes('write:order')
  async postOrder(
    @Body() body: CreateOrderRequestV2Dto,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const ipAddress = (req.headers['x-real-ip'] ??
        req.headers['x-forwarded-for'] ??
        req.socket.remoteAddress ??
        '') as string;
      const response = await this.orderManager.CreateOrder(body, ipAddress);
      res.status(response.status).json(response);
    } catch (error) {
      this.SendFailureNoticeOnErrorCatch(req, error);
      next(error);
    }
  }

  @Put(':oId/cancel')
  @Scopes('cancel:order')
  async putCancelOrder(
    @Param('oId') orderId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: CancelOrderRequestDto,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      // TODO: implement idempotency key guard
      const response = await this.orderManager.CancelOrder(
        // idempotencyKey,
        orderId,
        body.reason,
        body.emailCustomer ?? false,
        body.refundToOriginalPayment ?? false,
      );
      res.status(response.status).json(response);
    } catch (error) {
      this.SendFailureNoticeOnErrorCatch(req, error);
      next(error);
    }
  }

  @Put(':oId/confirm')
  @Scopes('write:order')
  async putConfirmOrder(
    @Param('oId') orderId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() _body: ConfirmOrderRequestDto,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      // TODO: implement idempotency key guard
      const response = await this.orderManager.ConfirmOrder(orderId);
      res.status(response.status).json(response);
    } catch (error) {
      this.SendFailureNoticeOnErrorCatch(req, error);
      next(error);
    }
  }

  @Put(':oId/move')
  @Scopes('write:order')
  async putMoveOrder(
    @Param('oId') orderId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: MoveOrderRequestDto,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      // TODO: implement idempotency key guard
      const response = await this.orderManager.SendMoveOrderTicket(
        // idempotencyKey,
        orderId,
        body.destination,
        body.additionalMessage || '',
      );
      res.status(response.status).json(response);
    } catch (error) {
      this.SendFailureNoticeOnErrorCatch(req, error);
      next(error);
    }
  }

  @Put(':oId/reschedule')
  @Scopes('write:order')
  async putRescheduleOrder(
    @Param('oId') orderId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: RescheduleOrderRequestDto,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      // TODO: implement idempotency key guard
      const response = await this.orderManager.AdjustOrderTime(
        // idempotencyKey,
        orderId,
        body,
        body.emailCustomer ?? false,
      );
      res.status(response.status).json(response);
    } catch (error) {
      this.SendFailureNoticeOnErrorCatch(req, error);
      next(error);
    }
  }

  @Put('unlock')
  @Scopes('write:order')
  async putUnlock(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    try {
      const _response = await this.orderManager.ObliterateLocks();
      res.status(200).json({ ok: 'yay!' });
    } catch (error) {
      this.SendFailureNoticeOnErrorCatch(req, error);
      next(error);
    }
  }

  @Put(':oId/send')
  @Scopes('write:order')
  async putSendOrder(
    @Param('oId') orderId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      // TODO: implement idempotency key guard
      const response = await this.orderManager.SendOrder(orderId);
      if (response) {
        res.status(200).json(response);
      } else {
        res.status(404).json(null);
      }
    } catch (error) {
      this.SendFailureNoticeOnErrorCatch(req, error);
      next(error);
    }
  }

  @Get(':oId')
  @Scopes('read:order')
  async getOrder(@Param('oId') orderId: string, @Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    try {
      const response = await this.orderManager.GetOrder(orderId);
      if (response) {
        res.status(200).json(response);
      } else {
        res.status(404).json(null);
      }
    } catch (error) {
      this.SendFailureNoticeOnErrorCatch(req, error);
      next(error);
    }
  }

  @Get()
  @Scopes('read:order')
  async getOrders(
    @Query('date') date: string,
    @Query('status') status: string,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const queryDate = date ? date : null;
      const queryStatus = status ? WOrderStatus[status as keyof typeof WOrderStatus] : null;
      const response = await this.orderManager.GetOrders({
        ...(queryDate ? { $gte: queryDate } : null),
        ...(queryStatus ? { status: queryStatus } : null),
      });
      res.status(200).json(response);
    } catch (error) {
      this.SendFailureNoticeOnErrorCatch(req, error);
      next(error);
    }
  }
}
