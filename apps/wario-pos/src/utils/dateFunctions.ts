import {
  add,
  format,
  formatDistanceStrict,
  isAfter as isAfterFns,
  isSameDay,
  isSameMonth,
  isSameYear,
  isValid,
  isWithinInterval,
  parseISO,
  startOfDay,
  sub,
} from 'date-fns';

// ----------------------------------------------------------------------

/**
 * date-fns format reference:
 * https://date-fns.org/docs/format
 */

/**
 * Timezone reference:
 * https://date-fns.org/docs/Time-Zones
 */

// ----------------------------------------------------------------------

export type DateInput = Date | string | number | null | undefined;

export const FORMAT_PATTERNS = {
  dateTime: 'dd MMM yyyy h:mm a', // 17 Apr 2022 12:00 am
  date: 'dd MMM yyyy', // 17 Apr 2022
  time: 'h:mm a', // 12:00 am
  split: {
    dateTime: 'dd/MM/yyyy h:mm a', // 17/04/2022 12:00 am
    date: 'dd/MM/yyyy', // 17/04/2022
  },
  paramCase: {
    dateTime: 'dd-MM-yyyy h:mm a', // 17-04-2022 12:00 am
    date: 'dd-MM-yyyy', // 17-04-2022
  },
};

const INVALID_DATE = 'Invalid';

// ----------------------------------------------------------------------

/**
 * Helper function to parse date input into a Date object
 */
function parseDate(input: DateInput): Date | null {
  if (!input) return null;

  if (input instanceof Date) return input;
  if (typeof input === 'string') return parseISO(input);
  if (typeof input === 'number') return new Date(input);

  return null;
}

// ----------------------------------------------------------------------

export function today({ template, currentTime }: { template?: string; currentTime: Date | number }): string {
  const todayDate = startOfDay(new Date(currentTime));
  return template ? format(todayDate, template) : format(todayDate, FORMAT_PATTERNS.date);
}

// ----------------------------------------------------------------------

/**
 * Formats a date-time string.
 * @returns Formatted date-time string or 'Invalid'.
 * @example
 * fDateTime('17-04-2022') // '17 Apr 2022 12:00 am'
 */
export function fDateTime(input: DateInput, template = FORMAT_PATTERNS.dateTime): string {
  if (!input) return '';

  const date = parseDate(input);
  if (!date || !isValid(date)) return INVALID_DATE;

  return format(date, template);
}

// ----------------------------------------------------------------------

/**
 * Formats a date string.
 * @returns Formatted date string or 'Invalid'.
 * @example
 * fDate('17-04-2022') // '17 Apr 2022'
 */
export function fDate(input: DateInput, template = FORMAT_PATTERNS.date): string {
  if (!input) return '';

  const date = parseDate(input);
  if (!date || !isValid(date)) return INVALID_DATE;

  return format(date, template);
}

// ----------------------------------------------------------------------

/**
 * Formats a time string.
 * @returns Formatted time string or 'Invalid'.
 * @example
 * fTime('2022-04-17T00:00:00') // '12:00 am'
 */
export function fTime(input: DateInput, template = FORMAT_PATTERNS.time): string {
  if (!input) return '';

  const date = parseDate(input);
  if (!date || !isValid(date)) return INVALID_DATE;

  return format(date, template);
}

// ----------------------------------------------------------------------

/**
 * Converts a date input to timestamp.
 * @returns Timestamp in milliseconds or 'Invalid'.
 * @example
 * fTimestamp('2022-04-17') // 1650153600000
 */
export function fTimestamp(input: DateInput): number | string {
  if (!input) return '';

  const date = parseDate(input);
  if (!date || !isValid(date)) return INVALID_DATE;

  return date.getTime();
}

// ----------------------------------------------------------------------

/**
 * Returns relative time from now to the input.
 * @returns A relative time string.
 * @example
 * fToNow(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)) // '2 days'
 */
export function fToNow(input: DateInput, currentTime: Date | number): string {
  if (!input) return '';

  const date = parseDate(input);
  if (!date || !isValid(date)) return INVALID_DATE;

  return formatDistanceStrict(date, currentTime);
}

// ----------------------------------------------------------------------

/**
 * Checks if a date is between two dates (inclusive).
 * @returns `true` if input is between start and end.
 * @example
 * fIsBetween('2024-01-02', '2024-01-01', '2024-01-03') // true
 */
