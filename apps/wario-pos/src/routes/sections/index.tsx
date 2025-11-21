import { lazy } from 'react';
import { type RouteObject } from 'react-router';

import { RootRedirect } from '@/routes/sections/root-redirect';

import { dashboardRoutes } from './dashboard';

const Page404 = lazy(() => import('@/pages/error/404'));

export const routesSection: RouteObject[] = [
  {
    // CRITICAL: Component to handle root path navigation
    // Must check for OAuth callback params before redirecting
    path: '/',
    element: <RootRedirect />,
  },

  // Dashboard
  ...dashboardRoutes,

  // No match
  { path: '*', element: <Page404 /> },
];
