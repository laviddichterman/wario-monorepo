import Autocomplete from '@mui/material/Autocomplete';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

interface FulfillmentPartySizeSelectorProps {
  partySize: number | null;
  maxGuests: number;
  disabled: boolean;
  onChange: (size: number | null) => void;
}

export default function FulfillmentPartySizeSelector({ partySize, maxGuests, disabled, onChange }: FulfillmentPartySizeSelectorProps) {
  return (
    <Grid sx={{ pb: 5 }} size={12}>
      <Autocomplete
        sx={{ justifyContent: 'center', alignContent: 'center', display: 'flex', width: 300, margin: 'auto' }}
        disablePortal
        openOnFocus
        disableClearable
        disabled={disabled}
        className="guest-count"
        options={[...Array<number>(maxGuests - 1)].map((_, i) => i + 1)}
        getOptionLabel={o => String(o)}
        // @ts-expect-error needed to keep the component controlled. We get "MUI: A component is changing the uncontrolled value state of Autocomplete to be controlled." if switching to || undefined
        value={partySize || null}
        onChange={(_, v) => { onChange(v); }}
        renderInput={(params) => <TextField {...params} label="Party Size" />}
      />
    </Grid>
  );
}
