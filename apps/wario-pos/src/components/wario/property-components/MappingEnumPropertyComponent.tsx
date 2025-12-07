import { kebabCase, snakeCase, startCase } from 'es-toolkit/compat';

import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup } from '@mui/material';

import { type ValSetVal } from '@wcp/wario-ux-shared/common';

export type MappingEnumPropertyComponentProps<TEnum> = {
  options: Record<string, TEnum>;
  label: string;
  disabled: boolean;
} & ValSetVal<TEnum>;

export function MappingEnumPropertyComponent<T>(props: MappingEnumPropertyComponentProps<T>) {
  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">{props.label}</FormLabel>
      <RadioGroup
        aria-label={kebabCase(props.label)}
        name={kebabCase(props.label)}
        row
        value={props.value}
        onChange={(e) => {
          props.setValue(e.target.value as T);
        }}
      >
        {Object.entries(props.options).map(([k, v], i) => (
          <FormControlLabel key={i} value={v} control={<Radio />} label={startCase(snakeCase(k))} />
        ))}
      </RadioGroup>
    </FormControl>
  );
}
