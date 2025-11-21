import { OrderListView } from '@/sections/order/view/order-list-view';

import { RoleBasedGuard } from '@/auth/guard';

import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

const metadata = { title: `Order list | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <RoleBasedGuard scopes={['read:order']}>
        <OrderListView />
      </RoleBasedGuard>
    </>
  );
}
