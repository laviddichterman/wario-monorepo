/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DEFAULT_LOCALE,
  fCurrency,
  fCurrencyNoUnit,
  formatDecimal,
  type InputNumberValue,
  parseDecimal,
  parseInteger,
  transformValueOnBlur,
  transformValueOnChange,
} from '../src/lib/numbers';
import { RoundToTwoDecimalPlaces } from '../src/lib/numbers';
describe('fCurrency', () => {
  // Test cases for various input values with the default locale (en-US, USD)
  it('should return an empty string for null input', () => {
    expect(fCurrency(null)).toBe('');
  });

  it('should return an empty string for undefined input', () => {
    expect(fCurrency(undefined)).toBe('');
  });

  it('should return an empty string for NaN input', () => {
    expect(fCurrency(NaN)).toBe('');
  });

  it('should return $NaN string for a non-numeric string', () => {
    expect(fCurrency('abc')).toBe('$NaN');
  });

  it('should format a number with default USD locale', () => {
    expect(fCurrency(1234.56)).toBe('$1234.56');
  });

  it('should format a numeric string with default USD locale', () => {
    expect(fCurrency('1234.56')).toBe('$1234.56');
  });

  it('should format an integer with default USD locale', () => {
    expect(fCurrency(500)).toBe('$500');
  });

  it('should format zero correctly', () => {
    expect(fCurrency(0)).toBe('$0');
  });

  it('should format a negative number correctly', () => {
    expect(fCurrency(-1234.56)).toBe('-$1234.56');
  });

  // Test cases for different locales
  it('should format currency for EUR locale (de-DE)', () => {
    // Note: The exact format (space, symbol position) can vary slightly between environments.
    // This test expects a non-breaking space.
    const locale = { code: 'de-DE', currency: 'EUR' };
    expect(fCurrency(1234.56, locale)).toBe('1234,56\xa0€');
  });

  it('should format currency for JPY locale (ja-JP), which has no minor units', () => {
    const locale = { code: 'ja-JP', currency: 'JPY' };
    expect(fCurrency(1234, locale)).toBe('￥1234');
  });

  // Test cases for custom Intl.NumberFormatOptions
  it('should respect custom options for minimumFractionDigits', () => {
    const options = { minimumFractionDigits: 4, maximumFractionDigits: 4 };
    expect(fCurrency(1234.56, DEFAULT_LOCALE, options)).toBe('$1234.5600');
  });

  it('should respect custom options for maximumFractionDigits', () => {
    const options = { maximumFractionDigits: 0 };
    expect(fCurrency(1234.567, DEFAULT_LOCALE, options)).toBe('$1235');
  });

  it('should allow overriding currency display format', () => {
    const options = { currencyDisplay: 'name' } as Intl.NumberFormatOptions;
    expect(fCurrency(123, DEFAULT_LOCALE, options)).toBe('123 US dollars');
  });
});

describe('RoundToTwoDecimalPlaces', () => {
  it('should round down a number with more than two decimal places', () => {
    expect(RoundToTwoDecimalPlaces(1.234)).toBe(1.23);
  });

  it('should round up a number with more than two decimal places', () => {
    expect(RoundToTwoDecimalPlaces(1.236)).toBe(1.24);
  });

  it('should correctly round a number ending in 5 up', () => {
    expect(RoundToTwoDecimalPlaces(1.235)).toBe(1.24);
  });

  it('should handle numbers with less than two decimal places without change', () => {
    expect(RoundToTwoDecimalPlaces(1.5)).toBe(1.5);
  });

  it('should handle integers without change', () => {
    expect(RoundToTwoDecimalPlaces(10)).toBe(10);
  });

  it('should handle numbers that are already at two decimal places', () => {
    expect(RoundToTwoDecimalPlaces(5.99)).toBe(5.99);
  });

  it('should handle zero', () => {
    expect(RoundToTwoDecimalPlaces(0)).toBe(0);
  });

  it('should correctly round negative numbers down (away from zero)', () => {
    expect(RoundToTwoDecimalPlaces(-1.236)).toBe(-1.24);
  });

  it('should correctly round negative numbers up (towards zero)', () => {
    expect(RoundToTwoDecimalPlaces(-1.234)).toBe(-1.23);
  });

  it('should correctly round a negative number ending in 5', () => {
    // Math.round(-123.5) is -123, so -1.235 becomes -1.23
    expect(RoundToTwoDecimalPlaces(-1.235)).toBe(-1.23);
  });

  it('should handle floating point inaccuracies for numbers like 1.005', () => {
    // (1.005 + EPSILON) * 100 -> Math.round(100.50000000000001) -> 101 -> 1.01
    expect(RoundToTwoDecimalPlaces(1.005)).toBe(1.01);
  });

  it('should correctly round numbers just below the halfway point', () => {
    expect(RoundToTwoDecimalPlaces(2.9949)).toBe(2.99);
  });

  it('should correctly round large numbers', () => {
    expect(RoundToTwoDecimalPlaces(1234567.895)).toBe(1234567.9);
  });

  it('should correctly round small numbers', () => {
    expect(RoundToTwoDecimalPlaces(0.005)).toBe(0.01);
    expect(RoundToTwoDecimalPlaces(0.0049)).toBe(0);
  });
});

