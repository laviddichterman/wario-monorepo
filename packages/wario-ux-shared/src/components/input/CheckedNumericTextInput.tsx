import React, { useEffect, useState } from 'react';

import { type TextFieldProps, type TextFieldVariants } from '@mui/material/TextField';
import TextField from '@mui/material/TextField';

import { type DistributiveOmit, type InputNumberValue, type NumberTransformPropsAllowEmpty, type NumberTransformPropsNoEmpty, transformValueOnBlur, transformValueOnChange } from '@wcp/wario-shared';

import { normalizeSlotProps } from '@/common/SxSpreadUtils';

export type CheckedNumericInputProps<Variant extends TextFieldVariants = TextFieldVariants> = DistributiveOmit<TextFieldProps<Variant>, 'value' | 'onChange' | 'onBlur'> & {
  value: InputNumberValue;
  step?: number;
  inputMode: 'numeric' | 'decimal' | 'text';
  pattern?: string;
} & ({
  onChange: (value: number | "") => void;
  numberProps: NumberTransformPropsAllowEmpty;
} | { onChange: (value: number) => void; numberProps: NumberTransformPropsNoEmpty; });

export function CheckedNumericInput<Variant extends TextFieldVariants = TextFieldVariants>({ onChange, step, pattern, inputMode, value, numberProps, ...other }: CheckedNumericInputProps<Variant>) {
  const [inputText, setInputText] = useState(numberProps.formatFunction(value));
  const [dirty, setDirty] = useState(false);
  // Keep local input text in sync with value prop changes
  useEffect(() => {
    if (!dirty) {
      setInputText(numberProps.formatFunction(value));
    }
  }, [value, numberProps, dirty]);
  // console.log(`CheckedNumericInput render: value=${JSON.stringify(value)} inputText=${JSON.stringify(inputText)}`);
  return (
    <TextField
      {...other}
      value={inputText}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        const result = transformValueOnChange(numberProps, e.target.value);
        setDirty(true);
        setInputText(result.inputText);
        // if (result.value !== "") {
        //   onChange(result.value);
        // }
      }}
      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
        const new_val = transformValueOnBlur(numberProps, e.target.value);
        setInputText(new_val.inputText);
        // @ts-expect-error -- we know this is fine based on the props type since the onChange function will match with allowEmpty
        onChange(new_val.value);
        setDirty(false);
      }}

      slotProps={{
        ...other.slotProps,
        input: { ...normalizeSlotProps(other.slotProps?.input), pattern: pattern, inputMode },
        htmlInput: { step: step, pattern: pattern, min: numberProps.min, max: numberProps.max, ...normalizeSlotProps(other.slotProps?.htmlInput) }
      }}
    />
  )
}
