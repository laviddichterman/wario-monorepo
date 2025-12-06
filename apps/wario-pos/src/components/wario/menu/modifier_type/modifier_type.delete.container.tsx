import { useSnackbar } from 'notistack';

import { useValueFromModifierEntryById } from '@wcp/wario-ux-shared/query';

import { useDeleteModifierTypeMutation } from '@/hooks/useModifierTypeMutations';

import ElementDeleteComponent from '../element.delete.component';

export interface ModifierTypeModifyUiProps {
  modifier_type_id: string;
  onCloseCallback: VoidFunction;
}

const ModifierTypeDeleteContainer = ({ modifier_type_id, onCloseCallback }: ModifierTypeModifyUiProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const modifier_type = useValueFromModifierEntryById(modifier_type_id, 'modifierType');

  const deleteMutation = useDeleteModifierTypeMutation();

  const deleteModifierType = () => {
    if (!modifier_type || deleteMutation.isPending) return;

    deleteMutation.mutate(modifier_type_id, {
      onSuccess: () => {
        enqueueSnackbar(`Deleted modifier type: ${modifier_type.name}.`);
      },
      onError: (error) => {
        enqueueSnackbar(
          `Unable to delete modifier type: ${modifier_type.name}. Got error ${JSON.stringify(error, null, 2)}`,
          { variant: 'error' },
        );
        console.error(error);
      },
      onSettled: () => {
        onCloseCallback();
      },
    });
  };

  return (
    modifier_type && (
      <ElementDeleteComponent
        onCloseCallback={onCloseCallback}
        onConfirmClick={deleteModifierType}
        name={modifier_type.name}
        isProcessing={deleteMutation.isPending}
      />
    )
  );
};

export default ModifierTypeDeleteContainer;
