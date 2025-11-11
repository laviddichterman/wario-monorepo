import { formatDate, isDate, isValid } from 'date-fns';
import { Controller, useFormContext } from 'react-hook-form';

import type { DatePickerProps } from '@mui/x-date-pickers/DatePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { DateTimePickerProps } from '@mui/x-date-pickers/DateTimePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { PickersTextFieldProps } from '@mui/x-date-pickers/PickersTextField';
import type { TimePickerProps } from '@mui/x-date-pickers/TimePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

// ----------------------------------------------------------------------

type DateInput = Date | string | number | null | undefined;

function normalizeDateValue(value: DateInput): Date | null {
  if (isDate(value)) return value;

  const parsed = value ? new Date(value) : null;
  return isValid(parsed) ? parsed : null;
}

// ----------------------------------------------------------------------

type PickerProps<T extends DatePickerProps | TimePickerProps | DateTimePickerProps> = T & {
  name: string;
  slotProps?: T['slotProps'] & {
    textField?: Partial<PickersTextFieldProps>;
  };
};

export function RHFDatePicker({ name, slotProps, ...other }: PickerProps<DatePickerProps>) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <DatePicker
          {...field}
          value={normalizeDateValue(field.value as DateInput)}
          onChange={(newValue) => {
            if (!newValue) {
              field.onChange(null);
              return;
            }

            const parsedValue = new Date(newValue);
            field.onChange(isValid(parsedValue) ? formatDate(parsedValue, 'yyyy-MM-dd') : newValue);
          }}
          slotProps={{
            ...slotProps,
            textField: {
              // eslint-disable-next-line @typescript-eslint/no-misused-spread
              ...slotProps?.textField,
              error: !!error,
              helperText: error?.message ?? slotProps?.textField?.helperText,
            },
          }}
          {...other}
        />
      )}
    />
  );
}

// ----------------------------------------------------------------------

export function RHFTimePicker({ name, slotProps, ...other }: PickerProps<TimePickerProps>) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TimePicker
          {...field}
          value={normalizeDateValue(field.value as DateInput)}
          onChange={(newValue) => {
            if (!newValue) {
              field.onChange(null);
              return;
            }

            const parsedValue = new Date(newValue);
            field.onChange(isValid(parsedValue) ? formatDate(parsedValue, 'HH:mm') : newValue);
          }}
          slotProps={{
            ...slotProps,
            textField: {
              // eslint-disable-next-line @typescript-eslint/no-misused-spread
              ...slotProps?.textField,
              error: !!error,
              helperText: error?.message ?? slotProps?.textField?.helperText,
            },
          }}
          {...other}
        />
      )}
    />
  );
}

// ----------------------------------------------------------------------

export function RHFDateTimePicker({ name, slotProps, ...other }: PickerProps<DateTimePickerProps>) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <DateTimePicker
          {...field}
          value={normalizeDateValue(field.value as DateInput)}
          onChange={(newValue) => {
            if (!newValue) {
              field.onChange(null);
              return;
            }
            const parsedValue = new Date(newValue);
            field.onChange(isValid(parsedValue) ? formatDate(parsedValue, 'yyyy-MM-dd HH:mm') : newValue);
          }}
          slotProps={{
            ...slotProps,
            textField: {
              // eslint-disable-next-line @typescript-eslint/no-misused-spread
              ...slotProps?.textField,
              error: !!error,
              helperText: error?.message ?? slotProps?.textField?.helperText,
            },
          }}
          {...other}
        />
      )}
    />
  );
}
