import type { FormEventHandler, ReactNode } from 'react';
import { type FieldValues, FormProvider as RHFForm, type UseFormReturn } from 'react-hook-form';

// ----------------------------------------------------------------------

export type FormProps<TFieldValues extends FieldValues = FieldValues, TContextType extends object = object> = {
  onSubmit?: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  methods: UseFormReturn<TFieldValues, TContextType>;
};

export function FormProvider<TFieldValues extends FieldValues>({
  children,
  onSubmit,
  methods,
}: FormProps<TFieldValues>) {
  return (
    <RHFForm {...methods}>
      <form onSubmit={onSubmit} noValidate>
        {children}
      </form>
    </RHFForm>
  );
}
