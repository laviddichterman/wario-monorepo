import { Autocomplete, TextField } from '@mui/material';

import type { useFulfillments } from '@wcp/wario-ux-shared/query';

interface DisabledServicesAutocompleteProps {
  value: string[];
  onChange: (value: string[]) => void;
  fulfillments: ReturnType<typeof useFulfillments>;
  disabled?: boolean;
}

export const DisabledServicesAutocomplete = ({
  value,
  onChange,
  fulfillments,
  disabled,
}: DisabledServicesAutocompleteProps) => (
  <Autocomplete
    multiple
    fullWidth
    filterSelectedOptions
    options={fulfillments.map((x) => x.id)}
    value={value}
    onChange={(_, v) => {
      onChange(v);
    }}
    getOptionLabel={(option) => fulfillments.find((v) => v.id === option)?.displayName ?? 'INVALID'}
    isOptionEqualToValue={(option, val) => option === val}
    renderInput={(params) => <TextField {...params} label="Disabled Services" />}
    disabled={disabled}
  />
);
