import { type ReactNode } from 'react';
// form
import { FormProvider as Form, type UseFormReturn } from 'react-hook-form';

// ----------------------------------------------------------------------

type Props<FormDataType, TContextType> = {
  children: ReactNode;
  // @ts-ignore
  methods: UseFormReturn<FormDataType, TContextType>;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
};

// @ts-ignore
export function FormProvider<FormDataType, TContextType = any>({ children, onSubmit, methods }: Props<FormDataType, TContextType>) {
  return (
    // @ts-ignore
    <Form {...methods}>
      <form onSubmit={onSubmit}>{children}</form>
    </Form>
  );
}
