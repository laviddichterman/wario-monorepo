import { CatalogProductView } from '@/sections/catalog/products';

import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

const metadata = { title: `Products | Catalog | Dashboard - ${CONFIG.appName}` };

export default function Page() {

  return (
    <>
      <title>{metadata.title}</title>
      <CatalogProductView />
    </>
  );
}
