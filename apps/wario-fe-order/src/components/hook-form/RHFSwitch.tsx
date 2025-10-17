// form
import { useFormContext, Controller } from 'react-hook-form';
// @mui
import { Switch, FormControlLabel } from '@mui/material';
import React from 'react';

// ----------------------------------------------------------------------
export function RHFSwitch({ name, label, ...other }: { name: string, label: React.ReactNode }) {
  const { control } = useFormContext();

  return (
    <FormControlLabel
      control={
        <Controller name={name} control={control} render={({ field }) => <Switch {...field} checked={field.value} />} />
      }
      label
      {...other}
    />
  );
}
