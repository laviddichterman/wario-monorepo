// form
import { Controller, useFormContext } from 'react-hook-form';

import Box, { type BoxProps } from '@mui/material/Box';
import Checkbox, { type CheckboxProps } from '@mui/material/Checkbox';
import FormControl, { type FormControlProps } from '@mui/material/FormControl';
import FormControlLabel, { type FormControlLabelProps } from '@mui/material/FormControlLabel';
import FormGroup, { type FormGroupProps } from '@mui/material/FormGroup';
import type { FormHelperTextProps } from '@mui/material/FormHelperText';
import type { FormLabelProps } from '@mui/material/FormLabel';
import FormLabel from '@mui/material/FormLabel';

import { normalizeSlotProps, spreadSx } from '@/common/SxSpreadUtils';

import { HelperText } from './HelpText';

// ----------------------------------------------------------------------
type RHFCheckboxProps = Omit<FormControlLabelProps, 'control' | 'name'> & {
  name: string;
  helperText?: React.ReactNode;
  slotProps?: {
    wrapper?: BoxProps;
    checkbox?: CheckboxProps;
    helperText?: FormHelperTextProps;
  };
};

export function RHFCheckbox({ sx, name, label, slotProps, helperText, ...other }: RHFCheckboxProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Box {...slotProps?.wrapper}>
          <FormControlLabel
            label={label}
            control={
              <Checkbox
                {...field}
                checked={field.value as boolean}
                {...slotProps?.checkbox}
                slotProps={{
                  ...slotProps?.checkbox?.slotProps,
                  input: {
                    id: `${name}-checkbox`,
                    ...(!label && { 'aria-label': `${name} checkbox` }),
                    ...normalizeSlotProps(slotProps?.checkbox?.slotProps?.input),
                  },
                }}
              />
            }
            sx={[{ mx: 0 }, ...spreadSx(sx)]}
            {...other}
          />
          <HelperText {...slotProps?.helperText} errorMessage={error?.message} helperText={helperText} />
        </Box>
      )}
    />
  );
}

// interface RHFCheckboxProps extends Omit<FormControlLabelProps, 'disabled' | 'name' | 'control'> {
//   name: string;
//   readOnly?: boolean;
// }

// export function RHFCheckbox({ name, readOnly, ...other }: RHFCheckboxProps) {
//   const { control } = useFormContext();

//   return (
//     <FormControlLabel
//       control={
//         <Controller
//           name={name}
//           control={control}
//           render={({ field, formState: { errors } }) => <>
//             <Checkbox {...field} readOnly={readOnly} checked={field.value === true} />
//             <ErrorMessage errors={errors} name={name} render={({ message }) => <FormHelperText error>{message}</FormHelperText>} />
//           </>
//           }
//         />
//       }
//       {...other}
//     />
//   );
// }

// ----------------------------------------------------------------------

type RHFMultiCheckboxProps = FormGroupProps & {
  name: string;
  label?: string;
  helperText?: React.ReactNode;
  options: { label: string; value: string }[];
  slotProps?: {
    wrapper?: FormControlProps;
    checkbox?: CheckboxProps;
    formLabel?: FormLabelProps;
    helperText?: FormHelperTextProps;
  };
};

export function RHFMultiCheckbox({ name, label, options, slotProps, helperText, ...other }: RHFMultiCheckboxProps) {
  const { control } = useFormContext();

  const getSelected = (selectedItems: string[], item: string) =>
    selectedItems.includes(item) ? selectedItems.filter((value) => value !== item) : [...selectedItems, item];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl component="fieldset" {...slotProps?.wrapper}>
          {label && (
            <FormLabel
              component="legend"
              {...slotProps?.formLabel}
              sx={[{ mb: 1, typography: 'body2' }, ...spreadSx(slotProps?.formLabel?.sx)]}
            >
              {label}
            </FormLabel>
          )}

          <FormGroup {...other}>
            {options.map((option) => (
              <FormControlLabel
                key={option.value}
                control={
                  <Checkbox
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    checked={field.value.includes(option.value)}
                    onChange={() => {
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                      field.onChange(getSelected(field.value, option.value));
                    }}
                    {...slotProps?.checkbox}
                    slotProps={{
                      ...slotProps?.checkbox?.slotProps,
                      input: {
                        id: `${option.label}-checkbox`,
                        ...(!option.label && { 'aria-label': `${option.label} checkbox` }),

                        ...normalizeSlotProps(slotProps?.checkbox?.slotProps?.input),
                      },
                    }}
                  />
                }
                label={option.label}
              />
            ))}
          </FormGroup>

          <HelperText {...slotProps?.helperText} disableGutters errorMessage={error?.message} helperText={helperText} />
        </FormControl>
      )}
    />
  );
}

// interface RHFMultiCheckboxProps extends Omit<FormControlLabelProps, 'disabled' | 'name' | 'control' | 'label'> {
//   name: string;
//   options: {
//     label: React.ReactNode;
//     value: string;
//   }[];
//   readOnly?: boolean;
// }

// export function RHFMultiCheckbox({ name, options, readOnly, ...other }: RHFMultiCheckboxProps) {
//   const { control } = useFormContext();

//   const getSelected = (selectedItems: string[], item: string) =>
//     selectedItems.includes(item)
//       ? selectedItems.filter((value) => value !== item)
//       : [...selectedItems, item];

//   return (
//     <Controller
//       name={name}
//       control={control}
//       render={({ field, fieldState: { error } }) => {
//         const onSelected = (option: string) => {
//           const currentValue = Array.isArray(field.value) ? field.value : [];
//           return currentValue.includes(option)
//             ? currentValue.filter((value: string) => value !== option)
//             : [...currentValue, option];
//         };
//         return (
//           <FormGroup>
//             {options.map((option) => (
//               <FormControlLabel
//                 key={option.value}
//                 disabled={readOnly}
//                 control={
//                   <Checkbox
//                     readOnly
//                     checked={field.value.includes(option.value)}
//                     onChange={() => { field.onChange(onSelected(option.value)); }}
//                   />
//                 }
//                 label={option.label}
//                 {...other}
//               />
//             ))}
//             <p>{error?.message}</p>
//           </FormGroup>
//         );
//       }}
//     />
//   );
// }
