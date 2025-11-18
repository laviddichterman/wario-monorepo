import type { Namespace } from 'i18next';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsContext } from '@/components/settings';
import { toast } from '@/components/snackbar';

import type { LangCode } from './locales-config';
import { fallbackLng, getCurrentLang } from './locales-config';

// ----------------------------------------------------------------------

export function useTranslate(namespace?: Namespace) {
  const settings = useSettingsContext();

  const { t, i18n } = useTranslation(namespace);
  const { t: tMessages } = useTranslation('messages');

  const currentLang = getCurrentLang(i18n.resolvedLanguage);

  const updateDirection = useCallback(
    (lang: LangCode) => {
      settings.setState({ direction: i18n.dir(lang) });
    },
    [i18n, settings]
  );

  const handleChangeLang = useCallback(
    async (lang: LangCode) => {
      try {
        const changeLangPromise = i18n.changeLanguage(lang);

        toast.promise(changeLangPromise, {
          loading: tMessages('languageSwitch.loading'),
          success: () => tMessages('languageSwitch.success'),
          error: () => tMessages('languageSwitch.error'),
        });

        await changeLangPromise;

        updateDirection(lang);
        // updateDateFnsLocale(lang);
      } catch (error) {
        console.error(error);
      }
    },
    [i18n, tMessages, updateDirection]
  );

  const handleResetLang = useCallback(() => {
    void handleChangeLang(fallbackLng);
  }, [handleChangeLang]);

  return {
    t,
    i18n,
    currentLang,
    onChangeLang: handleChangeLang,
    onResetLang: handleResetLang,
  };
}

// ----------------------------------------------------------------------

export function useLocaleDirectionSync() {
  const { i18n, currentLang } = useTranslate();
  const { state, setState } = useSettingsContext();

  const handleSync = useCallback(async () => {
    const selectedLang = currentLang.value;
    const i18nDir = i18n.dir(selectedLang);

    if (document.dir !== i18nDir) {
      document.dir = i18nDir;
    }

    if (state.direction !== i18nDir) {
      setState({ direction: i18nDir });
    }

    if (i18n.resolvedLanguage !== selectedLang) {
      await i18n.changeLanguage(selectedLang);
    }
  }, [currentLang.value, i18n, setState, state.direction]);

  useEffect(() => {
    void handleSync();
  }, [handleSync]);

  return null;
}
