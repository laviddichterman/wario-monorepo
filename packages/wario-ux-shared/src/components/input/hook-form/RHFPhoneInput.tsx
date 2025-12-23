import React from 'react';
import { type FieldError, useFormContext } from 'react-hook-form';
import PhoneInput, { type Country } from 'react-phone-number-input/react-hook-form-input-core';

import { type TextFieldProps } from '@mui/material/TextField';
import TextField from '@mui/material/TextField';

import { normalizeSlotProps } from '@/common';
import { PHONE_METADATA as LIBPHONE_METADATA } from '@/common/phone-metadata';

type PhoneInputTextFieldProps = Omit<TextFieldProps, 'ref'>;

const PhoneInputTextField = React.forwardRef<HTMLInputElement, PhoneInputTextFieldProps>(
  function PhoneInputTextField(props, ref) {
    return <TextField {...props} inputRef={ref} />;
  },
);
PhoneInputTextField.displayName = 'PhoneInputTextField';

type PhoneInputProps = Parameters<typeof PhoneInput<PhoneInputTextFieldProps>>[0];

export type RHFPhoneInputProps = Omit<
  PhoneInputProps,
  'metadata' | 'inputComponent' | 'error' | 'control' | 'country' | 'label'
> & {
  country: Country;
  label: React.ReactNode;
  error?: FieldError;
};

export function RHFPhoneInput({ error, slotProps, ...other }: RHFPhoneInputProps) {
  const { control } = useFormContext();
  const mergedSlotProps: PhoneInputTextFieldProps['slotProps'] = {
    ...slotProps,
    htmlInput: {
      inputMode: 'tel',
      ...normalizeSlotProps(slotProps?.htmlInput),
    },
  };

  return (
    <PhoneInput<PhoneInputTextFieldProps>
      smartCaret
      control={control}
      metadata={LIBPHONE_METADATA}
      inputComponent={PhoneInputTextField}
      error={!!error}
      autoComplete="mobile tel"
      helperText={error?.message ?? ' '}
      slotProps={mergedSlotProps}
      {...other}
    />
  );
}
