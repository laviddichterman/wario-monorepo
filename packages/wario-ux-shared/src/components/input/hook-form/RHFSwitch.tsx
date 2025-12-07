import React from 'react';
// form
import { Controller, useFormContext } from 'react-hook-form';

import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

// ----------------------------------------------------------------------
export function RHFSwitch({ name, label, ...other }: { name: string; label: React.ReactNode }) {
  const { control } = useFormContext();

  return (
    <FormControlLabel
      control={
        <Controller
          name={name}
          control={control}
          render={({ field }) => <Switch {...field} checked={Boolean(field.value)} />}
        />
      }
      label={label}
      {...other}
    />
  );
}
