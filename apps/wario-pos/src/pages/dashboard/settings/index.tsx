import { Card, Grid } from '@mui/material';

import { KeyValuesComponent } from '@/components/wario/keyvalues.component';
import { SettingsComponent } from '@/components/wario/settings.component';
import { StoreSettingsComponent } from '@/components/wario/store_settings.component';

import { DashboardContent } from '@/layouts/dashboard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DashboardContent>
      <Grid container spacing={3}>
        <Grid size={12}>
          <SettingsComponent />
        </Grid>
        <Grid size={12}>
          <Card>
            <StoreSettingsComponent />
          </Card>
        </Grid>
        <Grid size={12}>
          <Card>
            <KeyValuesComponent />
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
