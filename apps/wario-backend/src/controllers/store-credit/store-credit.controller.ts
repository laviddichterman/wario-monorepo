import { Body, Controller, Get, Next, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { NextFunction, Request, Response } from 'express';

import {
  CURRENCY,
  IssueStoreCreditRequestDto,
  PurchaseStoreCreditRequest,
  type PurchaseStoreCreditRequestDto,
  type SpendCreditResponse,
  ValidateLockAndSpendRequestDto,
} from '@wcp/wario-shared';

import { BigIntStringify } from 'src/utils/utils';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { ScopesGuard } from '../../auth/guards/scopes.guard';
import { DataProviderService } from '../../config/data-provider/data-provider.service';
import { GoogleService } from '../../config/google/google.service';
import { StoreCreditProviderService } from '../../config/store-credit-provider/store-credit-provider.service';

@Controller('api/v1/payments/storecredit')
@UseGuards(AuthGuard('jwt'), ScopesGuard)
export class StoreCreditController {
  constructor(
    private readonly dataProvider: DataProviderService,
    private readonly storeCreditProvider: StoreCreditProviderService,
    private readonly googleService: GoogleService,
  ) { }

  @Get('validate')
  @Scopes('read:order')
  async getValidateCredit(
    @Query('code') code: string,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const validate_response = await this.storeCreditProvider.ValidateAndLockCode(code);
      if (validate_response.valid && validate_response.amount.amount > 0) {
        return res.status(200).json(validate_response);
      } else {
        return res.status(404).json(validate_response);
      }
    } catch (error) {
      const EMAIL_ADDRESS = this.dataProvider.KeyValueConfig.EMAIL_ADDRESS;
      void this.googleService.SendEmail(
        EMAIL_ADDRESS,
        { name: EMAIL_ADDRESS, address: 'dave@windycitypie.com' },
        'ERROR IN GIFT CARD PROCESSING. CONTACT DAVE IMMEDIATELY',
        'dave@windycitypie.com',
        `<p>Request: ${JSON.stringify(req.query)}</p><p>Error info:${BigIntStringify(error)}</p>`,
      );
      next(error);
      return;
    }
  }

  @Post('spend')
  @Scopes('write:order')
  async postSpendCredit(
    @Body() body: ValidateLockAndSpendRequestDto,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const spending_result = await this.storeCreditProvider.ValidateLockAndSpend(body);
      if (!spending_result.success) {
        return res.status(422).json({ success: false } satisfies SpendCreditResponse);
      }
      return res.status(200).json({
        success: true,
        balance: {
          currency: CURRENCY.USD,
          amount: spending_result.entry[3] * 100 - body.amount.amount,
        },
      });
    } catch (error) {
      const EMAIL_ADDRESS = this.dataProvider.KeyValueConfig.EMAIL_ADDRESS;
      void this.googleService.SendEmail(
        EMAIL_ADDRESS,
        { name: EMAIL_ADDRESS, address: 'dave@windycitypie.com' },
        'ERROR IN GIFT CARD PROCESSING. CONTACT DAVE IMMEDIATELY',
        'dave@windycitypie.com',
        `<p>Request: ${BigIntStringify(body)}</p><p>Error info:${BigIntStringify(error)}</p>`,
      );
      next(error);
      return;
    }
  }

  @Post('purchase')
  @Scopes('write:order')
  async postPurchaseCredit(
    @Body() body: PurchaseStoreCreditRequestDto,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const result = await this.storeCreditProvider.PurchaseStoreCredit(body as PurchaseStoreCreditRequest, body.nonce);
      return res.status(result.status).json(result);
    } catch (error) {
      void this.googleService.SendEmail(
        this.dataProvider.KeyValueConfig.EMAIL_ADDRESS,
        { name: this.dataProvider.KeyValueConfig.EMAIL_ADDRESS, address: "dave@windycitypie.com" },
        "ERROR IN GIFT CARD PROCESSING. CONTACT DAVE IMMEDIATELY",
        "dave@windycitypie.com",
        `<p>Order request: ${BigIntStringify(body)}</p><p>Error info:${BigIntStringify(error)}</p>`);
      next(error);
      return;
    }
  }

  @Post('issue')
  @Scopes('write:order')
  async postIssueCredit(@Body() body: IssueStoreCreditRequestDto, @Res() res: Response, @Next() next: NextFunction) {
    try {
      const create_result = await this.storeCreditProvider.IssueCredit(body);
      if (create_result.status === 200) {
        return res.status(201).send(create_result);
      } else {
        return res.status(create_result.status).send(create_result);
      }
    } catch (error) {
      next(error);
      return;
    }
  }
}
