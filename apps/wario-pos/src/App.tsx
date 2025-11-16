
import { useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';

import { MotionLazy } from '@wcp/wario-ux-shared';

import { usePathname } from '@/routes/hooks';

import { ProgressBar } from '@/components/progress-bar';
import { defaultSettings, SettingsDrawer, SettingsProvider } from '@/components/settings';
import { Snackbar } from '@/components/snackbar';

import { AuthProvider as Auth0AuthProvider } from '@/auth/context/auth0';

import { I18nProvider } from '@/locales/i18nProvider';
import { LocalizationProvider } from '@/locales/localizationProvider';
import { store } from '@/redux/store';
import { themeConfig, ThemeProvider } from '@/theme';


type AppProps = {
  children: React.ReactNode;
};

export default function App({ children }: AppProps) {
  useScrollToTop();
  return (
    <ReduxProvider store={store}>
      <I18nProvider>
        <Auth0AuthProvider>
          <SettingsProvider defaultSettings={defaultSettings}>
            <LocalizationProvider>
              <ThemeProvider
                noSsr
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
    </ReduxProvider>
  );
}

function useScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
