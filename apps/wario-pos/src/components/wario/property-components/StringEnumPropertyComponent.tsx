import { kebabCase, snakeCase, startCase } from "es-toolkit/compat";

import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup } from "@mui/material";

import { type ValSetVal } from "@wcp/wario-ux-shared";

export type StringEnumPropertyComponentProps<TEnum> = {
  options: (keyof TEnum)[];
  label: string;
  disabled: boolean;
} & ValSetVal<keyof TEnum>;

export function StringEnumPropertyComponent<T>(props: StringEnumPropertyComponentProps<T>) {
  return (<FormControl component="fieldset">
    <FormLabel component="legend">{props.label}</FormLabel>
    <RadioGroup
      aria-label={kebabCase(props.label)}
      name={kebabCase(props.label)}
      row
      value={props.value}
      onChange={(e) => { props.setValue(e.target.value as keyof T); }}
    >
      {props.options.map((opt, i) =>
        <FormControlLabel
          key={i}
          value={opt}
          control={<Radio />}
          label={startCase(snakeCase(String(opt)))}
        />
      )}
    </RadioGroup>
  </FormControl >);
}


