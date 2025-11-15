import i18next from 'i18next';

import { getCurrentLang } from '@/locales/localesConfig';

// ----------------------------------------------------------------------

export function formatNumberLocale() {
  const currentLang = getCurrentLang(i18next.resolvedLanguage);

  return {
    code: currentLang.numberFormat.code,
    currency: currentLang.numberFormat.currency,
  };
}
