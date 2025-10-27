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

export function fNumber(inputValue: InputNumberValue, locale: Locale = DEFAULT_LOCALE, options?: Intl.NumberFormatOptions) {
  const number = processInputNumber(inputValue);
  if (number === null) return '';

  const fm = buildFormatter(locale, options).format(number);
  return fm;
}

export function fCurrency(inputValue: InputNumberValue, locale: Locale = DEFAULT_LOCALE, options?: Intl.NumberFormatOptions) {
  const number = processInputNumber(inputValue);
  if (number === null) return '';

  const fm = buildFormatter(locale, { ...options, style: 'currency', currency: locale.currency }).format(number);
  return fm;
}


export function fCurrencyNoUnit(inputValue: InputNumberValue, locale: Locale = DEFAULT_LOCALE, options?: Intl.NumberFormatOptions) {
  const number = processInputNumber(inputValue);
  if (number === null) return '';

  return buildFormatter(locale,
    {
      ...options,
      style: 'currency',
      currency: locale.currency,
      currencyDisplay: 'code',

    })
    .formatToParts(number)
    .filter(part => part.type !== 'currency')
    .map(part => part.value)
    .map(value => value.trim())
    .join('')
}

export function fPercent(inputValue: InputNumberValue, locale: Locale = DEFAULT_LOCALE, options?: Intl.NumberFormatOptions) {
  const number = processInputNumber(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(locale.code, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options,
  }).format(number / 100);

  return fm;
}

/* ================== Public types (simplified) ================== */

export type NumericParseFunction = (
  v: InputNumberValue
) => number | null;

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

export type NumberTransformProps =
  | NumberTransformPropsAllowEmpty
  | NumberTransformPropsNoEmpty;

/* Result types */
export type ChangeResult = { inputText: string; value: number | "" };
export type ChangeResultNoEmpty = { inputText: string; value?: number };
export type BlurResultAllowEmpty = { inputText: string; value: number | "" };
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
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  let s = v.trim();
  // allow “still typing” sentinels
  if (s === "" || s === "." || s === "-" || s === "+") return null;

  // strip common decorations
  s = s.replace(/[, ]+/g, "").replace(/^\$/, "");

  // basic structure checks
  if (s.split(".").length > 2) return null;
  if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return null;

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export const parseInteger: NumericParseFunction = (v) => {
  if (v === null || v === undefined) return null;

  if (typeof v === "number") {
    return Number.isFinite(v) && Number.isInteger(v) && Number.isSafeInteger(v)
      ? v
      : null;
  }

  let s = v.trim();
  // Normalize Unicode minus (U+2212) to ASCII '-'
  s = s.replace(/\u2212/g, "-");

  // "still typing" sentinels
  if (s === "" || s === "-" || s === "+" || s === ".") return null;

  // Strip common decorations you allow
  s = s.replace(/[, ]+/g, "").replace(/^\$/, "");

  // Must be an optional sign + digits only (no decimals, no junk)
  if (!/^[+-]?\d+$/.test(s)) return null;

  const n = Number(s);
  return Number.isFinite(n) && Number.isInteger(n) && Number.isSafeInteger(n)
    ? n
    : null;
};

export function formatDecimal(v: number | string | null | undefined, fractionDigits?: number): string {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : parseDecimal(v);
  if (n === null) return "";
  return new Intl.NumberFormat(DEFAULT_LOCALE.code, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
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
export function transformValueOnChange(
  props: Omit<NumberTransformProps, "defaultValue">,
  raw: string
): ChangeResult {
  const parsed = props.parseFunction(raw);
  return { inputText: raw, value: parsed ?? "" };
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
export function transformValueOnBlur(
  props: NumberTransformProps,
  raw: string
): BlurResultAllowEmpty | BlurResultNoEmpty {
  const parsed = props.parseFunction(raw);

  if (props.allowEmpty) {
    if (parsed === null) {
      return { value: "", inputText: "" };
    }
    const next = clampOptional(parsed, props.min, props.max);
    return { value: next, inputText: props.formatFunction(next) };
  } else {
    const base = parsed ?? props.defaultValue; // must have a valid fallback
    const next = clampOptional(base, props.min, props.max);
    return { value: next, inputText: props.formatFunction(next) };
  }
}
