import { useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import type { FulfillmentConfig } from '@wcp/wario-shared/types';

import { useEditFulfillmentMutation } from '@/hooks/useFulfillmentMutations';

import {
  fromFulfillmentEntity,
  fulfillmentFormAtom,
  fulfillmentFormDirtyFieldsAtom,
  useFulfillmentForm,
} from '@/atoms/forms/fulfillmentFormAtoms';

import FulfillmentComponent from './FulfillmentComponent';

const FulfillmentEditContainer = ({
  fulfillment,
  onCloseCallback,
}: {
  fulfillment: FulfillmentConfig;
  onCloseCallback: VoidFunction;
}) => {
  const { enqueueSnackbar } = useSnackbar();

  const setFormState = useSetAtom(fulfillmentFormAtom);
  const setDirtyFields = useSetAtom(fulfillmentFormDirtyFieldsAtom);

  const { form, isValid, isProcessing, setIsProcessing, dirtyFields } = useFulfillmentForm();

  const editMutation = useEditFulfillmentMutation();

  // Initialize form from existing entity and reset dirty fields
  useEffect(() => {
    setFormState(fromFulfillmentEntity(fulfillment));
    setDirtyFields(new Set());
    return () => {
      setFormState(null);
      setDirtyFields(new Set());
    };
  }, [fulfillment, setFormState, setDirtyFields]);

  const editFulfillment = () => {
    if (!form || !isValid || editMutation.isPending) return;

    setIsProcessing(true);
    editMutation.mutate(
      { id: fulfillment.id, form, dirtyFields },
      {
        onSuccess: () => {
          enqueueSnackbar(`Updated fulfillment ${form.displayName}.`);
        },
        onError: (error) => {
          enqueueSnackbar(`Unable to update fulfillment ${form.displayName}. Got error: ${JSON.stringify(error)}.`, {
            variant: 'error',
          });
          console.error(error);
        },
        onSettled: () => {
          setIsProcessing(false);
          onCloseCallback();
        },
      },
    );
  };

  if (!form) return null;

  return (
    <FulfillmentComponent
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => {
        editFulfillment();
      }}
      isProcessing={isProcessing}
      disableConfirmOn={!isValid || dirtyFields.size === 0}
    />
  );
};

export default FulfillmentEditContainer;
