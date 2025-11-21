import Grid from '@mui/material/Grid';
import type { SxProps, Theme } from '@mui/material/styles';

import { paths } from '@/routes/paths';

import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';
import ProductInstanceFunctionTableContainer from '@/components/wario/menu/product_instance_function/product_instance_function_table.container';

import { DashboardContent } from '@/layouts/dashboard';

// ----------------------------------------------------------------------

type Props = {
  title?: string;
  description?: string;
  sx?: SxProps<Theme>;
};


export function CatalogProductFunctionView(_props: Props) {
  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Product Instance Functions"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Catalog', href: paths.dashboard.catalog.root },
            { name: 'Product Instance Functions', href: paths.dashboard.catalog.productfunctions },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Grid container spacing={2}>
          <Grid size={12}>
            <ProductInstanceFunctionTableContainer />
          </Grid>
        </Grid>
      </DashboardContent>
    </>
  );
}