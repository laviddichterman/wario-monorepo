import { Body, Controller, Get, HttpCode, HttpException, Post, Query } from '@nestjs/common';

import {
  CURRENCY,
  IssueStoreCreditRequestDto,
  PurchaseStoreCreditRequest,
  type PurchaseStoreCreditRequestDto,
  type SpendCreditResponse,
  ValidateLockAndSpendRequestDto,
} from '@wcp/wario-shared';

import { Public } from 'src/auth/decorators/public.decorator';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { StoreCreditProviderService } from 'src/config/store-credit-provider/store-credit-provider.service';
import { InsufficientCreditException, StoreCreditNotFoundException } from '../../exceptions';

@Controller('api/v1/payments/storecredit')
export class StoreCreditController {
  constructor(private readonly storeCreditProvider: StoreCreditProviderService) {}

  @Get('validate')
  @Public()
  async getValidateCredit(@Query('code') code: string) {
    const validate_response = await this.storeCreditProvider.ValidateAndLockCode(code);
    if (validate_response.valid && validate_response.amount.amount > 0) {
      return validate_response;
    } else {
      throw new StoreCreditNotFoundException(code);
    }
  }

  @Post('spend')
  @Scopes('write:order')
  @HttpCode(200)
  async postSpendCredit(@Body() body: ValidateLockAndSpendRequestDto) {
    const spending_result = await this.storeCreditProvider.ValidateLockAndSpend(body);
    if (!spending_result.success) {
      throw new InsufficientCreditException(
        body.code,
        0, // We don't have the actual balance here
        body.amount.amount,
      );
    }
    return {
      success: true,
      balance: {
        currency: CURRENCY.USD,
        amount: (spending_result.entry[3] as number) * 100 - body.amount.amount,
      },
    } satisfies SpendCreditResponse;
  }

  @Post('purchase')
  @Public()
  @HttpCode(200)
  async postPurchaseCredit(@Body() body: PurchaseStoreCreditRequestDto) {
    const result = await this.storeCreditProvider.PurchaseStoreCredit(body as PurchaseStoreCreditRequest, body.nonce);
    if (result.status !== 200) {
      throw new HttpException(result, result.status);
    }
    return result;
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
