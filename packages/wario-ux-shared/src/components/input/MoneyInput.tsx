import { CheckedNumericInput, type CheckedNumericInputProps } from './CheckedNumericTextInput';

// type MinMax = { min: number; max?: number; } | { min?: number; max: number; };
// type ParseFxnEmptyF = (v: string | null) => number;
// type InputPropsEmptyF = MinMax & Omit<InputBaseComponentProps, 'min' | 'max' | 'inputMode'>;
// type ChkFxnAllowEmptyFalse = { inputProps: InputPropsEmptyF } & { parseFunction: ParseFxnEmptyF; };

// export interface ICheckFxnGen {
//   inputProps: InputPropsEmptyF;
//   parseFunction: ParseFxnEmptyF;
// }

// function CheckFunctionGenerator({ inputProps, parseFunction }: ChkFxnAllowEmptyFalse) {
//   return (e: string | null) => {
//     const parsed = parseFunction(e);
//     if (Number.isNaN(parsed)) {
//       return inputProps.min ?? inputProps.max as number;
//     }
//     if (inputProps.min && parsed < inputProps.min) {
//       return inputProps.min;
//     }
//     if (inputProps.max && parsed > inputProps.max) {
//       return inputProps.max;
//     }
//     return parsed;
//   }
// }

// type TFProps = Omit<TextFieldProps, 'value' | 'onChange' | 'inputProps' | 'onBlur' | 'type'>;
// type ValuePropEmptyF = { onChange: (value: number) => void; value: number; }
// type CheckedNumericInputProps = ICheckFxnGen & ValuePropEmptyF & TFProps;


export function MoneyInput(props: CheckedNumericInputProps) {
  return (
    <CheckedNumericInput
      {...props}
    />
  )
}
