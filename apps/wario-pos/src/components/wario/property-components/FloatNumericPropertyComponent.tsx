import { formatDecimal, parseDecimal } from '@wcp/wario-shared';
import { type ValSetVal } from '@wcp/wario-ux-shared/common';
import { CheckedNumericInput } from '@wcp/wario-ux-shared/components';

export type FloatNumericPropertyComponentProps = {
  min?: number;
  max?: number;
  step?: number;
  label: string;
  disabled: boolean;
  size?: 'small' | 'medium';
} & ValSetVal<number>;

export function FloatNumericPropertyComponent(props: FloatNumericPropertyComponentProps) {
  return (
    <CheckedNumericInput
      type="number"
      fullWidth
      label={props.label}
      size={props.size}
      numberProps={{
        allowEmpty: false,
        defaultValue: props.value,
        formatFunction: (i) => formatDecimal(i, 2),
        parseFunction: parseDecimal,
        min: props.min ?? 0,
        max: props.max ?? 99999,
      }}
      inputMode="decimal"
      step={props.step ?? 1}
      pattern="[0-9]+([.,][0-9]+)?"
      value={props.value}
      disabled={props.disabled}
      onChange={props.setValue}
    />
  );
}
