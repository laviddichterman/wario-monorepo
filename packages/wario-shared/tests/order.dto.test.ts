import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { IMoneyDto, TipSelectionAmountDto, TipSelectionPercentageDto } from '../src/lib/dto/common.dto';
import { WOrderInstancePartialDto } from '../src/lib/dto/order.dto';
import { CURRENCY, WFulfillmentStatus } from '../src/lib/enums';

type BaseOrderPayload = Omit<WOrderInstancePartialDto, 'tip'>;

const createBasePayload = (): BaseOrderPayload => ({
  customerInfo: {
    givenName: 'Ada',
    familyName: 'Lovelace',
    mobileNum: '555-0100',
    email: 'ada@example.com',
    referral: 'friend',
  },
  fulfillment: {
    selectedDate: '20240101',
    selectedTime: 1_700_000_000,
    status: WFulfillmentStatus.PROPOSED,
    selectedService: 'pickup',
  },
  cart: [
    {
      quantity: 1,
      product: {
        pid: 'prod_1',
        modifiers: [],
      },
      categoryId: 'cat_1',
    },
  ],
});

describe('WOrderInstancePartialDto tip discriminator', () => {
  it('uses TipSelectionPercentageDto when isPercentage is true', () => {
    const payload = {
      ...createBasePayload(),
      tip: {
        value: 20,
        isSuggestion: false,
        isPercentage: true,
      },
    } satisfies WOrderInstancePartialDto;

    const dto = plainToInstance(WOrderInstancePartialDto, payload);
    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.tip).toBeInstanceOf(TipSelectionPercentageDto);
  });

  it('uses TipSelectionAmountDto when isPercentage is false', () => {
    const payload = {
      ...createBasePayload(),
      tip: {
        value: {
          amount: 250,
          currency: CURRENCY.USD,
        },
        isSuggestion: true,
        isPercentage: false,
      },
    } satisfies WOrderInstancePartialDto;

    const dto = plainToInstance(WOrderInstancePartialDto, payload);
    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.tip).toBeInstanceOf(TipSelectionAmountDto);
    expect(dto.tip.value).toBeInstanceOf(IMoneyDto);
  });
});
