import Grid from '@mui/material/Grid';
import type { SxProps, Theme } from '@mui/material/styles';

import { paths } from '@/routes/paths';

import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';
import PrinterGroupTableContainer from '@/components/wario/menu/printer_group/PrinterGroupTableContainer';

import { DashboardContent } from '@/layouts/dashboard';

// ----------------------------------------------------------------------

type Props = {
  title?: string;
  description?: string;
  sx?: SxProps<Theme>;
};

export function CatalogPrinterGroupView(_props: Props) {
  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Printer Groups"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Catalog', href: paths.dashboard.catalog.root },
            { name: 'Printer Groups', href: paths.dashboard.catalog.printergroups },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Grid container spacing={2}>
          <Grid size={12}>
            <PrinterGroupTableContainer />
          </Grid>
        </Grid>
      </DashboardContent>
    </>
  );
}
