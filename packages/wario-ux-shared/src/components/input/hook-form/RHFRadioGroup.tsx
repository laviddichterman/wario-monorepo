// form
import { Controller, useFormContext } from 'react-hook-form';

import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Radio from '@mui/material/Radio';
import { type RadioGroupProps } from '@mui/material/RadioGroup';
import RadioGroup from '@mui/material/RadioGroup';

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
