
import { CatalogProductFunctionView } from '@/sections/catalog/product-functions';

import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

const metadata = { title: `Product Functions | Catalog | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <CatalogProductFunctionView />
    </>
  );
}
