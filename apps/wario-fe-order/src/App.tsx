import { useQueryClient } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { useEffect, useLayoutEffect } from 'react';

import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import { themeOptions } from '@wcp/wario-fe-ux-shared';
import { scrollToIdOffsetAfterDelay } from '@wcp/wario-ux-shared/common';
import { LoadingScreen } from '@wcp/wario-ux-shared/components';
import { MotionLazy } from '@wcp/wario-ux-shared/containers';
import { useIsSocketDataLoaded } from '@wcp/wario-ux-shared/query';

import { useSubmitOrderMutation } from '@/hooks/useSubmitOrderMutation';

import WOrderingComponent from '@/components/WOrderingComponent';

import { setupCartValidationListener } from '@/listeners/cartValidationListener';
import { useMetricsStore } from '@/stores/useMetricsStore';

const theme = createTheme(themeOptions);

/**
 * TO LAUNCH CHECKLIST
 * Fix display of apple pay and google pay
 * Ensure we're passing everything we need to apple/google pay for itemized receipt creation
 * fix the X scrolling in the checkout cart (hide some shit, make it smaller)
 */

const App = () => {
  const { setUserAgent } = useMetricsStore();
  const isSocketDataLoaded = useIsSocketDataLoaded();
  // const currentTime = useServerTime();
  const queryClient = useQueryClient();
  const submitOrderMutation = useSubmitOrderMutation();

  // Set user agent for metrics
  useEffect(() => {
    setUserAgent(window.navigator.userAgent);
  }, [setUserAgent]);

  // Setup cart validation listener
  useEffect(() => {
    if (!isSocketDataLoaded) {
      return;
    }

    // Function to check if order has been submitted
    const getIsOrderSubmitted = () => {
      return submitOrderMutation.isPending || submitOrderMutation.isSuccess;
    };

    // Setup listener and get cleanup function
    const cleanup = setupCartValidationListener(queryClient, getIsOrderSubmitted);

    // Cleanup on unmount or when socket data reloads
    return cleanup;
  }, [isSocketDataLoaded, queryClient, submitOrderMutation.isPending, submitOrderMutation.isSuccess]);

  // Scroll to order section when data is loaded
  useLayoutEffect(() => {
    if (isSocketDataLoaded) {
      scrollToIdOffsetAfterDelay('WARIO_order', 100, -100);
    }
  }, [isSocketDataLoaded]);

  // console.log({ isSocketDataLoaded, currentTime });

  return (
    <ScopedCssBaseline>
      <ThemeProvider theme={theme}>
        <SnackbarProvider style={{ zIndex: 999999 }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
          {!isSocketDataLoaded ? (
            <MotionLazy>
              <LoadingScreen />
            </MotionLazy>
          ) : (
            <div id="WARIO_order">
              <WOrderingComponent />
            </div>
          )}
        </SnackbarProvider>
      </ThemeProvider>
    </ScopedCssBaseline>
  );
};

export default App;
