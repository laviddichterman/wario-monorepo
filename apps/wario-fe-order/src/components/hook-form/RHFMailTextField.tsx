// form
import { useFormContext, Controller } from 'react-hook-form';
// @mui
import { TextField, type TextFieldProps } from '@mui/material';
// mailcheck
import Mailcheck from 'mailcheck';
import { useCallback } from 'react';
import type * as yup from "yup";

export const YupValidateEmail = (schema: yup.StringSchema) =>
  schema.ensure()
    .email("Please enter a valid e-mail address.")
    .required("Please enter a valid e-mail address.")
    .min(5, "Valid e-mail addresses are longer.")
    .test('DotCon',
      ".con is not a valid TLD. Did you mean .com?",
      (v) => !v || v.substring(v.length - 3) === 'con' ? false : true)
// ----------------------------------------------------------------------
type IProps = {
  name: string;
  readOnly?: boolean;
};

type Props = IProps & TextFieldProps;

export function RHFMailTextField({ name, error, readOnly, inputProps, ...other }: Props) {
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
        const suggestion = getSuggestion(field.value);
        return (
          <TextField
            {...field}
            fullWidth
            value={field.value || ""}
            error={!!fsError || error}
            helperText={fsError?.message || (suggestion ? `Did you mean ${suggestion}?` : " ")}
            inputProps={{ readOnly: readOnly, ...inputProps }}
            {...other}
          />
        )
      }}
    />
  );
}