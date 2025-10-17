import { IMaskInput } from 'react-imask';
import { uniqueId } from 'lodash';

import { FormControl, Input, type InputProps, InputLabel } from '@mui/material';
import React from 'react';

interface CustomProps {
  onChange: (event: { target: { name: string; value: string } }) => void;
  name: string;
}

const TextMaskCustom = React.forwardRef<HTMLElement, CustomProps>(
  function TextMaskCustom(props, ref) {
    const { onChange, name, ...other } = props;
    return (
      <IMaskInput
        name={name}
        {...other}
        mask="***-**-***-CCCCCCCC"
        definitions={{
          'C': /[A-Z0-9]/,
        }}
        // @ts-ignore
        inputRef={ref}
        onAccept={(value: any) => onChange({ target: { name: name, value } })}
        overwrite
      />
    );
  },
);

export interface StoreCreditInputComponentProps {
  name: string;
  label: React.ReactNode;
  onChange: (event: { target: { name: string; value: string } }) => void;
  id: string;
  // mask: string;
  // definitions: AnyMaskedOptions;
  value: unknown;
}

export function StoreCreditInputComponent({
  name,
  label,
  onChange,
  id = uniqueId('sci-'),
  value,
  ...others }: StoreCreditInputComponentProps & InputProps) {
  return (<FormControl variant="standard">
    <InputLabel htmlFor={id}>{label}</InputLabel>
    <Input
      {...others}
      value={value}
      onChange={onChange}
      name={name}
      id={id}
      // @ts-ignore
      inputComponent={TextMaskCustom}
    />
  </FormControl>)
}

