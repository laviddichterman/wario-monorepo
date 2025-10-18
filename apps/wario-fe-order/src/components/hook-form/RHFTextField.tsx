// form
import { useFormContext, Controller } from 'react-hook-form';
// @mui
import { TextField, type TextFieldProps } from '@mui/material';

// ----------------------------------------------------------------------
type IProps = {
  name: string;
  readOnly?: boolean;
};

type Props = IProps & TextFieldProps;

export function RHFTextField({ name, readOnly, slotProps, ...other }: Props) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          fullWidth
          value={typeof field.value === 'number' && field.value === 0 ? '' : field.value}
          error={!!error}
          helperText={error?.message ?? " "}
          {...other}
          slotProps={{ ...slotProps, input: { readOnly: readOnly, ...slotProps?.input } }}
        />
      )}
    />
  );
}