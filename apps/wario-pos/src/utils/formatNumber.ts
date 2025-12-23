import {
  fCurrency as fCurrencyShared,
  fNumber as fNumberShared,
  fPercent as fPercentShared,
} from '@wcp/wario-shared/logic';

import { formatNumberLocale } from '@/locales';

export type InputNumberValue = string | number | null | undefined;

type Options = Intl.NumberFormatOptions;

// ----------------------------------------------------------------------

export function fNumber(inputValue: InputNumberValue, options?: Options) {
  const locale = formatNumberLocale();
  return fNumberShared(inputValue, locale, options);
}

// ----------------------------------------------------------------------

export function fCurrency(inputValue: InputNumberValue, options?: Options) {
  const locale = formatNumberLocale();
  return fCurrencyShared(inputValue, locale, options);
}

// ----------------------------------------------------------------------

export function fPercent(inputValue: InputNumberValue, options?: Options) {
  const locale = formatNumberLocale();
  return fPercentShared(inputValue, locale, options);
}
