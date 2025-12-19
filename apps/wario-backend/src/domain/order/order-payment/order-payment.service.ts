import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Order as SquareOrder } from 'square/legacy';

import {
  CURRENCY,
  CustomerInfoData,
  IMoney,
  OrderPayment,
  OrderPaymentAllocated,
  StoreCreditType,
  TenderBaseStatus,
  ValidateLockAndSpendSuccess,
} from '@wcp/wario-shared';

import { DataProviderService } from 'src/modules/data-provider/data-provider.service';
import { SquareError, SquareService } from 'src/modules/integrations/square/square.service';

import { CreateOrderStoreCreditForRefund } from '../../../config/square-wario-bridge';
import { StoreCreditProviderService } from '../../../config/store-credit-provider/store-credit-provider.service';

@Injectable()
export class OrderPaymentService {
  constructor(
    private squareService: SquareService,
    private storeCreditService: StoreCreditProviderService,
    private dataProvider: DataProviderService,
    @InjectPinoLogger(OrderPaymentService.name)
    private readonly logger: PinoLogger,
  ) { }

  /**
   * Issues a store credit refund for an order cancellation.
   * Creates a Square order for the refund, then issues the store credit.
   */
  IssueRefundCreditForOrder = async (
    squareOrder: SquareOrder,
    customerInfo: CustomerInfoData,
    amount: IMoney,
  ): Promise<
    | ({ success: true } & { [k: string]: unknown })
    | {
      success: false;
      result: null;
      error: SquareError[];
    }
  > => {
    let undoPaymentResponse:
      | ({ success: true } & { [k: string]: unknown })
      | {
        success: false;
        result: null;
        error: SquareError[];
      };
    // refund to store credit
    const create_order_store_credit = await this.squareService.CreateOrder(
      CreateOrderStoreCreditForRefund(
        this.dataProvider.getKeyValueConfig().SQUARE_LOCATION,
        squareOrder.referenceId as string,
        amount,
        `Refund for order ${squareOrder.id as string} cancellation`,
      ),
    );
    undoPaymentResponse = create_order_store_credit;
    if (create_order_store_credit.success && create_order_store_credit.result.order?.id) {
      const zero_payment = await this.squareService.CreatePayment({
        amount: { currency: CURRENCY.USD, amount: 0 },
        autocomplete: true,
        locationId: create_order_store_credit.result.order.locationId,
        referenceId: '',
        squareOrderId: create_order_store_credit.result.order.id,
        sourceId: 'CASH',
      });
      undoPaymentResponse = zero_payment;
      if (zero_payment.success) {
        const issue_credit_response = await this.storeCreditService.IssueCredit({
          addedBy: 'WARIO',
          amount: amount,
          creditType: StoreCreditType.MONEY,
          reason: `Refund for ${squareOrder.id as string}`,
          expiration: null,
          recipientEmail: customerInfo.email,
          recipientNameFirst: customerInfo.givenName,
          recipientNameLast: customerInfo.familyName,
        });
        undoPaymentResponse =
          issue_credit_response.status === 200
            ? { success: true, result: issue_credit_response, error: [] }
            : {
              success: false,
              result: null,
              error: [
                {
                  category: 'API_ERROR',
                  code: 'INTERNAL_SERVER_ERROR',
                  detail: 'Failed issuing store credit',
                },
              ],
            };
      }
    }
    return undoPaymentResponse;
  };

  /**
   * Refunds spent store credits after a failed order processing.
   */
  RefundStoreCreditDebits = async (spends: ValidateLockAndSpendSuccess[]) => {
    return Promise.all(
      spends.map(async (x) => {
        this.logger.info({ entry: x.entry }, 'Refunding store credit after failed processing');
        return this.storeCreditService.CheckAndRefundStoreCredit(x.entry, x.index);
      }),
    );
  };

  /**
   * Refunds completed Square payments.
   */
  RefundSquarePayments = async (payments: OrderPayment[], reason: string) => {
    return Promise.all(
      payments.flatMap((x) =>
        x.status === TenderBaseStatus.COMPLETED
          ? [this.squareService.RefundPayment(x.processorId, x.amount, reason)]
          : [],
      ),
    );
  };

  /**
   * Cancels authorized (but not yet captured) Square payments.
   */
  CancelSquarePayments = async (payments: OrderPaymentAllocated[]) => {
    return Promise.all(
      payments.flatMap((x) =>
        x.status === TenderBaseStatus.AUTHORIZED ? [this.squareService.CancelPayment(x.processorId)] : [],
      ),
    );
  };
}
