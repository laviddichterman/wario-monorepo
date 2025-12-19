import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { SeatingBuilderView } from '@/sections/seating';

import { CONFIG } from '@/config';
import { DashboardContent } from '@/layouts/dashboard';

// ----------------------------------------------------------------------

export default function SeatingBuilderPage() {
  return (
    <>
      <title> {`Seating Builder - ${CONFIG.appName}`}</title>
      <DashboardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4">Seating Layout Builder</Typography>
        </Box>
        <SeatingBuilderView />
      </DashboardContent>
    </>
  );
}
