import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router';

import { ErrorBoundary } from '@/routes/components';
import { routesSection } from '@/routes/sections';

import App from '@/App';

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
    <RouterProvider router={router} />
  </StrictMode>
);
