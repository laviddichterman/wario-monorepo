import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { FulfillmentTimeDto } from '@wcp/wario-shared';

export class CancelOrderRequestDto {
  @IsOptional()
  @IsBoolean()
  refundToOriginalPayment?: boolean;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsBoolean()
  emailCustomer?: boolean;
}

export class ConfirmOrderRequestDto {
  @IsOptional()
  @IsString()
  additionalMessage?: string;
}

export class MoveOrderRequestDto {
  @IsString()
  @IsNotEmpty()
  destination!: string;

  @IsOptional()
  @IsString()
  additionalMessage?: string;
}

export class RescheduleOrderRequestDto extends FulfillmentTimeDto {
  @IsOptional()
  @IsBoolean()
  emailCustomer?: boolean;

  @IsOptional()
  @IsString()
  additionalMessage?: string;
}