export function fIsBetween(input: DateInput, start: DateInput, end: DateInput): boolean {
  if (!input || !start || !end) return false;

  const inputDate = parseDate(input);
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (!inputDate || !startDate || !endDate) return false;
  if (!isValid(inputDate) || !isValid(startDate) || !isValid(endDate)) return false;

  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  return isWithinInterval(inputDate, {
    start: new Date(Math.min(startTime, endTime)),
    end: new Date(Math.max(startTime, endTime)),
  });
}

// ----------------------------------------------------------------------

/**
 * Checks if one date is after another.
 * @returns `true` if start is after end.
 * @example
 * fIsAfter('2024-05-01', '2024-04-01') // true
 */
export function fIsAfter(start: DateInput, end: DateInput): boolean {
  if (!start || !end) return false;

  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (!startDate || !endDate) return false;
  if (!isValid(startDate) || !isValid(endDate)) return false;

  return isAfterFns(startDate, endDate);
}

// ----------------------------------------------------------------------

/**
 * Checks if two dates are the same by a given unit.
 * @returns `true` if equal by unit.
 * @example
 * fIsSame('2024-04-01', '2024-05-01', 'year') // true
 * fIsSame('2024-04-01', '2023-05-01', 'year') // false
 */
export type CompareUnit = 'year' | 'month' | 'day';

export function fIsSame(start: DateInput, end: DateInput, unit: CompareUnit = 'year'): boolean {
  if (!start || !end) return false;

  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (!startDate || !endDate) return false;
  if (!isValid(startDate) || !isValid(endDate)) return false;

  if (unit === 'year') return isSameYear(startDate, endDate);
  if (unit === 'month') return isSameMonth(startDate, endDate);
  return isSameDay(startDate, endDate);

  return false;
}

// ----------------------------------------------------------------------

/**
 * Formats a compact label for a date range based on similarity.
 * @returns Formatted range label or 'Invalid'.
 * @example
 * fDateRangeShortLabel('2024-04-26', '2024-04-26') // '26 Apr 2024'
 * fDateRangeShortLabel('2024-04-25', '2024-04-26') // '25 - 26 Apr 2024'
 * fDateRangeShortLabel('2024-04-25', '2024-05-26') // '25 Apr - 26 May 2024'
 * fDateRangeShortLabel('2023-12-25', '2024-01-01') // '25 Dec 2023 - 01 Jan 2024'
 */
export function fDateRangeShortLabel(start: DateInput, end: DateInput, initial?: boolean): string {
  if (!start || !end) return '';

  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (!startDate || !endDate) return INVALID_DATE;
  if (!isValid(startDate) || !isValid(endDate)) return INVALID_DATE;
  if (isAfterFns(startDate, endDate)) return INVALID_DATE;

  if (initial) {
    return `${fDate(startDate)} - ${fDate(endDate)}`;
  }

  const isSameDayValue = isSameDay(startDate, endDate);
  const isSameMonthValue = isSameMonth(startDate, endDate);
  const isSameYearValue = isSameYear(startDate, endDate);

  if (isSameDayValue) {
    return fDate(endDate);
  }

  if (isSameMonthValue) {
    return `${fDate(startDate, 'dd')} - ${fDate(endDate)}`;
  }

  if (isSameYearValue) {
    return `${fDate(startDate, 'dd MMM')} - ${fDate(endDate)}`;
  }

  return `${fDate(startDate)} - ${fDate(endDate)}`;
}

// ----------------------------------------------------------------------

/**
 * Adds duration to the current time.
 * @returns ISO formatted string with the result.
 * @example
 * fAdd({ days: 3 }) // '2025-08-08T12:34:56+00:00'
 */
export type DurationProps = {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
};

export function fAdd(
  currentTime: Date | number,
  { years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0, milliseconds = 0 }: DurationProps,
): string {
  const result = add(currentTime, {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
  });

  // date-fns doesn't have milliseconds in add, so add them separately if needed
  if (milliseconds) {
    result.setMilliseconds(result.getMilliseconds() + milliseconds);
  }

  return result.toISOString();
}

// ----------------------------------------------------------------------

/**
 * Subtracts duration from the current time.
 * @returns ISO formatted string with the result.
 * @example
 * fSub({ months: 1 }) // '2025-07-05T12:34:56+00:00'
 */
export function fSub(
  currentTime: Date | number,
  { years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0, milliseconds = 0 }: DurationProps,
): string {
  const result = sub(currentTime, {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
  });

  // date-fns doesn't have milliseconds in sub, so subtract them separately if needed
  if (milliseconds) {
    result.setMilliseconds(result.getMilliseconds() - milliseconds);
  }

  return result.toISOString();
}