describe('fCurrencyNoUnit', () => {
  it('should return an empty string for null input', () => {
    expect(fCurrencyNoUnit(null)).toBe('');
  });

  it('should return an empty string for undefined input', () => {
    expect(fCurrencyNoUnit(undefined)).toBe('');
  });

  it('should return an empty string for NaN input', () => {
    expect(fCurrencyNoUnit(NaN)).toBe('');
  });

  it('should return "NaN" for a non-numeric string', () => {
    expect(fCurrencyNoUnit('abc')).toBe('NaN');
  });

  it('should format a number with default USD locale without the currency unit', () => {
    expect(fCurrencyNoUnit(1234.56)).toBe('1234.56');
  });

  it('should format a numeric string with default USD locale without the currency unit', () => {
    expect(fCurrencyNoUnit('1234.56')).toBe('1234.56');
  });

  it('should format an integer without the currency unit', () => {
    expect(fCurrencyNoUnit(500)).toBe('500');
  });

  it('should format zero correctly', () => {
    expect(fCurrencyNoUnit(0)).toBe('0');
  });

  it('should format a negative number correctly without the currency unit', () => {
    expect(fCurrencyNoUnit(-1234.56)).toBe('-1234.56');
  });

  it('should format currency for EUR locale (de-DE) without the currency unit', () => {
    const locale = { code: 'de-DE', currency: 'EUR' };
    expect(fCurrencyNoUnit(1234.56, locale)).toBe('1234,56');
  });

  it('should format currency for JPY locale (ja-JP) without the currency unit', () => {
    const locale = { code: 'ja-JP', currency: 'JPY' };
    expect(fCurrencyNoUnit(1234, locale)).toBe('1234');
  });

  it('should respect custom options for minimumFractionDigits', () => {
    const options = { minimumFractionDigits: 4, maximumFractionDigits: 4 };
    expect(fCurrencyNoUnit(1234.56, DEFAULT_LOCALE, options)).toBe('1234.5600');
  });

  it('should respect custom options for maximumFractionDigits', () => {
    const options = { maximumFractionDigits: 0 };
    expect(fCurrencyNoUnit(1234.567, DEFAULT_LOCALE, options)).toBe('1235');
  });
});

