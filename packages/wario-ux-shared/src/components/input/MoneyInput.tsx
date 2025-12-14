import { type DistributiveOmit, formatDecimal, parseDecimal } from '@wcp/wario-shared/logic';

import { CheckedNumericInput, type CheckedNumericInputProps } from './CheckedNumericTextInput';

type MoneyInputProps = Omit<CheckedNumericInputProps, 'numberProps'> & {
  numberProps: DistributiveOmit<CheckedNumericInputProps['numberProps'], 'formatFunction' | 'parseFunction'>;
};

export function MoneyInput({ numberProps, ...props }: MoneyInputProps) {
  return (
    <CheckedNumericInput
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(props as any)}
      numberProps={{
        formatFunction: (v) => formatDecimal(v, 2),
        parseFunction: parseDecimal,
        ...numberProps,
      }}
    />
  );
}
