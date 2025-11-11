import React from 'react';
// form
import { Controller, useFormContext } from 'react-hook-form';

// @mui
import { type TextFieldProps } from '@mui/material/TextField';
import TextField from '@mui/material/TextField';

// ----------------------------------------------------------------------
type IProps = {
  name: string;
  children: React.ReactNode;
};

type Props = IProps & TextFieldProps;

export function RHFSelect({ name, children, ...other }: Props) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          select
          fullWidth
          slotProps={{ select: { native: true } }}
          error={!!error}
          helperText={error?.message}
          {...other}
        >
          {children}
        </TextField>
      )}
    />
  );
}