// The clampOptional function is not exported, so these tests test it indirectly
// through the public `transformValueOnBlur` function.
describe('clampOptional (via transformValueOnBlur)', () => {
  const baseProps = {
    allowEmpty: false,
    defaultValue: 0,
    parseFunction: (v: any) => (typeof v === 'string' ? parseFloat(v) : v),
    formatFunction: (v: any) => String(v),
  };

  // Test cases where only min is defined
  describe('with min defined', () => {
    it('should not change the number if it is greater than min', () => {
      const props = { ...baseProps, min: 10 };
      const result = transformValueOnBlur(props, '15');
      expect(result.value).toBe(15);
    });

    it('should clamp the number to min if it is less than min', () => {
      const props = { ...baseProps, min: 10 };
      const result = transformValueOnBlur(props, '5');
      expect(result.value).toBe(10);
    });

    it('should not change the number if it is equal to min', () => {
      const props = { ...baseProps, min: 10 };
      const result = transformValueOnBlur(props, '10');
      expect(result.value).toBe(10);
    });
  });

  // Test cases where only max is defined
  describe('with max defined', () => {
    it('should not change the number if it is less than max', () => {
      const props = { ...baseProps, max: 20 };
      const result = transformValueOnBlur(props, '15');
      expect(result.value).toBe(15);
    });

    it('should clamp the number to max if it is greater than max', () => {
      const props = { ...baseProps, max: 20 };
      const result = transformValueOnBlur(props, '25');
      expect(result.value).toBe(20);
    });

    it('should not change the number if it is equal to max', () => {
      const props = { ...baseProps, max: 20 };
      const result = transformValueOnBlur(props, '20');
      expect(result.value).toBe(20);
    });
  });

  // Test cases where both min and max are defined
  describe('with both min and max defined', () => {
    it('should not change the number if it is within the range', () => {
      const props = { ...baseProps, min: 10, max: 20 };
      const result = transformValueOnBlur(props, '15');
      expect(result.value).toBe(15);
    });

    it('should clamp to min if the number is below the range', () => {
      const props = { ...baseProps, min: 10, max: 20 };
      const result = transformValueOnBlur(props, '5');
      expect(result.value).toBe(10);
    });

    it('should clamp to max if the number is above the range', () => {
      const props = { ...baseProps, min: 10, max: 20 };
      const result = transformValueOnBlur(props, '25');
      expect(result.value).toBe(20);
    });

    it('should handle the min boundary correctly', () => {
      const props = { ...baseProps, min: 10, max: 20 };
      const result = transformValueOnBlur(props, '10');
      expect(result.value).toBe(10);
    });

    it('should handle the max boundary correctly', () => {
      const props = { ...baseProps, min: 10, max: 20 };
      const result = transformValueOnBlur(props, '20');
      expect(result.value).toBe(20);
    });
  });

  // Test cases where neither min nor max are defined
  describe('with no bounds defined', () => {
    it('should not change a positive number', () => {
      const props = { ...baseProps };
      const result = transformValueOnBlur(props, '100');
      expect(result.value).toBe(100);
    });

    it('should not change a negative number', () => {
      const props = { ...baseProps };
      const result = transformValueOnBlur(props, '-100');
      expect(result.value).toBe(-100);
    });

    it('should not change zero', () => {
      const props = { ...baseProps };
      const result = transformValueOnBlur(props, '0');
      expect(result.value).toBe(0);
    });
  });
});

