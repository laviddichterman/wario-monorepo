import '@/global.css';

import { useEffect } from 'react';

import { LoadingScreen } from '@wcp/wario-ux-shared/components';
import { MotionLazy } from '@wcp/wario-ux-shared/containers';
import { useIsSocketDataLoaded } from '@wcp/wario-ux-shared/query';

import { usePathname } from '@/routes/hooks';

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
  useScrollToTop();
  const isSocketDataLoaded = useIsSocketDataLoaded();

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
                {!isSocketDataLoaded ? <LoadingScreen /> : children}
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
