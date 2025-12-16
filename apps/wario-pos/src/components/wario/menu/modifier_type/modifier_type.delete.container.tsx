import { useModifierTypeById } from '@wcp/wario-ux-shared/query';

import { useDeleteModifierTypeMutation } from '@/hooks/useModifierTypeMutations';

import { toast } from '@/components/snackbar';

import ElementDeleteComponent from '../element.delete.component';

export interface ModifierTypeModifyUiProps {
  modifier_type_id: string;
  onCloseCallback: VoidFunction;
}

const ModifierTypeDeleteContainer = ({ modifier_type_id, onCloseCallback }: ModifierTypeModifyUiProps) => {
  const modifier_type = useModifierTypeById(modifier_type_id);

  const deleteMutation = useDeleteModifierTypeMutation();

  const deleteModifierType = () => {
    if (!modifier_type || deleteMutation.isPending) return;

    deleteMutation.mutate(modifier_type_id, {
      onSuccess: () => {
        toast.success(`Deleted modifier type: ${modifier_type.name}.`);
      },
      onError: (error) => {
        toast.error(
          `Unable to delete modifier type: ${modifier_type.name}. Got error ${JSON.stringify(error, null, 2)}`,
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
