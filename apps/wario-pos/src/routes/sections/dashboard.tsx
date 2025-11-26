import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router';
import { Outlet } from 'react-router';

import { LoadingScreen } from '@wcp/wario-ux-shared/components';

import { AuthGuard } from '@/auth/guard';

// import { CONFIG } from '@/config';
import { DashboardLayout } from '@/layouts/dashboard';

import { usePathname } from '../hooks';
// ----------------------------------------------------------------------

// Overview
const IndexPage = lazy(() => import('@/pages/dashboard'));
const OrderListPage = lazy(() => import('@/pages/dashboard/order/list'));

// Catalog
const CatalogCategoryProductPage = lazy(() => import('@/pages/dashboard/catalog/categories'));
const CatalogProductPage = lazy(() => import('@/pages/dashboard/catalog/product/products'));
const CatalogPrinterGroupsPage = lazy(() => import('@/pages/dashboard/catalog/printer-groups'));
const CatalogModifiersPage = lazy(() => import('@/pages/dashboard/catalog/modifiers'));
const CatalogProductFunctionsPage = lazy(() => import('@/pages/dashboard/catalog/product-functions'));


// User
// const UserProfilePage = lazy(() => import('@/pages/dashboard/user/profile'));
// const UserCardsPage = lazy(() => import('@/pages/dashboard/user/cards'));
// const UserListPage = lazy(() => import('@/pages/dashboard/user/list'));
// const UserCreatePage = lazy(() => import('@/pages/dashboard/user/new'));
// const UserEditPage = lazy(() => import('@/pages/dashboard/user/edit'));
// Account
// App
// const ChatPage = lazy(() => import('@/pages/dashboard/chat'));
// const CalendarPage = lazy(() => import('@/pages/dashboard/calendar'));
// Test render page by role
// const PermissionDeniedPage = lazy(() => import('@/pages/dashboard/permission'));


// ----------------------------------------------------------------------

// eslint-disable-next-line react-refresh/only-export-components
function SuspenseOutlet() {
  const pathname = usePathname();
  return (
    <Suspense key={pathname} fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  );
}

const dashboardLayout = () => (
  <DashboardLayout>
    <SuspenseOutlet />
  </DashboardLayout>
);

export const dashboardRoutes: RouteObject[] = [
  {
    path: 'dashboard',
    element: <AuthGuard>{dashboardLayout()}</AuthGuard>, //CONFIG.auth.skip ? dashboardLayout() : <AuthGuard>{dashboardLayout()}</AuthGuard>,
    children: [
      { index: true, element: <IndexPage /> },
      // { path: 'chat', element: <OverviewEcommercePage /> },
      // { path: 'analytics', element: <OverviewAnalyticsPage /> },
      // {
      //   path: 'user',
      //   children: [
      //     { index: true, element: <UserProfilePage /> },
      //     { path: 'profile', element: <UserProfilePage /> },
      //     { path: 'cards', element: <UserCardsPage /> },
      //     { path: 'list', element: <UserListPage /> },
      //     { path: 'new', element: <UserCreatePage /> },
      //     { path: ':id/edit', element: <UserEditPage /> },
      //   ],
      // },

      {
        path: 'order',
        children: [
          { index: true, element: <OrderListPage /> },
          { path: 'list', element: <OrderListPage /> },
          // { path: ':id', element: <OrderDetailsPage /> },
        ],
      },
      {
        path: 'catalog',
        children: [
          { index: true, element: <CatalogCategoryProductPage /> },
          // { path: 'products', element: <CatalogProductPage /> },
          {
            path: 'products',
            children: [
              { index: true, element: <CatalogProductPage /> },
              // { path: 'list', element: <ProductListPage /> },
              // { path: ':id', element: <ProductDetailsPage /> },
              // { path: 'new', element: <ProductCreatePage /> },
              // { path: ':id/edit', element: <ProductEditPage /> },
            ],
          },
          { path: 'printer-groups', element: <CatalogPrinterGroupsPage /> },
          { path: 'modifiers', element: <CatalogModifiersPage /> },
          { path: 'product-functions', element: <CatalogProductFunctionsPage /> },

        ],
      },
    ],
  },
];
