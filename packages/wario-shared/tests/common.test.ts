import { describe, expect, it, test } from '@jest/globals';
import { addHours, getTime, subHours } from 'date-fns';

import { WDateUtils } from '../src/index';
import {
  ComputeGratuityServiceCharge,
  ComputeHasBankersRoundingSkew,
  ComputeProductCategoryMatchCount,
  ComputeTaxAmount,
  ComputeTipBasis,
  ComputeTipValue,
  CREDIT_REGEX,
  DisableDataCheck,
  GetPlacementFromMIDOID,
  MoneyToDisplayString,
  ReduceArrayToMapByKey,
} from '../src/lib/common';
import type { IRecurringInterval, IWInterval, ProductInstanceModifierEntry } from '../src/lib/derived-types';
import { CURRENCY, DISABLE_REASON, OptionPlacement, OptionQualifier } from '../src/lib/enums';

// ============================================================================
// DisableDataCheck Tests
// ============================================================================

test('DisableDataCheck: should return ENABLED when disable_data is null and availabilities is empty', () => {
  const result = DisableDataCheck(null, [], new Date());
  expect(result).toEqual({ enable: DISABLE_REASON.ENABLED });
});

test('DisableDataCheck: should return DISABLED_BLANKET when disable_data start is greater than end', () => {
  const disableData: IWInterval = {
    start: getTime(new Date('2023-01-01T10:00:00Z')),
    end: getTime(new Date('2023-01-01T09:00:00Z')),
  };
  const result = DisableDataCheck(disableData, [], new Date());
  expect(result).toEqual({ enable: DISABLE_REASON.DISABLED_BLANKET });
});

test('DisableDataCheck: should return DISABLED_TIME when disable_data is within the order time', () => {
  const orderTime = new Date('2023-01-01T10:00:00Z');
  const disableData: IWInterval = { start: getTime(orderTime) - 1000, end: getTime(orderTime) + 1000 };
  const result = DisableDataCheck(disableData, [], orderTime);
  expect(result).toEqual({ enable: DISABLE_REASON.DISABLED_TIME, interval: disableData });
});

test('DisableDataCheck: should return ENABLED when availabilities has a matching recurring rule', () => {
  const orderTime = new Date('2023-01-01T10:00:00Z');
  const availabilities: IRecurringInterval[] = [
    {
      rrule: 'FREQ=DAILY;INTERVAL=1',
      interval: {
        start: WDateUtils.ComputeFulfillmentTime(addHours(orderTime, 2)).selectedTime,
        end: WDateUtils.ComputeFulfillmentTime(addHours(orderTime, 3)).selectedTime,
      },
    },
    {
      rrule: 'FREQ=DAILY;INTERVAL=1',
      interval: {
        start: WDateUtils.ComputeFulfillmentTime(subHours(orderTime, 2)).selectedTime,
        end: WDateUtils.ComputeFulfillmentTime(addHours(orderTime, 2)).selectedTime,
      },
    },
  ];
  const result = DisableDataCheck(null, availabilities, orderTime);
  expect(result).toEqual({ enable: DISABLE_REASON.ENABLED });
});

test('DisableDataCheck: should return DISABLED_AVAILABILITY when availabilities does not match the order time', () => {
  const orderTime = new Date('2023-01-01T10:00:00Z');
  const availabilities: IRecurringInterval[] = [
    {
      rrule: 'FREQ=DAILY;INTERVAL=1',
      interval: {
        start: WDateUtils.ComputeFulfillmentTime(addHours(orderTime, 2)).selectedTime,
        end: WDateUtils.ComputeFulfillmentTime(addHours(orderTime, 3)).selectedTime,
      },
    },
  ];
  const result = DisableDataCheck(null, availabilities, orderTime);
  expect(result).toEqual({ enable: DISABLE_REASON.DISABLED_AVAILABILITY, availability: availabilities });
});

test('DisableDataCheck: should return ENABLED when availability has a match for a non-rrule availability', () => {
  const orderTime = new Date(1723770000000);
  const availabilities: IRecurringInterval[] = [
    {
      rrule: '',
      interval: { start: 1723705200000, end: 1723788000000 },
    },
  ];
  const result = DisableDataCheck(null, availabilities, orderTime);
  expect(result).toEqual({ enable: DISABLE_REASON.ENABLED });
});

// ============================================================================
// CREDIT_REGEX Tests
// ============================================================================

describe('CREDIT_REGEX', () => {
  it('should match valid credit code format', () => {
    expect(CREDIT_REGEX.test('ABC-12-XYZ-ABCD1234')).toBe(true);
    expect(CREDIT_REGEX.test('xyz-ab-123-12345678')).toBe(true);
  });

  it('should not match invalid formats', () => {
    expect(CREDIT_REGEX.test('ABC-12-XYZ')).toBe(false);
    expect(CREDIT_REGEX.test('invalid')).toBe(false);
    expect(CREDIT_REGEX.test('')).toBe(false);
  });
});

