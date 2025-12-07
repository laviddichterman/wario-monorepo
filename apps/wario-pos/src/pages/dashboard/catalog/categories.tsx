import { CatalogCategoryProductView } from '@/sections/catalog/category-product';

import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

const metadata = { title: `Category Product View | Catalog | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <CatalogCategoryProductView />
    </>
  );
}
