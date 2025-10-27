// mailcheck
import Mailcheck from 'mailcheck';
import { useCallback } from 'react';
// form
import { Controller, useFormContext } from 'react-hook-form';
import { z } from "zod";

// @mui
import { TextField, type TextFieldProps } from '@mui/material';


export const ZodEmailSchema = z.email()
  .min(5, "Valid e-mail addresses are longer.")
  .refine((v) => !v.endsWith('con'), { message: ".con is not a valid TLD. Did you mean .com?" })
  .refine((v) => !v.endsWith('ney'), { message: ".ney is not a valid TLD. Did you mean .net?" });
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