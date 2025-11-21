import ModifierTypeTableContainer from '@/components/wario/menu/modifier_type/modifier_type_table.container';

import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

const metadata = { title: `Modifiers | Catalog | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <ModifierTypeTableContainer />
    </>
  );
}
