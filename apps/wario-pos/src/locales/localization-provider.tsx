import { setDefaultOptions } from 'date-fns';
import { useEffect } from 'react';

import { LocalizationProvider as Provider } from '@mui/x-date-pickers/LocalizationProvider';

import { SelectDateFnsAdapter } from '@wcp/wario-ux-shared';

import { useAppSelector } from '@/hooks/useRedux';

import { useTranslate } from './use-locales';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function LocalizationProvider({ children }: Props) {
  const { currentLang } = useTranslate();
  const DateAdapter = useAppSelector(s => SelectDateFnsAdapter(s));

  useEffect(() => {
    setDefaultOptions({ locale: currentLang.adapterLocale });
  }, [currentLang])

  return (
    <Provider dateAdapter={DateAdapter} adapterLocale={currentLang.adapterLocale}>
      {children}
    </Provider>
  );
}
