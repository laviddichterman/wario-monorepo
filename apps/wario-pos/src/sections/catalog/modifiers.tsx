import Grid from '@mui/material/Grid';
import type { SxProps, Theme } from '@mui/material/styles';

import { paths } from '@/routes/paths';

import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';
import ModifierTypeTableContainer from '@/components/wario/menu/modifier_type/modifier_type_table.container';

import { DashboardContent } from '@/layouts/dashboard';
// ----------------------------------------------------------------------

type Props = {
  title?: string;
  description?: string;
  sx?: SxProps<Theme>;
};

export function CatalogModifierView(_props: Props) {
  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Modifiers"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Catalog', href: paths.dashboard.catalog.root },
            { name: 'Modifiers', href: paths.dashboard.catalog.modifiers },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Grid container spacing={2}>
          <Grid size={12}>
            <ModifierTypeTableContainer />
          </Grid>
        </Grid>
      </DashboardContent>
    </>
  );
}
