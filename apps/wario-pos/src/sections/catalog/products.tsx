import Grid from 'node_modules/@mui/material/esm/Grid/Grid';

import type { SxProps, Theme } from '@mui/material/styles';

import { paths } from '@/routes/paths';

import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';
import CatalogTableContainer from '@/components/wario/menu/category/catalog_table.container';

import { DashboardContent } from '@/layouts/dashboard';

// ----------------------------------------------------------------------

type Props = {
  title?: string;
  description?: string;
  sx?: SxProps<Theme>;
};


export function CatalogProductView(_props: Props) {

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="List"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Catalog', href: paths.dashboard.catalog.root },
            { name: 'Products/Categories' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Grid container spacing={2}>
          <Grid size={12}>
            <CatalogTableContainer />
          </Grid>
        </Grid>
      </DashboardContent>
    </>
  );
}