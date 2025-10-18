// form
import { useFormContext, Controller } from 'react-hook-form';
// @mui
import { Checkbox, FormControlLabel, FormGroup, FormHelperText, type FormControlLabelProps } from '@mui/material';
import { ErrorMessage } from '@hookform/error-message';

// ----------------------------------------------------------------------
interface RHFCheckboxProps extends Omit<FormControlLabelProps, 'disabled' | 'name' | 'control'> {
  name: string;
  readOnly?: boolean;
}

export function RHFCheckbox({ name, readOnly, ...other }: RHFCheckboxProps) {
  const { control } = useFormContext();

  return (
    <FormControlLabel
      control={
        <Controller
          name={name}
          control={control}
          render={({ field, formState: { errors } }) => <>
            <Checkbox {...field} readOnly={readOnly} checked={field.value === true} />
            <ErrorMessage errors={errors} name={name} render={({ message }) => <FormHelperText error>{message}</FormHelperText>} />
          </>
          }
        />
      }
      {...other}
    />
  );
}

// ----------------------------------------------------------------------
interface RHFMultiCheckboxProps extends Omit<FormControlLabelProps, 'disabled' | 'name' | 'control' | 'label'> {
  name: string;
  options: {
    label: React.ReactNode;
    value: string;
  }[];
  readOnly?: boolean;
}

export function RHFMultiCheckbox({ name, options, readOnly, ...other }: RHFMultiCheckboxProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const onSelected = (option: string) =>
          field.value.includes(option)
            ? field.value.filter((value: string) => value !== option)
            : [...field.value, option];
        return (
          <FormGroup>
            {options.map((option) => (
              <FormControlLabel
                key={option.value}
                disabled={readOnly}
                control={
                  <Checkbox
                    readOnly
                    checked={field.value.includes(option.value)}
                    onChange={() => field.onChange(onSelected(option.value))}
                  />
                }
                label={option.label}
                {...other}
              />
            ))}
          </FormGroup>
        );
      }}
    />
  );
}
