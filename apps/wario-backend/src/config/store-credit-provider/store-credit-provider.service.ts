import { Stream } from 'stream';

import { Injectable, Logger } from '@nestjs/common';
import { format, isBefore, isValid, parseISO, startOfDay } from 'date-fns';
import qrcode from 'qrcode';
import voucher_codes from 'voucher-code-generator';

import {
  CURRENCY,
  IMoney,
  IssueStoreCreditRequest,
  MoneyToDisplayString,
  PaymentMethod,
  PurchaseStoreCreditRequest,
  PurchaseStoreCreditRequestSendEmail,
  PurchaseStoreCreditResponse,
  StoreCreditType,
  ValidateAndLockCreditResponse,
  ValidateLockAndSpendRequest,
  ValidateLockAndSpendSuccess,
  WDateUtils,
} from '@wcp/wario-shared';

import aes256gcm from '../crypto-aes-256-gcm';
import { DataProviderService } from '../data-provider/data-provider.service';
import { GoogleService } from '../google/google.service';
import { CreateOrderStoreCredit } from '../square-wario-bridge';
import { SquareService } from '../square/square.service';

const ACTIVE_SHEET = 'CurrentWARIO';
const ACTIVE_RANGE = `${ACTIVE_SHEET}!A2:M`;

@Injectable()
export class StoreCreditProviderService {
  private readonly logger = new Logger(StoreCreditProviderService.name);

  constructor(
    private readonly googleService: GoogleService,
    private readonly squareService: SquareService,
    private readonly dataProviderService: DataProviderService,
  ) { }

  GenerateCreditCode = () => {
    const reference_id = Date.now().toString(36).toUpperCase();
    const credit_code = voucher_codes.generate({ pattern: '###-##-###' })[0];
    const joint_credit_code = `${credit_code}-${reference_id}`;
    return joint_credit_code;
  };

