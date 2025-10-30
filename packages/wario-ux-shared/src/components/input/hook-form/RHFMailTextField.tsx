// mailcheck
import Mailcheck from 'mailcheck';
import { useCallback } from 'react';
// form
import { Controller, useFormContext } from 'react-hook-form';

// @mui
import { TextField, type TextFieldProps } from '@mui/material';


// ----------------------------------------------------------------------
type IProps = {
  name: string;
};

type Props = IProps & TextFieldProps;

export function RHFMailTextField({ name, error, ...other }: Props) {
  const { control } = useFormContext();
  const getSuggestion = useCallback((value: string) => {
    let sug = ""
    const cb = (suggestion: MailcheckModule.ISuggestion) => {
      sug = suggestion.full;
    };
    Mailcheck.run({ email: value, suggested: cb });
    return sug;
  }, []);
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error: fsError } }) => {
        const suggestion = getSuggestion(field.value as string);
        return (
          <TextField
            {...field}
            fullWidth
            value={field.value as string || ""}
            error={!!fsError || error}
            helperText={fsError?.message || (suggestion ? `Did you mean ${suggestion}?` : " ")}
            {...other}
          />
        )
      }}
    />
  );
}