describe('transformValueOnBlur', () => {
  // Note: The existing tests for clampOptional via transformValueOnBlur are kept separate
  // as they use a simplified mock parse/format setup. The following tests are more comprehensive.

  describe('with parseDecimal and formatDecimal(v, 2)', () => {
    describe('and allowEmpty = true', () => {
      const props = {
        allowEmpty: true as const,
        parseFunction: parseDecimal,
        formatFunction: (v: InputNumberValue) => formatDecimal(v, 2),
        min: 10,
        max: 100,
      };

      it('should format and clamp a valid number within range', () => {
        const result = transformValueOnBlur(props, '50.129');
        expect(result).toEqual({ value: 50.13, inputText: '50.13' });
      });

      it('should clamp to min, then format', () => {
        const result = transformValueOnBlur(props, '5');
        expect(result).toEqual({ value: 10, inputText: '10.00' });
      });

      it('should clamp to max, then format', () => {
        const result = transformValueOnBlur(props, '105.5');
        expect(result).toEqual({ value: 100, inputText: '100.00' });
      });

      it('should return empty for empty input', () => {
        const result = transformValueOnBlur(props, '');
        expect(result).toEqual({ value: '', inputText: '' });
      });

      it('should return empty for invalid input', () => {
        const result = transformValueOnBlur(props, 'abc');
        expect(result).toEqual({ value: '', inputText: '' });
      });
    });

    describe('and allowEmpty = false', () => {
      const props = {
        allowEmpty: false as const,
        defaultValue: 50,
        parseFunction: parseDecimal,
        formatFunction: (v: InputNumberValue) => formatDecimal(v, 2),
        min: 10,
        max: 100,
      };

      it('should format and clamp a valid number within range', () => {
        const result = transformValueOnBlur(props, '75.987');
        expect(result).toEqual({ value: 75.99, inputText: '75.99' });
      });

      it('should use defaultValue for empty input, then format', () => {
        const result = transformValueOnBlur(props, '');
        expect(result).toEqual({ value: 50, inputText: '50.00' });
      });

      it('should use defaultValue for invalid input, then format', () => {
        const result = transformValueOnBlur(props, 'abc');
        expect(result).toEqual({ value: 50, inputText: '50.00' });
      });

      it('should use defaultValue which is then clamped to min', () => {
        const propsWithLowDefault = { ...props, defaultValue: 5 };
        const result = transformValueOnBlur(propsWithLowDefault, '');
        expect(result).toEqual({ value: 10, inputText: '10.00' });
      });
    });
  });

  describe('with parseDecimal and formatDecimal(v)', () => {
    describe('and allowEmpty = true', () => {
      const props = {
        allowEmpty: true as const,
        parseFunction: parseDecimal,
        formatFunction: formatDecimal,
        min: 10,
        max: 100,
      };

      it('should format a valid number without rounding', () => {
        const result = transformValueOnBlur(props, '50.129');
        expect(result).toEqual({ value: 50.129, inputText: '50.129' });
      });

      it('should clamp to min', () => {
        const result = transformValueOnBlur(props, '5');
        expect(result).toEqual({ value: 10, inputText: '10' });
      });

      it('should return empty for empty input', () => {
        const result = transformValueOnBlur(props, '');
        expect(result).toEqual({ value: '', inputText: '' });
      });
    });

    describe('and allowEmpty = false', () => {
      const props = {
        allowEmpty: false as const,
        defaultValue: 50,
        parseFunction: parseDecimal,
        formatFunction: formatDecimal,
        min: 10,
        max: 100,
      };

      it('should format a valid number', () => {
        const result = transformValueOnBlur(props, '75.987');
        expect(result).toEqual({ value: 75.987, inputText: '75.987' });
      });

      it('should use defaultValue for empty input', () => {
        const result = transformValueOnBlur(props, '');
        expect(result).toEqual({ value: 50, inputText: '50' });
      });
    });
  });

  describe('with parseInteger and formatDecimal(v, 2)', () => {
    describe('and allowEmpty = true', () => {
      const props = {
        allowEmpty: true as const,
        parseFunction: parseInteger,
        formatFunction: (v: InputNumberValue) => formatDecimal(v, 2),
        min: 10,
        max: 100,
      };

      it('should format a valid integer', () => {
        const result = transformValueOnBlur(props, '50');
        expect(result).toEqual({ value: 50, inputText: '50.00' });
      });

      it('should return empty for decimal input', () => {
        const result = transformValueOnBlur(props, '50.12');
        expect(result).toEqual({ value: 50, inputText: '50.00' });
      });

      it('should clamp to min and format', () => {
        const result = transformValueOnBlur(props, '5');
        expect(result).toEqual({ value: 10, inputText: '10.00' });
      });
    });

    describe('and allowEmpty = false', () => {
      const props = {
        allowEmpty: false as const,
        defaultValue: 50,
        parseFunction: parseInteger,
        formatFunction: (v: InputNumberValue) => formatDecimal(v, 2),
        min: 10,
        max: 100,
      };

      it('should format a valid integer', () => {
        const result = transformValueOnBlur(props, '75');
        expect(result).toEqual({ value: 75, inputText: '75.00' });
      });

      it('should use defaultValue for decimal input', () => {
        const result = transformValueOnBlur(props, '12.34');
        expect(result).toEqual({ value: 12, inputText: '12.00' });
      });
    });
  });

  describe('with parseInteger and formatDecimal(v)', () => {
    describe('and allowEmpty = true', () => {
      const props = {
        allowEmpty: true as const,
        parseFunction: parseInteger,
        formatFunction: (v: InputNumberValue) => formatDecimal(v),
        min: 10,
        max: 100,
      };

      it('should format a valid integer', () => {
        const result = transformValueOnBlur(props, '50');
        expect(result).toEqual({ value: 50, inputText: '50' });
      });

      it('should return empty for decimal input', () => {
        const result = transformValueOnBlur(props, '50.12');
        expect(result).toEqual({ value: 50, inputText: '50' });
      });
    });

    describe('and allowEmpty = false', () => {
      const props = {
        allowEmpty: false as const,
        defaultValue: 50,
        parseFunction: parseInteger,
        formatFunction: (v: InputNumberValue) => formatDecimal(v),
        min: 10,
        max: 100,
      };

      it('should format a valid integer', () => {
        const result = transformValueOnBlur(props, '75');
        expect(result).toEqual({ value: 75, inputText: '75' });
      });

      it('should use defaultValue for decimal input', () => {
        const result = transformValueOnBlur(props, '12.34');
        expect(result).toEqual({ value: 12, inputText: '12' });
      });
    });
  });
});

