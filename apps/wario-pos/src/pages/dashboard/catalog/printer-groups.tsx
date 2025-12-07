import { CatalogPrinterGroupView } from '@/sections/catalog/printer-groups';

import { RoleBasedGuard } from '@/auth/guard';

import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

const metadata = { title: `Printer Groups | Catalog | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <RoleBasedGuard scopes={['write:order']}>
        <CatalogPrinterGroupView />
      </RoleBasedGuard>
    </>
  );
}