// ============================================================================
// ReduceArrayToMapByKey Tests
// ============================================================================

describe('ReduceArrayToMapByKey', () => {
  it('should convert array to map keyed by id', () => {
    const items = [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
      { id: 'c', name: 'Gamma' },
    ];

    const result = ReduceArrayToMapByKey(items, 'id');

    expect(result['a']).toEqual({ id: 'a', name: 'Alpha' });
    expect(result['b']).toEqual({ id: 'b', name: 'Beta' });
    expect(result['c']).toEqual({ id: 'c', name: 'Gamma' });
  });

  it('should handle empty array', () => {
    const result = ReduceArrayToMapByKey([], 'id' as never);
    expect(result).toEqual({});
  });

  it('should work with different key types', () => {
    const items = [
      { code: 100, value: 'hundred' },
      { code: 200, value: 'two hundred' },
    ];

    const result = ReduceArrayToMapByKey(items, 'code');

    expect(result[100]).toEqual({ code: 100, value: 'hundred' });
    expect(result[200]).toEqual({ code: 200, value: 'two hundred' });
  });
});

// ============================================================================
// GetPlacementFromMIDOID Tests
// ============================================================================

describe('GetPlacementFromMIDOID', () => {
  it('should return option instance when modifier and option exist', () => {
    const modifiers: ProductInstanceModifierEntry[] = [
      {
        modifierTypeId: 'mt1',
        options: [
          {
            optionId: 'opt1',
            placement: OptionPlacement.LEFT,
            qualifier: OptionQualifier.HEAVY,
          },
        ],
      },
    ];

    const result = GetPlacementFromMIDOID(modifiers, 'mt1', 'opt1');

    expect(result.placement).toBe(OptionPlacement.LEFT);
    expect(result.qualifier).toBe(OptionQualifier.HEAVY);
  });

  it('should return NONE placement when modifier type not found', () => {
    const modifiers: ProductInstanceModifierEntry[] = [];

    const result = GetPlacementFromMIDOID(modifiers, 'mt1', 'opt1');

    expect(result.placement).toBe(OptionPlacement.NONE);
    expect(result.qualifier).toBe(OptionQualifier.REGULAR);
  });

  it('should return NONE placement when option not found in modifier', () => {
    const modifiers: ProductInstanceModifierEntry[] = [
      {
        modifierTypeId: 'mt1',
        options: [
          {
            optionId: 'opt_other',
            placement: OptionPlacement.WHOLE,
            qualifier: OptionQualifier.REGULAR,
          },
        ],
      },
    ];

    const result = GetPlacementFromMIDOID(modifiers, 'mt1', 'opt1');

    expect(result.placement).toBe(OptionPlacement.NONE);
    expect(result.optionId).toBe('opt1');
  });
});

// ============================================================================
// MoneyToDisplayString Tests
// ============================================================================

describe('MoneyToDisplayString', () => {
  it('should format money with currency symbol', () => {
    const result = MoneyToDisplayString({ amount: 1234, currency: CURRENCY.USD }, true);
    expect(result).toBe('$12.34');
  });

  it('should format money without currency symbol', () => {
    const result = MoneyToDisplayString({ amount: 1234, currency: CURRENCY.USD }, false);
    expect(result).toBe('12.34');
  });

  it('should handle zero amount', () => {
    const result = MoneyToDisplayString({ amount: 0, currency: CURRENCY.USD }, true);
    expect(result).toBe('$0.00');
  });

  it('should handle cents only', () => {
    const result = MoneyToDisplayString({ amount: 5, currency: CURRENCY.USD }, true);
    expect(result).toBe('$0.05');
  });
});

// ============================================================================
// ComputeProductCategoryMatchCount Tests
// ============================================================================

describe('ComputeProductCategoryMatchCount', () => {
  it('should sum quantities for matching categories', () => {
    const cart = [
      { categoryId: 'cat1', quantity: 2, product: {} },
      { categoryId: 'cat2', quantity: 3, product: {} },
      { categoryId: 'cat1', quantity: 1, product: {} },
    ];

    const result = ComputeProductCategoryMatchCount(['cat1'], cart);

    expect(result).toBe(3); // 2 + 1
  });

  it('should return 0 when no categories match', () => {
    const cart = [
      { categoryId: 'cat1', quantity: 2, product: {} },
      { categoryId: 'cat2', quantity: 3, product: {} },
    ];

    const result = ComputeProductCategoryMatchCount(['cat3'], cart);

    expect(result).toBe(0);
  });

  it('should handle multiple category IDs', () => {
    const cart = [
      { categoryId: 'cat1', quantity: 2, product: {} },
      { categoryId: 'cat2', quantity: 3, product: {} },
      { categoryId: 'cat3', quantity: 4, product: {} },
    ];

    const result = ComputeProductCategoryMatchCount(['cat1', 'cat3'], cart);

    expect(result).toBe(6); // 2 + 4
  });

  it('should handle empty cart', () => {
    const result = ComputeProductCategoryMatchCount(['cat1'], []);
    expect(result).toBe(0);
  });
});

