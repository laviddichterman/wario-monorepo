import { Body, Controller, Get, HttpCode, HttpException, InternalServerErrorException, NotFoundException, Post, Query, UnprocessableEntityException } from '@nestjs/common';

import {
  CURRENCY,
  IssueStoreCreditRequestDto,
  PurchaseStoreCreditRequest,
  type PurchaseStoreCreditRequestDto,
  type SpendCreditResponse,
  ValidateLockAndSpendRequestDto,
} from '@wcp/wario-shared';

import { BigIntStringify } from 'src/utils/utils';

import { Public } from 'src/auth/decorators/public.decorator';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { DataProviderService } from '../../config/data-provider/data-provider.service';
import { GoogleService } from '../../config/google/google.service';
import { StoreCreditProviderService } from '../../config/store-credit-provider/store-credit-provider.service';

@Controller('api/v1/payments/storecredit')
export class StoreCreditController {
  constructor(
    private readonly dataProvider: DataProviderService,
    private readonly storeCreditProvider: StoreCreditProviderService,
    private readonly googleService: GoogleService,
  ) { }

  @Get('validate')
  @Public()
  async getValidateCredit(@Query('code') code: string) {
    try {
      const validate_response = await this.storeCreditProvider.ValidateAndLockCode(code);
      if (validate_response.valid && validate_response.amount.amount > 0) {
        return validate_response;
      } else {
        throw new NotFoundException(validate_response);
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const EMAIL_ADDRESS = this.dataProvider.KeyValueConfig.EMAIL_ADDRESS;
      void this.googleService.SendEmail(
        EMAIL_ADDRESS,
        { name: EMAIL_ADDRESS, address: 'dave@windycitypie.com' },
        'ERROR IN GIFT CARD PROCESSING. CONTACT DAVE IMMEDIATELY',
        'dave@windycitypie.com',
        `<p>Request: ${JSON.stringify({ code })}</p><p>Error info:${BigIntStringify(error)}</p>`,
      );
      throw error;
    }
  }

  @Post('spend')
  @Scopes('write:order')
  @HttpCode(200)
  async postSpendCredit(@Body() body: ValidateLockAndSpendRequestDto) {
    try {
      const spending_result = await this.storeCreditProvider.ValidateLockAndSpend(body);
      if (!spending_result.success) {
        throw new UnprocessableEntityException({ success: false } satisfies SpendCreditResponse);
      }
      return {
        success: true,
        balance: {
          currency: CURRENCY.USD,
          amount: (spending_result.entry[3] as number) * 100 - body.amount.amount,
        },
      };
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      const EMAIL_ADDRESS = this.dataProvider.KeyValueConfig.EMAIL_ADDRESS;
      void this.googleService.SendEmail(
        EMAIL_ADDRESS,
        { name: EMAIL_ADDRESS, address: 'dave@windycitypie.com' },
        'ERROR IN GIFT CARD PROCESSING. CONTACT DAVE IMMEDIATELY',
        'dave@windycitypie.com',
        `<p>Request: ${BigIntStringify(body)}</p><p>Error info:${BigIntStringify(error)}</p>`,
      );
      throw error;
    }
  }

  @Post('purchase')
  @Public()
  @HttpCode(200)
  async postPurchaseCredit(@Body() body: PurchaseStoreCreditRequestDto) {
    try {
      const result = await this.storeCreditProvider.PurchaseStoreCredit(body as PurchaseStoreCreditRequest, body.nonce);
      if (result.status !== 200) {
        throw new HttpException(result, result.status);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      void this.googleService.SendEmail(
        this.dataProvider.KeyValueConfig.EMAIL_ADDRESS,
        { name: this.dataProvider.KeyValueConfig.EMAIL_ADDRESS, address: "dave@windycitypie.com" },
        "ERROR IN GIFT CARD PROCESSING. CONTACT DAVE IMMEDIATELY",
        "dave@windycitypie.com",
        `<p>Order request: ${BigIntStringify(body)}</p><p>Error info:${BigIntStringify(error)}</p>`);
      throw new InternalServerErrorException(error);
    }
  }

  @Post('issue')
  @Scopes('write:order')
  @HttpCode(201)
  async postIssueCredit(@Body() body: IssueStoreCreditRequestDto) {
    const create_result = await this.storeCreditProvider.IssueCredit(body);
    if (create_result.status === 200) {
      return create_result;
    } else {
      throw new HttpException(create_result, create_result.status);
    }
  }
}
