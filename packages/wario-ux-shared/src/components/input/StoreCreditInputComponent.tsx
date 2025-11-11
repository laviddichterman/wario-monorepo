import { uniqueId } from 'es-toolkit/compat';
import React from 'react';
import { IMaskInput } from 'react-imask';

import FormControl from '@mui/material/FormControl';
import Input from '@mui/material/Input';
import { type InputBaseComponentProps } from '@mui/material/InputBase';
import InputLabel from '@mui/material/InputLabel';

interface CustomInputProps {
  onChange: (event: { target: { name: string; value: string } }) => void;
  name?: string;
}

const TextMaskCustom = React.forwardRef<HTMLInputElement, CustomInputProps>(
  function TextMaskCustom(props, ref) {
    const { onChange, name = '', ...other } = props;
    return (
      <IMaskInput
        {...other}
        mask="***-**-***-CCCCCCCC"
        definitions={{
          'C': /[A-Z0-9]/,
        }}
        inputRef={ref}
        onAccept={(value: string) => {
          onChange({ target: { name, value } });
        }}
        overwrite
      />
    );
  },
);

export interface StoreCreditInputComponentProps {
  name: string;
  label: React.ReactNode;
  onChange: (event: { target: { name: string; value: string } }) => void;
  id?: string;
  value: unknown;
}

export function StoreCreditInputComponent({
  name,
  label,
  onChange,
  id = uniqueId('sci-'),
  value,
  ...others }: StoreCreditInputComponentProps & Omit<InputBaseComponentProps, 'onChange' | 'name' | 'id'>) {

  return (
    <FormControl variant="standard">
      <InputLabel htmlFor={id}>{label}</InputLabel>
      <Input
        {...others}
        value={value}
        onChange={onChange}
        name={name}
        id={id}
        // @ts-expect-error this really doesn't like requiring the onChange method
        inputComponent={TextMaskCustom}
      />
    </FormControl>
  );
}

