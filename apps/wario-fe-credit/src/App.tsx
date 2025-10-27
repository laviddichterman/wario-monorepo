import { domMax, LazyMotion } from "motion/react"
import { useEffect, useLayoutEffect } from 'react';

import { ScopedCssBaseline } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import { themeOptions } from '@wcp/wario-fe-ux-shared';
import { IsSocketDataLoaded, LoadingScreen, scrollToIdOffsetAfterDelay, startConnection } from '@wcp/wario-ux-shared';

import WStoreCreditPurchase from "@/components/WStoreCreditPurchase";

//import React from 'react';
import { useAppDispatch, useAppSelector } from "./app/useHooks";
const theme = createTheme(themeOptions);


const LazyLoadingPage = () =>
  <LazyMotion features={domMax}>
    <LoadingScreen />
  </LazyMotion>


const App = () => {
  const dispatch = useAppDispatch();
  const socketIoState = useAppSelector((s) => s.ws.status);
  const isSocketDataLoaded = useAppSelector(s => IsSocketDataLoaded(s.ws));
  useEffect(() => {
    if (socketIoState === 'NONE') {
      dispatch(startConnection());
    }
  }, [socketIoState, dispatch]);

  useLayoutEffect(() => {
    if (isSocketDataLoaded) {
      scrollToIdOffsetAfterDelay('WARIO_order', 100, -100);
    }
  }, [isSocketDataLoaded])
  return (
    <ScopedCssBaseline>
      <ThemeProvider theme={theme}>
        {!isSocketDataLoaded ?
          <LazyLoadingPage /> :
          <div id="WARIO_order">
            <WStoreCreditPurchase />
          </div>
        }
      </ThemeProvider>
    </ScopedCssBaseline>
  );
};

export default App;