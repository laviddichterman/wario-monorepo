import { useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import type { IOptionType } from '@wcp/wario-shared';
import { useValueFromModifierEntryById } from '@wcp/wario-ux-shared/query';

import { useEditModifierTypeMutation } from '@/hooks/useModifierTypeMutations';

import { createNullGuard } from '@/components/wario/catalog-null-guard';

import { fromModifierTypeEntity, modifierTypeFormAtom, useModifierTypeForm } from '@/atoms/forms/modifierTypeFormAtoms';

import { ModifierTypeFormComponent, type ModifierTypeModifyUiProps } from './modifier_type.component';

const useModifierTypeById = (id: string | null) => {
  return useValueFromModifierEntryById(id ?? '', 'modifierType');
};

// Create null guard at module level to follow Rules of Hooks
const ModifierTypeNullGuard = createNullGuard(useModifierTypeById);

const ModifierTypeEditContainer = ({ modifier_type_id, onCloseCallback }: ModifierTypeModifyUiProps) => {
  return (
    <ModifierTypeNullGuard
      id={modifier_type_id}
      child={(modifier_type) => (
        <ModifierTypeEditContainerInner onCloseCallback={onCloseCallback} modifier_type={modifier_type} />
      )}
    />
  );
};

interface InnerProps {
  onCloseCallback: VoidFunction;
  modifier_type: IOptionType;
}

const ModifierTypeEditContainerInner = ({ onCloseCallback, modifier_type }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const setFormState = useSetAtom(modifierTypeFormAtom);
  const { form, setIsProcessing } = useModifierTypeForm();

  const editMutation = useEditModifierTypeMutation();

  // Initialize form from existing entity
  useEffect(() => {
    setFormState(fromModifierTypeEntity(modifier_type));
    return () => {
      setFormState(null);
    };
  }, [modifier_type, setFormState]);

  const editModifierType = () => {
    if (!form || editMutation.isPending) return;

    setIsProcessing(true);
    editMutation.mutate(
      { id: modifier_type.id, form },
      {
        onSuccess: () => {
          enqueueSnackbar(`Updated modifier type: ${form.name}.`);
        },
        onError: (error) => {
          enqueueSnackbar(`Unable to edit modifier type: ${form.name}. Got error ${JSON.stringify(error, null, 2)}`, {
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
    <ModifierTypeFormComponent confirmText="Save" onCloseCallback={onCloseCallback} onConfirmClick={editModifierType} />
  );
};

export default ModifierTypeEditContainer;