  GenerateQRCodeFS = async (code: string) => {
    const qr_code_fs = new Stream.PassThrough();
    await qrcode.toFileStream(qr_code_fs, code, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 300,
      margin: 1,
    });
    return qr_code_fs;
  };

  private CreateExternalEmailSender = async (
    {
      amount,
      senderEmail,
      recipientNameFirst,
      recipientNameLast,
    }: Pick<PurchaseStoreCreditRequest, 'amount' | 'senderEmail' | 'recipientNameFirst' | 'recipientNameLast'>,
    creditCode: string,
    qr_code_fs: Stream.PassThrough,
  ) => {
    const EMAIL_ADDRESS = this.dataProviderService.KeyValueConfig.EMAIL_ADDRESS;
    const STORE_NAME = this.dataProviderService.KeyValueConfig.STORE_NAME;
    const amountString = MoneyToDisplayString(amount, true);
    const recipient = `${recipientNameFirst} ${recipientNameLast}`;
    const emailbody = `<h2>Thanks for thinking of Windy City Pie for someone close to you!</h2>
  <p>We're happy to acknowledge that we've received a payment of ${amountString} for ${recipient}'s store credit. <br />
  This gift of store credit never expires.<br />
  Store credit can be used when paying online on our website by copy/pasting the code below or in person using the QR code below. We'll take care of the rest!</p>
  <p>Give ${recipientNameFirst} this store credit code: <strong>${creditCode}</strong> and this QR code: <br/> <img src="cid:${creditCode}" /></p>
  <p>Keep this email in your records and let us know if you have any questions!</p>`;
    return await this.googleService.SendEmail(
      {
        name: STORE_NAME,
        address: EMAIL_ADDRESS,
      },
      senderEmail,
      `Store credit purchase of value ${amountString} for ${recipient}.`,
      EMAIL_ADDRESS,
      emailbody,
      [{ filename: 'qrcode.png', content: qr_code_fs, cid: creditCode }],
    );
  };

  private CreateExternalEmailRecipient = async (
    {
      amount,
      senderName,
      recipientNameFirst,
      recipientNameLast,
      recipientEmail,
      recipientMessage,
    }: PurchaseStoreCreditRequestSendEmail,
    creditCode: string,
    qr_code_fs: Stream.PassThrough,
  ) => {
    const EMAIL_ADDRESS = this.dataProviderService.KeyValueConfig.EMAIL_ADDRESS;
    const STORE_NAME = this.dataProviderService.KeyValueConfig.STORE_NAME;
    const amountString = MoneyToDisplayString(amount, true);
    const recipient = `${recipientNameFirst} ${recipientNameLast}`;
    const sender_message =
      recipientMessage && recipientMessage.length > 0
        ? `<p><h3>${senderName} wanted us to relay the following to you:</h3><em>${recipientMessage}</em></p>`
        : '';
    const emailbody = `<h2>Hey ${recipientNameFirst}, ${senderName} sent you some digital pizza!</h2>
  <p>This gift of store credit never expires and is valid at Windy City Pie.<br />
  Store credit can be used when paying online on our website by copy/pasting the code below into the "Use Digital Gift Card / Store Credit" field or, in person by showing the QR code at the bottom of this email. We'll take care of the rest!</p>
  <p>Credit code: <strong>${creditCode}</strong> valuing <strong>${amountString}</strong> for ${recipient}.<br />Keep this email in your records and let us know if you have any questions!</p>  ${sender_message}
  <p>QR code for in-person redemption: <br/> <img src="cid:${creditCode}" /></p>`;
    return await this.googleService.SendEmail(
      {
        name: STORE_NAME,
        address: EMAIL_ADDRESS,
      },
      recipientEmail,
      `${recipientNameFirst}, you've got store credit to Windy City Pie!`,
      EMAIL_ADDRESS,
      emailbody,
      [{ filename: 'qrcode.png', content: qr_code_fs, cid: creditCode }],
    );
  };

  private CreateExternalEmail = async (
    { amount, recipientNameFirst, recipientNameLast, recipientEmail, expiration, creditType }: IssueStoreCreditRequest,
    creditCode: string,
    qr_code_fs: Stream.PassThrough,
  ) => {
    const EMAIL_ADDRESS = this.dataProviderService.KeyValueConfig.EMAIL_ADDRESS;
    const STORE_NAME = this.dataProviderService.KeyValueConfig.STORE_NAME;
    const amountString = MoneyToDisplayString(amount, true);
    const recipient = `${recipientNameFirst} ${recipientNameLast}`;
    const creditTypeString = creditType === StoreCreditType.DISCOUNT ? 'discount' : 'digital gift';
    const expiration_section = expiration
      ? `<br />Please note that this credit will expire at 11:59PM on ${format(parseISO(expiration), WDateUtils.ServiceDateDisplayFormat)}.`
      : '';
    const emailbody = `<h2>You've been sent a ${creditTypeString} code from ${STORE_NAME}!</h2>
  <p>Credit code: <strong>${creditCode}</strong> valuing <strong>${amountString}</strong> for ${recipient}.<br />
  <p>Use this ${creditTypeString} code when ordering online or in person at Windy City Pie.${expiration_section}</p><br />
  Keep this email in your records and let us know if you have any questions!</p>
  <p>Copy and paste the code above into the "Use Digital Gift Card / Store Credit" field when paying online or, if redeeming in person, show this QR code:<br/> <img src="cid:${creditCode}" /></p>`;
    await this.googleService.SendEmail(
      {
        name: STORE_NAME,
        address: EMAIL_ADDRESS,
      },
      recipientEmail,
      `${STORE_NAME} ${creditTypeString} code of value ${amountString} for ${recipient}.`,
      EMAIL_ADDRESS,
      emailbody,
      [{ filename: 'qrcode.png', content: qr_code_fs, cid: creditCode }],
    );
  };

  CreateCreditFromCreditCode = async ({
    recipientNameFirst,
    recipientNameLast,
    amount,
    creditType,
    creditCode,
    expiration,
    addedBy,
    reason,
  }: Omit<IssueStoreCreditRequest, 'recipientEmail'> & {
    creditCode: string;
  }) => {
    const date_added = WDateUtils.formatISODate(Date.now());
    const amountString = (amount.amount / 100).toFixed(2);
    const recipient = `${recipientNameFirst} ${recipientNameLast}`;
    const fields = [
      recipient,
      amountString,
      creditType,
      amountString,
      date_added,
      addedBy,
      date_added,
      creditCode,
      expiration,
      reason,
      '',
      '',
      '',
    ];
    return await this.googleService.AppendToSheet(
      this.dataProviderService.KeyValueConfig.STORE_CREDIT_SHEET,
      `${ACTIVE_SHEET}!A1:M1`,
      fields,
    );
  };

  ValidateAndLockCode = async (credit_code: string): Promise<ValidateAndLockCreditResponse> => {
    const values_promise = this.googleService.GetValuesFromSheet(
      this.dataProviderService.KeyValueConfig.STORE_CREDIT_SHEET,
      ACTIVE_RANGE,
    );
    const lock = aes256gcm.encrypt(credit_code);
    const ivAsString = lock.iv.toString('hex');
    const authAsString = lock.auth.toString('hex');
    const values = await values_promise;
    const i = values.values!.findIndex((x: string[]) => x[7] === credit_code);
    if (i === -1) {
      return { valid: false };
    }
    const entry = values.values![i];
    const date_modified = WDateUtils.formatISODate(Date.now());
    const new_entry = [
      entry[0],
      entry[1],
      entry[2],
      entry[3],
      entry[4],
      entry[5],
      date_modified,
      entry[7],
      entry[8],
      entry[9],
      lock.enc,
      ivAsString,
      authAsString,
    ];
    const new_range = `${ACTIVE_SHEET}!${(2 + i).toString()}:${(2 + i).toString()}`;
    const update_promise = this.googleService.UpdateValuesInSheet(
      this.dataProviderService.KeyValueConfig.STORE_CREDIT_SHEET,
      new_range,
      new_entry,
    );
    const expiration = entry[8] ? startOfDay(parseISO(String(entry[8]))) : null;
    await update_promise;
    const balance = Math.round(Number(entry[3]) * 100);
    const valid = expiration === null || !isValid(expiration) || !isBefore(expiration, startOfDay(Date.now()));
    return valid
      ? {
        valid: true,
        credit_type: StoreCreditType[entry[2] as keyof typeof StoreCreditType],
        lock: { enc: lock.enc, iv: ivAsString, auth: authAsString },
        amount: { amount: balance, currency: CURRENCY.USD },
      }
      : { valid: false };
  };

  ValidateLockAndSpend = async ({
    amount,
    code,
    lock,
    updatedBy,
  }: ValidateLockAndSpendRequest): Promise<{ success: false } | ValidateLockAndSpendSuccess> => {
    const beginningOfToday = startOfDay(Date.now());
    const values = await this.googleService.GetValuesFromSheet(
      this.dataProviderService.KeyValueConfig.STORE_CREDIT_SHEET,
      ACTIVE_RANGE,
    );
    for (let i = 0; i < values.values!.length; ++i) {
      const entry = values.values![i];
      if (entry[7] == code) {
        const credit_balance = Math.round(Number(entry[3]) * 100);
        if (amount.amount > credit_balance) {
          this.logger.error(
            `We have a cheater folks, store credit key ${String(entry[7])}, attempted to use ${MoneyToDisplayString(amount, true)} but had balance ${credit_balance}`,
          );
          return { success: false };
        }
        if ((entry[10] != lock.enc || entry[11] != lock.iv || entry[12] != lock.auth)) {
          this.logger.error(
            `WE HAVE A CHEATER FOLKS, store credit key ${String(entry[7])}, expecting encoded: ${JSON.stringify(lock)}.`,
          );
          return { success: false };
        }
        if (entry[8]) {
          const expiration = startOfDay(parseISO(String(entry[8])));
          if (isBefore(expiration, beginningOfToday)) {
            this.logger.error(
              `We have a cheater folks, store credit key ${String(entry[7])}, attempted to use after expiration of ${String(entry[8])}.`,
            );
            return { success: false };
          }
        }

        const date_modified = WDateUtils.formatISODate(beginningOfToday);
        const new_balance = ((credit_balance - amount.amount) / 100).toFixed(2);
        const new_entry = [
          entry[0],
          entry[1],
          entry[2],
          new_balance,
          entry[4],
          updatedBy,
          date_modified,
          entry[7],
          entry[8],
          entry[9],
          entry[10],
          entry[11],
          entry[12],
        ];
        const new_range = `${ACTIVE_SHEET}!${(2 + i).toString()}:${(2 + i).toString()}`;
        await this.googleService.UpdateValuesInSheet(
          this.dataProviderService.KeyValueConfig.STORE_CREDIT_SHEET,
          new_range,
          new_entry,
        );
        this.logger.log(
          `Debited ${MoneyToDisplayString(amount, true)} from code ${code} yielding balance of ${new_balance}.`,
        );
        return { success: true, entry: entry, index: i };
      }
    }
    this.logger.error(`Not sure how, but the store credit key wasn't found: ${code}`);
    return { success: false };
  };

  CheckAndRefundStoreCredit = async (old_entry: unknown[], index: number) => {
    const new_range = `${ACTIVE_SHEET}!${(2 + index).toString()}:${(2 + index).toString()}`;
    await this.googleService.UpdateValuesInSheet(
      this.dataProviderService.KeyValueConfig.STORE_CREDIT_SHEET,
      new_range,
      old_entry,
    );
    return true;
  };

  RefundStoreCredit = async (
    code: string,
    amount: IMoney,
    updatedBy: string,
  ): Promise<{ success: false } | ValidateLockAndSpendSuccess> => {
    const beginningOfToday = startOfDay(Date.now());
    const values = await this.googleService.GetValuesFromSheet(
      this.dataProviderService.KeyValueConfig.STORE_CREDIT_SHEET,
      ACTIVE_RANGE,
    );
    const creditCodeIndex = values.values!.findIndex((x) => x[7] == code);
    if (creditCodeIndex !== -1) {
      const entry = values.values![creditCodeIndex];
      const credit_balance = Math.round(Number(entry[3]) * 100);
      const newBalance = ((credit_balance + amount.amount) / 100).toFixed(2);
      const lock = aes256gcm.encrypt(code);
      const newLockAsString = {
        enc: lock.enc,
        auth: lock.auth.toString('hex'),
        iv: lock.iv.toString('hex'),
      };
      const date_modified = WDateUtils.formatISODate(beginningOfToday);
      const new_entry = [
        entry[0],
        entry[1],
        entry[2],
        newBalance,
        entry[4],
        updatedBy,
        date_modified,
        entry[7],
        entry[8],
        entry[9],
        newLockAsString.enc,
        newLockAsString.iv,
        newLockAsString.auth,
      ];
      const new_range = `${ACTIVE_SHEET}!${(2 + creditCodeIndex).toString()}:${(2 + creditCodeIndex).toString()}`;
      try {
        await this.googleService.UpdateValuesInSheet(
          this.dataProviderService.KeyValueConfig.STORE_CREDIT_SHEET,
          new_range,
          new_entry,
        );
        this.logger.log(
          `Refunded ${MoneyToDisplayString(amount, true)} to code ${code} yielding balance of ${newBalance}.`,
        );
        return { success: true, entry: new_entry, index: creditCodeIndex };
      } catch (err) {
        this.logger.error(
          `Failed to refund ${MoneyToDisplayString(amount, true)} to code ${code}, error: ${JSON.stringify(err)}`,
        );
        return { success: false };
      }
    } else {
      this.logger.error(`Not sure how, but the store credit key wasn't found: ${code}`);
      return { success: false };
    }
  };

  IssueCredit = async (request: IssueStoreCreditRequest): Promise<{ credit_code: string; status: number }> => {
    const amountAsString = MoneyToDisplayString(request.amount, true);
    const creditCode = this.GenerateCreditCode();
    const qr_code_fs = await this.GenerateQRCodeFS(creditCode);
    await this.CreateCreditFromCreditCode({ ...request, creditCode });
    await this.CreateExternalEmail(request, creditCode, qr_code_fs);
    this.logger.log(
      `Store credit code: ${creditCode} of type ${request.creditType} for ${amountAsString} added by ${request.addedBy} for reason: ${request.reason}.`,
    );
    return { credit_code: creditCode, status: 200 };
  };

  PurchaseStoreCredit = async (
    request: PurchaseStoreCreditRequest,
    nonce: string,
  ): Promise<PurchaseStoreCreditResponse & { status: number }> => {
    const referenceId = Date.now().toString(36).toUpperCase();

    const amountString = MoneyToDisplayString(request.amount, true);
    const creditCode = this.GenerateCreditCode();
    const qr_code_fs = await this.GenerateQRCodeFS(creditCode);
    const qr_code_fs_a = new Stream.PassThrough();
    const qr_code_fs_b = new Stream.PassThrough();
    qr_code_fs.pipe(qr_code_fs_a);
    qr_code_fs.pipe(qr_code_fs_b);

    const create_order_response = await this.squareService.CreateOrder(
      CreateOrderStoreCredit(
        this.dataProviderService.KeyValueConfig.SQUARE_LOCATION,
        referenceId,
        request.amount,
        `Purchase of store credit code: ${creditCode}`,
      ),
    );
    if (create_order_response.success && create_order_response.result.order) {
      const squareOrder = create_order_response.result.order;
      let squareOrderVersion = squareOrder.version as number;
      const squareOrderId = squareOrder.id as string;
      this.logger.log(`For internal id ${referenceId} created Square Order ID: ${squareOrderId} for ${amountString}`);
      const payment_response = await this.squareService.ProcessPayment({
        locationId: this.dataProviderService.KeyValueConfig.SQUARE_LOCATION,
        sourceId: nonce,
        amount: request.amount,
        referenceId,
        squareOrderId,
      });
      ++squareOrderVersion;
      if (payment_response.success && payment_response.result.t === PaymentMethod.CreditCard) {
        const orderPayment = payment_response.result;
        await this.CreateExternalEmailSender(request, creditCode, qr_code_fs_a);
        if (request.sendEmailToRecipient) {
          await this.CreateExternalEmailRecipient(request, creditCode, qr_code_fs_b);
        }
        return await this.CreateCreditFromCreditCode({
          ...request,
          addedBy: 'WARIO',
          reason: 'website purchase',
          creditType: StoreCreditType.MONEY,
          creditCode,
          expiration: null,
        }).then((_) => {
          this.logger.log(
            `Store credit code: ${creditCode} and Square Order ID: ${squareOrderId} payment for ${amountString} successful, credit logged to spreadsheet.`,
          );
          return {
            status: 200,
            error: [],
            result: {
              referenceId,
              code: creditCode,
              squareOrderId: squareOrderId,
              amount: orderPayment.amount,
              last4: orderPayment.payment.last4,
              receiptUrl: orderPayment.payment.receiptUrl,
            },
            success: true,
          };
        });
        // TODO: figure out why this has a type error
        // TODO2: figure out if this is actually needed
        // .catch(async (err: any) => {
        //   const errorDetail = `Failed to create credit code, got error: ${JSON.stringify(err)}`;
        //   logger.error(errorDetail);
        //   await SquareProviderInstance.RefundPayment(orderPayment, "Failed to create credit code");
        //   return { status: 500, success: false, result: null, error: [] };
        // });
      } else {
        this.logger.error('Failed to process payment: %o', payment_response);
        await this.squareService.OrderStateChange(
          this.dataProviderService.KeyValueConfig.SQUARE_LOCATION,
          squareOrderId,
          squareOrderVersion,
          'CANCELED',
        );

        return {
          status: 400,
          success: false,
          error: payment_response.error.map((x) => ({
            category: x.category,
            code: x.code,
            detail: x.detail as string,
          })),
        };
      }
    } else {
      const errorDetail = JSON.stringify(create_order_response);
      this.logger.error(errorDetail);
      return {
        status: 500,
        success: false,
        error: [
          {
            category: 'INTERNAL_SERVER_ERROR',
            code: 'INTERNAL_SERVER_ERROR',
            detail: errorDetail,
          },
        ],
      };
    }
  };
}
