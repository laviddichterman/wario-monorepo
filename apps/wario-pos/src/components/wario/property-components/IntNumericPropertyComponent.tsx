import { formatDecimal, parseInteger } from '@wcp/wario-shared/logic';
import { type ValSetVal } from '@wcp/wario-ux-shared/common';
import { CheckedNumericInput, type CheckedNumericInputProps } from '@wcp/wario-ux-shared/components';

export type IntNumericPropertyComponentProps = {
  min?: number;
  max?: number;
  step?: number;
  label: string;
  disabled: boolean;
  color?: CheckedNumericInputProps['color'];
  sx?: CheckedNumericInputProps['sx'];
} & ValSetVal<number>;

export function IntNumericPropertyComponent(props: IntNumericPropertyComponentProps) {
  return (
    <CheckedNumericInput
      sx={props.sx}
      type="number"
      fullWidth
      color={props.color}
      label={props.label}
      numberProps={{
        allowEmpty: false,
        defaultValue: props.value,
        formatFunction: (i) => formatDecimal(i, 2),
        parseFunction: parseInteger,
        min: props.min ?? 0,
        max: props.max ?? 43200,
      }}
      inputMode="numeric"
      step={props.step ?? 1}
      pattern="[0-9]*"
      value={props.value}
      disabled={props.disabled}
      onChange={props.setValue}
    />
  );
}
