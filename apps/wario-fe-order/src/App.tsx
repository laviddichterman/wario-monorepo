import { domMax, LazyMotion } from "motion/react"
import { SnackbarProvider } from 'notistack';
import { useEffect, useLayoutEffect } from 'react';

import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import { themeOptions } from "@wcp/wario-fe-ux-shared";
import { IsSocketDataLoaded, LoadingScreen, MotionLazy, scrollToIdOffsetAfterDelay, startConnection } from '@wcp/wario-ux-shared';

import WOrderingComponent from '@/components/WOrderingComponent';

import { setUserAgent } from '@/app/slices/WMetricsSlice';
import { useAppDispatch, useAppSelector } from "@/app/useHooks";

const theme = createTheme(themeOptions);

/**
 * TO LAUNCH CHECKLIST
 * Fix display of apple pay and google pay
 * Ensure we're passing everything we need to apple/google pay for itemized receipt creation
 * change from react-hook-form to just put shit in the redux state
 * fix the X scrolling in the checkout cart (hide some shit, make it smaller)
 */


const LazyLoadingPage = () =>
  <MotionLazy>
    <LoadingScreen />
  </MotionLazy>


const App = () => {
  const dispatch = useAppDispatch();
  const socketIoState = useAppSelector((s) => s.ws.status);
  const isSocketDataLoaded = useAppSelector(s => IsSocketDataLoaded(s.ws));
  const currentTimeNotLoaded = useAppSelector(s => s.ws.currentTime === 0);
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
          {!isSocketDataLoaded || currentTimeNotLoaded ?
            <LazyLoadingPage /> :
            <div id="WARIO_order">
              {<WOrderingComponent />}
            </div>
          }
        </SnackbarProvider>
      </ThemeProvider>
    </ScopedCssBaseline>
  );
};

export default App;