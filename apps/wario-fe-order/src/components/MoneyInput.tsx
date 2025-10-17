import React, { useCallback, useState } from 'react';
import { type InputBaseComponentProps, TextField, type TextFieldProps } from '@mui/material';

type MinMax = { min: number; max?: number; } | { min?: number; max: number; };
type ParseFxnEmptyF = (v: string | null) => number;
type InputPropsEmptyF = MinMax & Omit<InputBaseComponentProps, 'min' | 'max' | 'inputMode'>;
type ChkFxnAllowEmptyFalse = { inputProps: InputPropsEmptyF } & { parseFunction: ParseFxnEmptyF; };

export interface ICheckFxnGen {
  inputProps: InputPropsEmptyF;
  parseFunction: ParseFxnEmptyF;
}

function CheckFunctionGenerator({ inputProps, parseFunction }: ChkFxnAllowEmptyFalse) {
  return (e: string | null) => {
    const parsed = parseFunction(e);
    if (Number.isNaN(parsed)) {
      return inputProps.min ?? inputProps.max as number;
    }
    if (inputProps.min && parsed < inputProps.min) {
      return inputProps.min;
    }
    if (inputProps.max && parsed > inputProps.max) {
      return inputProps.max;
    }
    return parsed;
  }
}

type TFProps = Omit<TextFieldProps, 'value' | 'onChange' | 'inputProps' | 'onBlur' | 'type'>;
type ValuePropEmptyF = { onChange: (value: number) => void; value: number; }
type CheckedNumericInputProps = ICheckFxnGen & ValuePropEmptyF & TFProps;


export function MoneyInput({ onChange, value, inputProps, parseFunction = parseInt, ...other }: CheckedNumericInputProps) {
  const CheckFxn = useCallback((v: string | null) => CheckFunctionGenerator({ inputProps, parseFunction })(v), [inputProps, parseFunction]);
  const [local_value, setLocalValue] = useState(value !== null ? String(value) : null);
  const [dirty, setDirty] = useState(false);
  const onFinishChangingLocal = () => {
    const new_val = CheckFxn(local_value);
    setDirty(false);
    setLocalValue(new_val !== null ? String(new_val) : null);
    onChange(new_val);
  }

  const onChangeLocal = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDirty(true);
    setLocalValue(event.target.value);
  }

  return (
    <TextField
      {...other}
      value={dirty ? local_value : value}
      inputProps={{ ...inputProps, inputMode: 'decimal' }}
      onChange={onChangeLocal}
      onBlur={onFinishChangingLocal}
    />
  )
}