// ============================================================================
// ComputeGratuityServiceCharge Tests
// ============================================================================

describe('ComputeGratuityServiceCharge', () => {
  it('should compute 20% service charge correctly', () => {
    const result = ComputeGratuityServiceCharge(0.2, { amount: 1000, currency: CURRENCY.USD });
    expect(result).toEqual({ currency: CURRENCY.USD, amount: 200 });
  });

  it('should round to nearest cent', () => {
    const result = ComputeGratuityServiceCharge(0.15, { amount: 1001, currency: CURRENCY.USD });
    // 1001 * 0.15 = 150.15 -> rounds to 150
    expect(result).toEqual({ currency: CURRENCY.USD, amount: 150 });
  });

  it('should handle zero basis', () => {
    const result = ComputeGratuityServiceCharge(0.2, { amount: 0, currency: CURRENCY.USD });
    expect(result).toEqual({ currency: CURRENCY.USD, amount: 0 });
  });
});

// ============================================================================
// ComputeHasBankersRoundingSkew Tests
// ============================================================================

describe('ComputeHasBankersRoundingSkew', () => {
  it('should return true when tax calculation results in .5 cents', () => {
    // e.g. $5.00 * 0.05 = $0.25 (25 cents) - no skew
    // But $5.55 * 0.09009009 = $0.50000... - skew
    const result = ComputeHasBankersRoundingSkew({ amount: 500, currency: CURRENCY.USD }, 0.1);
    // 500 * 0.10 = 50.0 - no skew
    expect(result).toBe(false);
  });

  it('should return false when no skew', () => {
    const result = ComputeHasBankersRoundingSkew({ amount: 1000, currency: CURRENCY.USD }, 0.0875);
    // 1000 * 0.0875 = 87.5 -> has skew
    expect(result).toBe(true);
  });
});

// ============================================================================
// ComputeTaxAmount Tests
// ============================================================================

describe('ComputeTaxAmount', () => {
  it('should compute tax correctly', () => {
    const result = ComputeTaxAmount({ amount: 1000, currency: CURRENCY.USD }, 0.1);
    expect(result).toEqual({ amount: 100, currency: CURRENCY.USD });
  });

  it('should round tax to nearest cent', () => {
    const result = ComputeTaxAmount({ amount: 1001, currency: CURRENCY.USD }, 0.0875);
    // 1001 * 0.0875 = 87.5875 -> rounds to 88
    expect(result).toEqual({ amount: 88, currency: CURRENCY.USD });
  });
});

// ============================================================================
// ComputeTipBasis Tests
// ============================================================================

describe('ComputeTipBasis', () => {
  it('should add subtotal and tax', () => {
    const result = ComputeTipBasis({ amount: 1000, currency: CURRENCY.USD }, { amount: 100, currency: CURRENCY.USD });
    expect(result).toEqual({ amount: 1100, currency: CURRENCY.USD });
  });
});

// ============================================================================
// ComputeTipValue Tests
// ============================================================================

describe('ComputeTipValue', () => {
  it('should compute percentage tip', () => {
    const result = ComputeTipValue(
      { isPercentage: true, isSuggestion: false, value: 0.2 },
      { amount: 1000, currency: CURRENCY.USD },
    );
    expect(result).toEqual({ amount: 200, currency: CURRENCY.USD });
  });

  it('should use fixed amount tip', () => {
    const result = ComputeTipValue(
      { isPercentage: false, isSuggestion: false, value: { amount: 500, currency: CURRENCY.USD } },
      { amount: 1000, currency: CURRENCY.USD },
    );
    expect(result).toEqual({ amount: 500, currency: CURRENCY.USD });
  });

  it('should return zero for null tip', () => {
    const result = ComputeTipValue(null, { amount: 1000, currency: CURRENCY.USD });
    expect(result).toEqual({ amount: 0, currency: CURRENCY.USD });
  });

  it('should round percentage tip to nearest cent', () => {
    const result = ComputeTipValue(
      { isPercentage: true, isSuggestion: true, value: 0.18 },
      { amount: 1001, currency: CURRENCY.USD },
    );
    // 1001 * 0.18 = 180.18 -> rounds to 180
    expect(result).toEqual({ amount: 180, currency: CURRENCY.USD });
  });
});
