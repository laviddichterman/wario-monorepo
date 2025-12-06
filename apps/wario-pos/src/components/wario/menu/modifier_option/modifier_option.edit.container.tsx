import { useAtomValue, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import type { IOption, IOptionType } from '@wcp/wario-shared';
import { useOptionById, useValueFromModifierEntryById } from '@wcp/wario-ux-shared/query';

import { useEditModifierOptionMutation } from '@/hooks/useModifierOptionMutations';

import {
  fromModifierOptionEntity,
  modifierOptionFormAtom,
  modifierOptionFormProcessingAtom,
} from '@/atoms/forms/modifierOptionFormAtoms';

import { ModifierOptionComponent } from './modifier_option.component';

interface ModifierOptionEditContainerProps {
  modifier_option_id: string;
  onCloseCallback: VoidFunction;
}

const ModifierOptionEditContainer = ({ modifier_option_id, onCloseCallback }: ModifierOptionEditContainerProps) => {
  const modifier_option = useOptionById(modifier_option_id) as IOption | null;
  const modifierType = useValueFromModifierEntryById(
    modifier_option?.modifierTypeId ?? '',
    'modifierType',
  ) as IOptionType | null;

  const setFormState = useSetAtom(modifierOptionFormAtom);

  // Initialize form from existing entity
  useEffect(() => {
    if (modifier_option) {
      setFormState(fromModifierOptionEntity(modifier_option));
    }
    return () => {
      setFormState(null);
    };
  }, [modifier_option, setFormState]);

  if (!modifier_option || !modifierType) {
    return null;
  }

  return (
    <ModifierOptionEditContainerInner
      modifier_option={modifier_option}
      modifierType={modifierType}
      onCloseCallback={onCloseCallback}
    />
  );
};

interface InnerProps {
  onCloseCallback: VoidFunction;
  modifier_option: IOption;
  modifierType: IOptionType;
}

const ModifierOptionEditContainerInner = ({ onCloseCallback, modifier_option, modifierType }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const setIsProcessing = useSetAtom(modifierOptionFormProcessingAtom);
  const formState = useAtomValue(modifierOptionFormAtom);

  const editMutation = useEditModifierOptionMutation();

  const editModifierOption = () => {
    if (!formState || editMutation.isPending) return;

    setIsProcessing(true);
    editMutation.mutate(
      {
        modifierTypeId: modifier_option.modifierTypeId,
        optionId: modifier_option.id,
        form: formState,
      },
      {
        onSuccess: () => {
          enqueueSnackbar(`Updated modifier option: ${formState.displayName}.`);
        },
        onError: (error) => {
          enqueueSnackbar(
            `Unable to update modifier option: ${formState.displayName}. Got error ${JSON.stringify(error, null, 2)}`,
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

  return (
    <ModifierOptionComponent
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={editModifierOption}
      modifierType={modifierType}
    />
  );
};

export default ModifierOptionEditContainer;
