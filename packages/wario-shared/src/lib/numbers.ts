/**
 * RoundToTwoDecimalPlaces
 *
 * Round a numeric value to two decimal places in a stable manner using Number.EPSILON.
 *
 * @param number - numeric input
 * @returns number - value rounded to two decimal places
 */
export function RoundToTwoDecimalPlaces(number: number) {
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

export type InputNumberValue = string | number | null | undefined;

export const DEFAULT_LOCALE = { code: 'en-US', currency: 'USD' };
export type Locale = typeof DEFAULT_LOCALE;

export function processInputNumber(inputValue: InputNumberValue): number | null {
  if (inputValue == null || Number.isNaN(inputValue)) return null;
  return Number(inputValue);
}

function buildFormatter(locale: Locale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale.code, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  });
}

export function fNumber(
  inputValue: InputNumberValue,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
) {
  const number = processInputNumber(inputValue);
  if (number === null) return '';

  const fm = buildFormatter(locale, options).format(number);
  return fm;
}

export function fCurrency(
  inputValue: InputNumberValue,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
) {
  const number = processInputNumber(inputValue);
  if (number === null) return '';

  const fm = buildFormatter(locale, {
    ...options,
    style: 'currency',
    currency: locale.currency,
    useGrouping: false,
  }).format(number);
  return fm;
}

export function fCurrencyNoUnit(
  inputValue: InputNumberValue,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
) {
  const number = processInputNumber(inputValue);
  if (number === null) return '';

  return buildFormatter(locale, {
    ...options,
    style: 'currency',
    currency: locale.currency,
    currencyDisplay: 'code',
    useGrouping: false,
  })
    .formatToParts(number)
    .filter((part) => part.type !== 'currency')
    .map((part) => part.value)
    .map((value) => value.trim())
    .join('');
}

export function fPercent(
  inputValue: InputNumberValue,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
) {
  const number = processInputNumber(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(locale.code, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    useGrouping: false,
    ...options,
  }).format(number / 100);

  return fm;
}

/* ================== Public types (simplified) ================== */

export type NumericParseFunction = (v: InputNumberValue) => number | null;

export interface NumberTransformPropsBase {
  /** If provided, the committed value will be clamped >= min */
  min?: number;
  /** If provided, the committed value will be clamped <= max */
  max?: number;

  /** Parse raw user input into a number or null (no clamping, no rounding) */
  parseFunction: NumericParseFunction;

  /** Display-only formatting (any rounding/truncation must live here) */
  formatFunction: (v: number | string | null | undefined) => string;
}

export type NumberTransformPropsAllowEmpty = NumberTransformPropsBase & {
  allowEmpty: true;
};

export type NumberTransformPropsNoEmpty = NumberTransformPropsBase & {
  allowEmpty: false;
  defaultValue: number;
};

export type NumberTransformProps = NumberTransformPropsAllowEmpty | NumberTransformPropsNoEmpty;

/* Result types */
export type ChangeResult = { inputText: string; value: number | '' };
export type ChangeResultNoEmpty = { inputText: string; value?: number };
export type BlurResultAllowEmpty = { inputText: string; value: number | '' };
export type BlurResultNoEmpty = { inputText: string; value: number };

/* ================== Helpers ================== */

function clampOptional(n: number, min?: number, max?: number): number {
  let out = n;
  if (min !== undefined) out = Math.max(out, min);
  if (max !== undefined) out = Math.min(out, max);
  return out;
}

/** Loose decimal parser (unified: number | null). */
export const parseDecimal: NumericParseFunction = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;

  let s = v.trim();
  // allow “still typing” sentinels
  if (s === '' || s === '.' || s === '-' || s === '+') return null;

  // strip common decorations
  s = s.replace(/[, ]+/g, '').replace(/^\$/, '');

  // basic structure checks
  if (s.split('.').length > 2) return null;
  if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return null;

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/**
 * Parses an `InputNumberValue` into a safe integer, returning `null` on failure.
 *
 * This function is designed to robustly handle user input from fields intended for integers.
 * - For `number` inputs, it rounds to the nearest integer and validates if it's a safe integer.
 * - For `string` inputs, it sanitizes the value by:
 *   - Trimming whitespace.
 *   - Normalizing Unicode minus signs.
 *   - Stripping common separators (`,`, ` `) and currency symbols (`$`).
 *   - It correctly handles intermediate "still typing" states (like `"-"` or `""`) by returning `null`.
 * - It rounds any parsed decimal values to the nearest integer (e.g., "12.7" becomes `13`).
 * - The final value is returned only if it is a finite, safe integer (`Number.isSafeInteger`).
 *
 * @param v - The value to parse, which can be a `string`, `number`, `null`, or `undefined`.
 * @returns The parsed and rounded safe integer, or `null` if the input is invalid, empty, or results in a non-safe integer.
 * @example
 * parseInteger(" 1,234 ")      // returns 1234
 * parseInteger("-5.8")         // returns -6
 * parseInteger(123.45)         // returns 123
 * parseInteger("$100")         // returns 100
 * parseInteger("abc")          // returns null
 * parseInteger("")             // returns null
 * parseInteger(null)           // returns null
 * parseInteger(Number.MAX_SAFE_INTEGER + 1) // returns null
 */
