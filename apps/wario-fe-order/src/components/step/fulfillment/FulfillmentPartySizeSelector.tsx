import Autocomplete from '@mui/material/Autocomplete';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { FulfillmentType } from '@wcp/wario-shared/logic';
import { useFulfillmentMaxGuests, useFulfillmentService } from '@wcp/wario-ux-shared/query';

import { useFulfillmentStore } from '@/stores/useFulfillmentStore';

export default function FulfillmentPartySizeSelector() {
  const selectedService = useFulfillmentStore((s) => s.selectedService);
  const serviceTime = useFulfillmentStore((s) => s.selectedTime);
  const dineInInfo = useFulfillmentStore((s) => s.dineInInfo);
  const setDineInInfo = useFulfillmentStore((s) => s.setDineInInfo);
  const serviceType = useFulfillmentService(selectedService);
  const maxGuests = useFulfillmentMaxGuests(selectedService) ?? 50;

  // Only render for dine-in service
  if (serviceType !== FulfillmentType.DineIn) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 2,
        width: '100%',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontFamily: 'Source Sans Pro',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 600,
          mb: 2,
          color: 'text.secondary',
        }}
      >
        Party Details
      </Typography>
      <Autocomplete
        sx={{
          width: { xs: '100%', sm: 300 },
          maxWidth: '100%',
        }}
        disablePortal
        openOnFocus
        disableClearable
        disabled={serviceTime === null}
        className="guest-count"
        options={[...Array<number>(maxGuests - 1)].map((_, i) => i + 1)}
        getOptionLabel={(o) => String(o)}
        // @ts-expect-error needed to keep the component controlled. We get "MUI: A component is changing the uncontrolled value state of Autocomplete to be controlled." if switching to || undefined
        value={dineInInfo?.partySize ?? null}
        onChange={(_, v) => {
          if (v) setDineInInfo({ partySize: v });
        }}
        renderInput={(params) => <TextField {...params} label="Party Size" />}
      />
    </Paper>
  );
}
