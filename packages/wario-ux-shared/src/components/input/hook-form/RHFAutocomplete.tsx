import { Controller, useFormContext } from 'react-hook-form';

import type { AutocompleteProps } from '@mui/material/Autocomplete';
import Autocomplete from '@mui/material/Autocomplete';
import type { TextFieldProps } from '@mui/material/TextField';
import TextField from '@mui/material/TextField';

// ----------------------------------------------------------------------

type Multiple = boolean | undefined;
type DisableClearable = boolean | undefined;
type FreeSolo = boolean | undefined;

type ExcludedProps = 'renderInput';

export type AutocompleteBaseProps = Omit<
  AutocompleteProps<unknown, Multiple, DisableClearable, FreeSolo>,
  ExcludedProps
>;

export type RHFAutocompleteProps = AutocompleteBaseProps & {
  name: string;
  label?: string;
  placeholder?: string;
  helperText?: React.ReactNode;
  slotProps?: AutocompleteBaseProps['slotProps'] & {
    textField?: Partial<TextFieldProps>;
  };
};

export function RHFAutocomplete({
  name,
  label,
  slotProps,
  helperText,
  placeholder,
  ...other
}: RHFAutocompleteProps) {
  const { control, setValue } = useFormContext();

  const { textField, ...otherSlotProps } = slotProps ?? {};

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Autocomplete
          {...field}
          id={`${name}-rhf-autocomplete`}
          onChange={(_event, newValue) => { setValue(name, newValue, { shouldValidate: true }); }}
          renderInput={(params) => (
            <TextField
              {...params}
              {...textField}
              label={label}
              placeholder={placeholder}
              error={!!error}
              helperText={error?.message ?? helperText}
              slotProps={{
                ...textField?.slotProps,
                htmlInput: {
                  ...params.inputProps,
                  // eslint-disable-next-line @typescript-eslint/no-misused-spread
                  ...textField?.slotProps?.htmlInput,
                  autoComplete: 'new-password', // Disable autocomplete and autofill
                },
              }}
            />
          )}
          slotProps={{
            ...otherSlotProps,
            chip: {
              size: 'small',
              // eslint-disable-next-line @typescript-eslint/no-misused-spread
              ...otherSlotProps.chip,
            },
          }}
          {...other}
        />
      )}
    />
  );
}
