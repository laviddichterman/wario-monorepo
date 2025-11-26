import { type IMoney } from "@wcp/wario-shared";
import { type ValSetVal } from "@wcp/wario-ux-shared/common";
import { MoneyInput } from "@wcp/wario-ux-shared/components";

export type IMoneyPropertyComponentProps = {
  min?: number;
  max?: number;
  step?: number;
  label: string;
  disabled: boolean;
} & ValSetVal<IMoney>;

export function IMoneyPropertyComponent(props: IMoneyPropertyComponentProps) {
  return (<MoneyInput
    fullWidth
    label={props.label}
    numberProps={{
      allowEmpty: false,
      min: props.min ?? 0.0,
      max: props.max ?? 999999,
      defaultValue: props.value.amount / 100
    }}
    inputMode="decimal"
    step={.25}
    pattern="[0-9]+([.,][0-9]+)?"
    value={props.value.amount / 100}
    disabled={props.disabled}
    onChange={(e: number) => { props.setValue({ ...props.value, amount: Math.round(e * 100) }); }}
  />);
}


