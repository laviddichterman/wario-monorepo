import { SnackbarProvider } from 'notistack';
import { useEffect, useLayoutEffect } from 'react';

import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import { themeOptions } from "@wcp/wario-fe-ux-shared";
import { scrollToIdOffsetAfterDelay } from '@wcp/wario-ux-shared/common';
import { LoadingScreen } from '@wcp/wario-ux-shared/components';
import { MotionLazy } from '@wcp/wario-ux-shared/containers';
import { IsSocketDataLoaded, startConnection } from '@wcp/wario-ux-shared/redux';

import WOrderingComponent from '@/components/WOrderingComponent';

import { setUserAgent } from '@/app/slices/WMetricsSlice';
import { useAppDispatch, useAppSelector } from "@/app/useHooks";

const theme = createTheme(themeOptions);

/**
 * TO LAUNCH CHECKLIST
 * Fix display of apple pay and google pay
 * Ensure we're passing everything we need to apple/google pay for itemized receipt creation
 * fix the X scrolling in the checkout cart (hide some shit, make it smaller)
 */

const App = () => {
  const dispatch = useAppDispatch();
  const socketIoState = useAppSelector((s) => s.ws.status);
  const isSocketDataLoaded = useAppSelector(s => IsSocketDataLoaded(s.ws));
  useEffect(() => {
    if (socketIoState === 'NONE') {
      dispatch(startConnection());
    }
    dispatch(setUserAgent(window.navigator.userAgent));
  }, [socketIoState, dispatch]);

  useLayoutEffect(() => {
    if (isSocketDataLoaded) {
      scrollToIdOffsetAfterDelay('WARIO_order', 100, -100);
    }
  }, [isSocketDataLoaded])
  return (
    <ScopedCssBaseline>
      <ThemeProvider theme={theme}>
        <SnackbarProvider style={{ zIndex: 999999 }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
          {!isSocketDataLoaded ?
            <MotionLazy>
              <LoadingScreen />
            </MotionLazy> :
            <div id="WARIO_order">
              <WOrderingComponent />
            </div>
          }
        </SnackbarProvider>
      </ThemeProvider>
    </ScopedCssBaseline>
  );
};

export default App;