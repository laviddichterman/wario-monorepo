import { kebabCase, snakeCase, startCase } from "es-toolkit/compat";

import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup } from "@mui/material";

export type StringEnumPropertyComponentProps<T extends string> = {
  options: T[];
  label: string;
  disabled: boolean;
  value: T;
  setValue: (value: T) => void;
};

export function StringEnumPropertyComponent<T extends string>(props: StringEnumPropertyComponentProps<T>) {
  return (<FormControl component="fieldset">
    <FormLabel component="legend">{props.label}</FormLabel>
    <RadioGroup
      aria-label={kebabCase(props.label)}
      name={kebabCase(props.label)}
      row
      value={props.value}
      onChange={(e) => { props.setValue(e.target.value as T); }}
    >
      {props.options.map((opt, i) =>
        <FormControlLabel
          key={i}
          value={opt}
          control={<Radio />}
          label={startCase(snakeCase(opt))}
        />
      )}
    </RadioGroup>
  </FormControl >);
}


