import React, { useEffect, useState } from 'react';

import { TextField, type TextFieldProps } from '@mui/material';

import { type InputNumberValue, type NumberTransformProps, transformValueOnBlur, transformValueOnChange } from '@wcp/wario-shared';

export type CheckedNumericInputProps = Omit<TextFieldProps, 'value' | 'onChange' | 'onBlur'> & {
  value: InputNumberValue;
  onChange: (value: number | "") => void;
  numberProps: NumberTransformProps;
  step?: number;
  inputMode: 'numeric' | 'decimal' | 'text';
  pattern?: string;
};

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
        onChange(new_val.value);
      }}
      // eslint-disable-next-line @typescript-eslint/no-misused-spread
      slotProps={{ ...other.slotProps, htmlInput: { step: step, pattern: pattern, inputMode: inputMode, min: numberProps.min, max: numberProps.max, ...(other.slotProps?.htmlInput ?? {}) } }}
    />
  )
}