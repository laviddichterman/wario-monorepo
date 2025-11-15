import { enUS, es, type Locale } from "date-fns/locale";
import type { InitOptions } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

// MUI Core Locales
import {
  enUS as enUSCore,
  esES as esESCore,
} from '@mui/material/locale';
import type { Components, Theme } from '@mui/material/styles';
// MUI Data Grid Locales
import {
  enUS as enUSDataGrid,
  esES as esESDataGrid,
} from '@mui/x-data-grid-premium/locales';
// MUI Date Pickers Locales
import {
  enUS as enUSDate,
  esES as esESDate,
} from '@mui/x-date-pickers/locales';

// ----------------------------------------------------------------------

// Supported languages
export const supportedLngs = ['en', 'es'] as const;
export type LangCode = (typeof supportedLngs)[number];

// Fallback and default namespace
export const fallbackLng: LangCode = 'en';
export const defaultNS = 'common';

// Storage config
export const storageConfig = {
  cookie: { key: 'i18next', autoDetection: false },
  localStorage: { key: 'i18nextLng', autoDetection: false },
} as const;

// ----------------------------------------------------------------------

/**
 * @countryCode https://flagcdn.com/en/codes.json
 * @adapterLocale https://date-fns.org/v4.1.0/docs/I18n#usage
 * @numberFormat https://simplelocalize.io/data/locales/
 */

export type LangOption = {
  value: LangCode;
  label: string;
  countryCode: string;
  adapterLocale: Locale;
  numberFormat: { code: string; currency: string };
  systemValue?: { components: Components<Theme> };
};

export const allLangs: LangOption[] = [
  {
    value: 'en',
    label: 'English',
    countryCode: 'US',
    adapterLocale: enUS,
    numberFormat: { code: 'en-US', currency: 'USD' },
    systemValue: {
      components: { ...enUSCore.components, ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'es',
    label: 'Spanish',
    countryCode: 'ES',
    adapterLocale: es,
    numberFormat: { code: 'es-ES', currency: 'EUR' },
    systemValue: {
      components: { ...esESCore.components, ...esESDate.components, ...esESDataGrid.components },
    },
  },
];

// ----------------------------------------------------------------------

export const i18nResourceLoader = resourcesToBackend(
  (lang: LangCode, namespace: string) => import(`./langs/${lang}/${namespace}.json`)
);

export function i18nOptions(lang = fallbackLng, namespace = defaultNS): InitOptions {
  return {
    // debug: true,
    supportedLngs,
    fallbackLng,
    lng: lang,
    /********/
    fallbackNS: defaultNS,
    defaultNS,
    ns: namespace,
  };
}

export function getCurrentLang(lang?: string): LangOption {
  const fallbackLang = allLangs.find((l) => l.value === fallbackLng) ?? allLangs[0];

  if (!lang) {
    return fallbackLang;
  }

  return allLangs.find((l) => l.value === lang) ?? fallbackLang;
}
