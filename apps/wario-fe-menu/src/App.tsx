import { useEffect, useLayoutEffect } from 'react';
import { LazyMotion, domMax } from "motion/react"
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ScopedCssBaseline } from '@mui/material';

import { scrollToIdOffsetAfterDelay, LoadingScreen, IsSocketDataLoaded, startConnection } from '@wcp/wario-ux-shared';

import { useAppDispatch, useAppSelector } from "./app/useHooks";
import { themeOptions } from "@wcp/wario-fe-ux-shared";

import WMenuComponent from './components/WMenuComponent';

const theme = createTheme(themeOptions);

const App = () => {
  const dispatch = useAppDispatch();
  const socketIoState = useAppSelector((s) => s.ws.status);
  const isSocketDataLoaded = useAppSelector(s => IsSocketDataLoaded(s.ws));
  const currentTimeNotLoaded = useAppSelector(s => s.ws.currentTime === 0);
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
        {!isSocketDataLoaded || currentTimeNotLoaded ?
          <LazyMotion features={domMax}>
            <LoadingScreen />
          </LazyMotion> :
          <div id="WARIO_order">
            <WMenuComponent />
          </div>
        }
      </ThemeProvider>
    </ScopedCssBaseline>
  );
};

export default App;