export const parseInteger: NumericParseFunction = (v) => {
  if (v === null || v === undefined) return null;

  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    const rounded = Math.round(v);
    return Number.isSafeInteger(rounded) ? rounded : null;
  }

  let s = v.trim();
  // Normalize Unicode minus (U+2212) to ASCII '-'
  s = s.replace(/\u2212/g, '-');

  // "still typing" sentinels
  if (s === '' || s === '-' || s === '+' || s === '.') return null;

  // Strip grouping/currency you choose to allow
  s = s.replace(/[, ]+/g, '').replace(/^\$/, '');

  // Optional sign + digits, with an optional decimal point (no exponent, no extra junk)
  // Accepts "12", "-12", "12.", "12.0", "+4.499", etc.
  if (!/^[+-]?\d+(?:\.\d*)?$/.test(s)) return null;

  const n = Number(s); // or parseFloat(s); safe after regex
  if (!Number.isFinite(n)) return null;

  const rounded = Math.round(n);
  return Number.isSafeInteger(rounded) ? rounded : null;
};

export function formatDecimal(v: number | string | null | undefined, fractionDigits?: number): string {
  if (v === null || v === undefined || v === '') return '';
  const n = typeof v === 'number' ? v : parseDecimal(v);
  if (n === null) return '';
  return new Intl.NumberFormat(DEFAULT_LOCALE.code, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    roundingMode: 'halfCeil',
    useGrouping: false,
  }).format(n);
}

/* ================== PURE transformers (no event types) ================== */

/**
 * Parses a raw string value using a provided parse function and returns a structured result.
 * This is typically used in an `onChange` handler for a controlled input component to process
 * user input.
 *
 * @param props - The properties required for the transformation, including the `parseFunction`.
 * @param raw - The raw string value from the input element.
 * @returns An object containing the original `inputText` and the parsed `value`. If parsing fails (returns null/undefined), the value will be an empty string.
 */
export function transformValueOnChange(props: Omit<NumberTransformProps, 'defaultValue'>, raw: string): ChangeResult {
  const parsed = props.parseFunction(raw);
  return { inputText: raw, value: parsed ?? '' };
}

/**
 * Transforms a raw string value from a number input when it loses focus (on blur).
 *
 * This function parses the raw string, applies clamping based on min/max props,
 * and handles empty or default values. It's designed to be used in the `onBlur`
 * event handler of a controlled number input component.
 *
 * @param props - Configuration object for parsing, formatting, and validation.
 * @param raw - The raw string value from the input element.
 * @returns An object containing the final numeric value (or an empty string if allowed)
 * and the formatted text to display in the input.
 */
export function transformValueOnBlur(props: NumberTransformProps, raw: string): BlurResultAllowEmpty {
  // aka BlurResultAllowEmpty | BlurResultNoEmpty
  const parsed = props.parseFunction(raw);

  if (props.allowEmpty) {
    if (parsed === null) {
      return { value: '', inputText: '' };
    }
    const next = clampOptional(parsed, props.min, props.max);
    const nextInput = props.formatFunction(next);
    // we know parsed is not null here
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const value = props.parseFunction(nextInput)!;
    return { value, inputText: nextInput };
  } else {
    const base = parsed ?? props.defaultValue; // must have a valid fallback
    const nextInput = props.formatFunction(clampOptional(base, props.min, props.max));
    // we know value is not null here
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const value = props.parseFunction(nextInput)!;
    return { value, inputText: nextInput };
  }
}
