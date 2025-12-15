import { useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import { useAddFulfillmentMutation } from '@/hooks/useFulfillmentMutations';

import {
  DEFAULT_FULFILLMENT_FORM,
  fulfillmentFormAtom,
  fulfillmentFormDirtyFieldsAtom,
  useFulfillmentForm,
} from '@/atoms/forms/fulfillmentFormAtoms';

import FulfillmentComponent from './FulfillmentComponent';

const FulfillmentAddContainer = ({ onCloseCallback }: { onCloseCallback: VoidFunction }) => {
  const { enqueueSnackbar } = useSnackbar();

  const setFormState = useSetAtom(fulfillmentFormAtom);
  const setDirtyFields = useSetAtom(fulfillmentFormDirtyFieldsAtom);

  const { form, isValid, isProcessing, setIsProcessing } = useFulfillmentForm();

  const addMutation = useAddFulfillmentMutation();

  // Initialize form with defaults
  useEffect(() => {
    setFormState({ ...DEFAULT_FULFILLMENT_FORM });
    setDirtyFields(new Set());
    return () => {
      setFormState(null);
      setDirtyFields(new Set());
    };
  }, [setFormState, setDirtyFields]);

  const addFulfillment = () => {
    if (!form || !isValid || addMutation.isPending) return;

    setIsProcessing(true);
    addMutation.mutate(form, {
      onSuccess: () => {
        enqueueSnackbar(`Added new fulfillment: ${form.displayName}.`);
        setFormState({ ...DEFAULT_FULFILLMENT_FORM });
        setDirtyFields(new Set());
      },
      onError: (error) => {
        enqueueSnackbar(`Unable to add fulfillment: ${form.displayName}. Got error: ${JSON.stringify(error)}.`, {
          variant: 'error',
        });
        console.error(error);
      },
      onSettled: () => {
        setIsProcessing(false);
        onCloseCallback();
      },
    });
  };

  if (!form) return null;

  return (
    <FulfillmentComponent
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => {
        addFulfillment();
      }}
      isProcessing={isProcessing}
      disableConfirmOn={!isValid}
    />
  );
};

export default FulfillmentAddContainer;