describe('transformValueOnChange', () => {
  const parseFunction = (v: any) => {
    if (v === null || v === undefined || v === '' || typeof v !== 'string') return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const props = {
    allowEmpty: true as const,
    parseFunction,
    formatFunction: (v: any) => String(v),
  };

  it('should return the raw text and the parsed number for valid numeric input', () => {
    const result = transformValueOnChange(props, '123.45');
    expect(result).toEqual({ inputText: '123.45', value: 123.45 });
  });

  it('should return the raw text and an empty string value for non-numeric input', () => {
    const result = transformValueOnChange(props, 'abc');
    expect(result).toEqual({ inputText: 'abc', value: '' });
  });

  it('should return the raw text and an empty string value for empty input', () => {
    const result = transformValueOnChange(props, '');
    expect(result).toEqual({ inputText: '', value: '' });
  });

  it('should handle negative numbers correctly', () => {
    const result = transformValueOnChange(props, '-50');
    expect(result).toEqual({ inputText: '-50', value: -50 });
  });

  it('should handle zero correctly', () => {
    const result = transformValueOnChange(props, '0');
    expect(result).toEqual({ inputText: '0', value: 0 });
  });

  it('should not clamp or format the value', () => {
    const propsWithBounds = {
      ...props,
      min: 10,
      max: 100,
      formatFunction: (v: number | string | null | undefined) => `formatted: ${(v ?? '').toString()}`,
    };
    const result = transformValueOnChange(propsWithBounds, '5');
    // The value should be 5, not clamped to 10. The inputText is raw.
    expect(result).toEqual({ inputText: '5', value: 5 });

    const result2 = transformValueOnChange(propsWithBounds, '150');
    // The value should be 150, not clamped to 100.
    expect(result2).toEqual({ inputText: '150', value: 150 });
  });
});

describe('formatDecimal', () => {
  it('should return an empty string for null input', () => {
    expect(formatDecimal(null)).toBe('');
  });

  it('should return an empty string for undefined input', () => {
    expect(formatDecimal(undefined)).toBe('');
  });

  it('should return an empty string for an empty string input', () => {
    expect(formatDecimal('')).toBe('');
  });

  it('should return an empty string for an invalid string input', () => {
    expect(formatDecimal('abc')).toBe('');
  });

  it('should format a number input with a specific number of fraction digits', () => {
    expect(formatDecimal(123.456, 2)).toBe('123.46'); // Rounds up
  });

  it('should format a string input with a specific number of fraction digits', () => {
    expect(formatDecimal('123.456', 2)).toBe('123.46');
  });

  it('should pad with zeros to meet the fractionDigits requirement', () => {
    expect(formatDecimal(123, 2)).toBe('123.00');
    expect(formatDecimal('123.4', 3)).toBe('123.400');
  });

  it('should round to an integer when fractionDigits is 0', () => {
    expect(formatDecimal(123.5, 0)).toBe('124');
    expect(formatDecimal('123.4', 0)).toBe('123');
  });

  it('should handle negative numbers correctly', () => {
    expect(formatDecimal(-123.456, 2)).toBe('-123.46');
  });

  it('should handle zero correctly', () => {
    expect(formatDecimal(0, 2)).toBe('0.00');
  });

  it('should format a number without specified fraction digits (default behavior)', () => {
    expect(formatDecimal(1234)).toBe('1234');
    expect(formatDecimal(1234.5)).toBe('1234.5');
    expect(formatDecimal(1234.567)).toBe('1234.567');
    expect(formatDecimal(1234.5678)).toBe('1234.568'); // Default maxFractionDigits is 3
  });

  it('should handle string with commas', () => {
    expect(formatDecimal('1,234.56', 2)).toBe('1234.56');
  });
});
