import { useLayoutEffect } from 'react';

import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import { themeOptions } from "@wcp/wario-fe-ux-shared";
import { LoadingScreen, MotionLazy, scrollToIdOffsetAfterDelay, useIsSocketDataLoaded } from '@wcp/wario-ux-shared';

import WMenuComponent from './components/WMenuComponent';

const theme = createTheme(themeOptions);

const App = () => {
  const isSocketDataLoaded = useIsSocketDataLoaded();

  useLayoutEffect(() => {
    if (isSocketDataLoaded) {
      scrollToIdOffsetAfterDelay('WARIO_order', 100, -100);
    }
  }, [isSocketDataLoaded])
  return (
    <ScopedCssBaseline>
      <ThemeProvider theme={theme}>
        {!isSocketDataLoaded ?
          <MotionLazy>
            <LoadingScreen />
          </MotionLazy> :
          <div id="WARIO_order">
            <WMenuComponent />
          </div>
        }
      </ThemeProvider>
    </ScopedCssBaseline>
  );
};

export default App;