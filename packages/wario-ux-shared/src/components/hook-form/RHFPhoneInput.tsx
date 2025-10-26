import React from 'react';
import { type FieldError, useFormContext } from 'react-hook-form';
import PhoneInput, { type Country, } from 'react-phone-number-input/react-hook-form-input-core'

import { TextField, type TextFieldProps } from '@mui/material';

import { PHONE_METADATA as LIBPHONE_METADATA } from '@/phone-metadata';
interface IPhoneInputParams {
  name: string;
  country: Country;
  error: FieldError | undefined;
  label: React.ReactNode;
  placeholder?: TextFieldProps['placeholder'];
  [x: string]: unknown;
};

export function RHFPhoneInput({ placeholder, error, label, country, name, ...other }: IPhoneInputParams & Omit<TextFieldProps, 'error' | 'name' | 'label'>) {

  const InputComponent = React.forwardRef((props, ref) =>
    <TextField {...props}
      inputRef={ref}
      error={!!error}
      inputMode="tel"
      autoComplete="mobile tel"
      helperText={error?.message ?? " "}
      placeholder={placeholder}
      label={label}
      {...other}
    />);

  const { control } = useFormContext();
  return (
    <PhoneInput
      smartCaret
      control={control}
      name={name}
      metadata={LIBPHONE_METADATA}
      country={country}
      inputComponent={InputComponent}
    />
  );


}
