import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router';

import { CONFIG } from '@/config';

import { dashboardRoutes } from './dashboard';

const Page404 = lazy(() => import('@/pages/error/404'));

export const routesSection: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to={CONFIG.auth.redirectPath} replace />,
  },

  // Dashboard
  ...dashboardRoutes,

  // No match
  { path: '*', element: <Page404 /> },
];
