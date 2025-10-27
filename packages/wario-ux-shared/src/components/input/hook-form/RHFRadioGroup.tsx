// form
import { Controller, useFormContext } from 'react-hook-form';

// @mui
import {
  FormControlLabel,
  FormHelperText,
  Radio,
  RadioGroup,
  type RadioGroupProps,
} from '@mui/material';

// ----------------------------------------------------------------------

type IProps = {
  name: string;
  options: {
    label: string;
    value: string;
  }[];
};

type Props = IProps & RadioGroupProps;

export function RHFRadioGroup({ name, options, ...other }: Props) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      defaultValue=''
      render={({ field, fieldState: { error } }) => (
        <div>
          <RadioGroup {...field} row {...other}>
            {options.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio />}
                label={option.label}
              />
            ))}
          </RadioGroup>

          {!!error && (
            <FormHelperText error sx={{ px: 2 }}>
              {error.message}
            </FormHelperText>
          )}
        </div>
      )}
    />
  );
}
