import type { FormEventHandler, ReactNode } from 'react';
import { type FieldValues, FormProvider as RHFForm, type UseFormReturn } from 'react-hook-form';

// ----------------------------------------------------------------------

export type FormProps<TFieldValues extends FieldValues = FieldValues, TContextType extends object = object> = {
  onSubmit?: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  methods: UseFormReturn<TFieldValues, TContextType>;
};

export function FormProvider({ children, onSubmit, methods }: FormProps) {
  return (
    <RHFForm {...methods}>
      <form onSubmit={onSubmit} noValidate>
        {children}
      </form>
    </RHFForm>
  );
}