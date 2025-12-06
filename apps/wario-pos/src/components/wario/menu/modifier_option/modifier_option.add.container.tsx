import { useAtomValue, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import { useModifierEntryById } from '@wcp/wario-ux-shared/query';

import { useAddModifierOptionMutation } from '@/hooks/useModifierOptionMutations';

import {
  DEFAULT_MODIFIER_OPTION_FORM,
  modifierOptionFormAtom,
  modifierOptionFormProcessingAtom,
} from '@/atoms/forms/modifierOptionFormAtoms';

import { ModifierOptionComponent } from './modifier_option.component';

export interface ModifierOptionUiContainerProps {
  modifierTypeId: string;
  onCloseCallback: VoidFunction;
}

const ModifierOptionAddContainer = ({ modifierTypeId, onCloseCallback }: ModifierOptionUiContainerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const modifierEntry = useModifierEntryById(modifierTypeId);

  const setFormState = useSetAtom(modifierOptionFormAtom);
  const setIsProcessing = useSetAtom(modifierOptionFormProcessingAtom);
  const formState = useAtomValue(modifierOptionFormAtom);

  const addMutation = useAddModifierOptionMutation();

  useEffect(() => {
    setFormState(DEFAULT_MODIFIER_OPTION_FORM);
    return () => {
      setFormState(null);
    };
  }, [setFormState]);

  const addModifierOption = () => {
    if (!formState || addMutation.isPending) return;

    setIsProcessing(true);
    addMutation.mutate(
      { modifierTypeId, form: formState },
      {
        onSuccess: () => {
          enqueueSnackbar(`Added modifier option: ${formState.displayName}.`);
        },
        onError: (error) => {
          enqueueSnackbar(
            `Unable to add modifier option: ${formState.displayName}. Got error ${JSON.stringify(error, null, 2)}`,
            { variant: 'error' },
          );
          console.error(error);
        },
        onSettled: () => {
          setIsProcessing(false);
          onCloseCallback();
        },
      },
    );
  };

  if (!modifierEntry) return null;

  return (
    <ModifierOptionComponent
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={addModifierOption}
      modifierType={modifierEntry.modifierType}
    />
  );
};

export default ModifierOptionAddContainer;
