import Autocomplete from '@mui/material/Autocomplete';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

import { FulfillmentType } from '@wcp/wario-shared';
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
    <Grid sx={{ pb: 5 }} size={12}>
      <Autocomplete
        sx={{ justifyContent: 'center', alignContent: 'center', display: 'flex', width: 300, margin: 'auto' }}
        disablePortal
        openOnFocus
        disableClearable
        disabled={serviceTime === null}
        className="guest-count"
        options={[...Array<number>(maxGuests - 1)].map((_, i) => i + 1)}
        getOptionLabel={o => String(o)}
        // @ts-expect-error needed to keep the component controlled. We get "MUI: A component is changing the uncontrolled value state of Autocomplete to be controlled." if switching to || undefined
        value={dineInInfo?.partySize ?? null}
        onChange={(_, v) => { if (v) setDineInInfo({ partySize: v }); }}
        renderInput={(params) => <TextField {...params} label="Party Size" />}
      />
    </Grid>
  );
}
