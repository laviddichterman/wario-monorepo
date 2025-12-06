import { useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import { useAddModifierTypeMutation } from '@/hooks/useModifierTypeMutations';

import { DEFAULT_MODIFIER_TYPE_FORM, modifierTypeFormAtom } from '@/atoms/forms/modifierTypeFormAtoms';

import { ModifierTypeFormComponent, type ModifierTypeUiProps, useModifierTypeForm } from './modifier_type.component';

const ModifierTypeAddContainer = ({ onCloseCallback }: ModifierTypeUiProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const setFormState = useSetAtom(modifierTypeFormAtom);
  const { form, setIsProcessing } = useModifierTypeForm();

  const addMutation = useAddModifierTypeMutation();

  // Initialize form with defaults on mount
  useEffect(() => {
    setFormState(DEFAULT_MODIFIER_TYPE_FORM);
    return () => {
      setFormState(null);
    };
  }, [setFormState]);

  const addModifierType = () => {
    if (!form || addMutation.isPending) return;

    setIsProcessing(true);
    addMutation.mutate(
      { form, options: [] },
      {
        onSuccess: () => {
          enqueueSnackbar(`Added new modifier type: ${form.name}.`);
        },
        onError: (error) => {
          enqueueSnackbar(`Unable to add modifier type: ${form.name}. Got error ${JSON.stringify(error, null, 2)}`, {
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

  return (
    <ModifierTypeFormComponent confirmText="Add" onCloseCallback={onCloseCallback} onConfirmClick={addModifierType} />
  );
};

export default ModifierTypeAddContainer;
