
import { useEffect } from 'react';

import { MotionLazy, startConnection } from '@wcp/wario-ux-shared';

import { usePathname } from '@/routes/hooks';

import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';

import { ProgressBar } from '@/components/progress-bar';
import { defaultSettings, SettingsDrawer, SettingsProvider } from '@/components/settings';
import { Snackbar } from '@/components/snackbar';

import { AuthProvider as Auth0AuthProvider } from '@/auth/context/auth0';

import { I18nProvider } from '@/locales/i18n-provider';
import { LocalizationProvider } from '@/locales/localization-provider';
import { themeConfig, ThemeProvider } from '@/theme';


type AppProps = {
  children: React.ReactNode;
};

export default function App({ children }: AppProps) {
  const dispatch = useAppDispatch();
  const socketIoState = useAppSelector((s) => s.ws.status);
  useEffect(() => {
    if (socketIoState === 'NONE') {
      dispatch(startConnection());
    }
  }, [socketIoState, dispatch]);
  useScrollToTop();
  return (
    <I18nProvider>
      <Auth0AuthProvider>
        <SettingsProvider defaultSettings={defaultSettings}>
          <LocalizationProvider>
            <ThemeProvider
              defaultMode={themeConfig.defaultMode}
              modeStorageKey={themeConfig.modeStorageKey}
            >
              <MotionLazy>
                <Snackbar />
                <ProgressBar />
                <SettingsDrawer defaultSettings={defaultSettings} />
                {children}
              </MotionLazy>
            </ThemeProvider>
          </LocalizationProvider>
        </SettingsProvider>
      </Auth0AuthProvider >
    </I18nProvider >
  );
}

function useScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
