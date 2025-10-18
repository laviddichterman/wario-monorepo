import { type ReactNode, type FormEventHandler } from 'react';
// form
import { FormProvider as Form, type UseFormReturn, type FieldValues } from 'react-hook-form';

// ----------------------------------------------------------------------

type Props<TFieldValues extends FieldValues = FieldValues, TContextType extends object = object> = {
  children: ReactNode;
  methods: UseFormReturn<TFieldValues, TContextType>;
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

export function FormProvider<TFieldValues extends FieldValues = FieldValues, TContextType extends object = object>({ children, onSubmit, methods }: Props<TFieldValues, TContextType>) {
  return (
    <Form {...methods}>
      <form onSubmit={onSubmit}>{children}</form>
    </Form>
  );
}
