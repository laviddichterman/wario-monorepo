import { Controller, useFormContext } from 'react-hook-form';

import type { TextFieldProps } from '@mui/material/TextField';
import TextField from '@mui/material/TextField';

import {
  formatDecimal,
  type InputNumberValue,
  parseDecimal,
  transformValueOnBlur,
  transformValueOnChange,
} from '@wcp/wario-shared';

// ----------------------------------------------------------------------

export type RHFTextFieldProps = TextFieldProps & {
  name: string;
};

export function RHFTextField({ name, helperText, slotProps, type = 'text', ...other }: RHFTextFieldProps) {
  const { control } = useFormContext();

  const isNumberType = type === 'number';

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          fullWidth
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          value={isNumberType ? formatDecimal(field.value as InputNumberValue) : field.value}
          onChange={(event) => {
            const transformedValue = isNumberType
              ? transformValueOnChange(
                  {
                    allowEmpty: true,
                    formatFunction: (v: InputNumberValue) => formatDecimal(v),
                    parseFunction: parseDecimal,
                  },
                  event.target.value,
                )
              : event.target.value;

            field.onChange(transformedValue);
          }}
          onBlur={(event) => {
            // IMPORTANT: trigger the field's onBlur first to ensure react-hook-form processes the blur event
            field.onBlur();
            const transformedValue = isNumberType
              ? transformValueOnBlur(
                  {
                    allowEmpty: true,
                    formatFunction: (v: InputNumberValue) => formatDecimal(v),
                    parseFunction: parseDecimal,
                  },
                  event.target.value,
                )
              : event.target.value;

            field.onChange(transformedValue);
          }}
          type={isNumberType ? 'text' : type}
          error={!!error}
          helperText={error?.message ?? helperText}
          slotProps={{
            ...slotProps,
            htmlInput: {
              // eslint-disable-next-line @typescript-eslint/no-misused-spread
              ...slotProps?.htmlInput,
              ...(isNumberType && {
                inputMode: 'decimal',
                pattern: '[0-9]*\\.?[0-9]*',
              }),
              autoComplete: 'new-password', // Disable autocomplete and autofill
            },
          }}
          {...other}
        />
      )}
    />
  );
}
