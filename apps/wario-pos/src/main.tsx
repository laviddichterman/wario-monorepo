import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router';

import { WarioQueryProvider } from '@wcp/wario-ux-shared/query';

import { ErrorBoundary } from '@/routes/components';
import { routesSection } from '@/routes/sections';

import App from '@/App';
import { HOST_API, SOCKETIO } from '@/config';
import { store } from '@/redux/store';

// ----------------------------------------------------------------------

const router = createBrowserRouter([
  {
    children: routesSection,
    Component: () => (
      <App>
        <Outlet />
      </App>
    ),
    errorElement: <ErrorBoundary />,
  },
]);


const root = createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <StrictMode>
    <WarioQueryProvider hostAPI={HOST_API} namespace={SOCKETIO.ns} showDevtools={import.meta.env.DEV}>
      <ReduxProvider store={store}>
        <RouterProvider router={router} />
      </ReduxProvider>
    </WarioQueryProvider>
  </StrictMode>
);

