import React, { useEffect, useState } from 'react';

import { TextField, type TextFieldProps } from '@mui/material';

import { type InputNumberValue, type NumberTransformPropsAllowEmpty, type NumberTransformPropsNoEmpty, transformValueOnBlur, transformValueOnChange } from '@wcp/wario-shared';

export type CheckedNumericInputProps = Omit<TextFieldProps, 'value' | 'onChange' | 'onBlur'> & {
  value: InputNumberValue;
  step?: number;
  inputMode: 'numeric' | 'decimal' | 'text';
  pattern?: string;

} & ({
  onChange: (value: number | "") => void;
  numberProps: NumberTransformPropsAllowEmpty;
} | { onChange: (value: number) => void; numberProps: NumberTransformPropsNoEmpty; });

export function CheckedNumericInput({ onChange, step, pattern, inputMode, value, numberProps, ...other }: CheckedNumericInputProps) {
  const [inputText, setInputText] = useState(numberProps.formatFunction(value));
  // Keep local input text in sync with value prop changes
  useEffect(() => {
    setInputText(numberProps.formatFunction(value));
  }, [numberProps, value]);
  return (
    <TextField
      {...other}
      value={inputText}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        const result = transformValueOnChange(numberProps, e.target.value);
        setInputText(result.inputText);
        if (result.value !== "") {
          onChange(result.value);
        }
      }}
      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
        const new_val = transformValueOnBlur(numberProps, e.target.value);
        setInputText(new_val.inputText);
        // @ts-expect-error -- we know this is fine based on the props type since the onChange function will match with allowEmpty
        onChange(new_val.value);
      }}
      // eslint-disable-next-line @typescript-eslint/no-misused-spread
      slotProps={{ ...other.slotProps, htmlInput: { step: step, pattern: pattern, inputMode: inputMode, min: numberProps.min, max: numberProps.max, ...(other.slotProps?.htmlInput ?? {}) } }}
    />
  )
}