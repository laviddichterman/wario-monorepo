import { useSnackbar } from 'notistack';

import { useOptionById } from '@wcp/wario-ux-shared/query';

import { useDeleteModifierOptionMutation } from '@/hooks/useModifierOptionMutations';

import ElementDeleteComponent from '../element.delete.component';

export interface ModifierOptionQuickActionProps {
  modifier_type_id: string;
  modifier_option_id: string;
  onCloseCallback: VoidFunction;
}

const ModifierOptionDeleteContainer = ({
  modifier_type_id,
  modifier_option_id,
  onCloseCallback,
}: ModifierOptionQuickActionProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const modifier_option = useOptionById(modifier_option_id);

  const deleteMutation = useDeleteModifierOptionMutation();

  const deleteModifierOption = () => {
    if (!modifier_option || deleteMutation.isPending) return;

    deleteMutation.mutate(
      {
        modifierTypeId: modifier_type_id,
        optionId: modifier_option.id,
      },
      {
        onSuccess: () => {
          enqueueSnackbar(`Deleted modifier option: ${modifier_option.displayName}.`);
        },
        onError: (error) => {
          enqueueSnackbar(
            `Unable to delete modifier option: ${modifier_option.displayName}. Got error ${JSON.stringify(error, null, 2)}`,
            { variant: 'error' },
          );
          console.error(error);
        },
        onSettled: () => {
          onCloseCallback();
        },
      },
    );
  };

  return (
    modifier_option && (
      <ElementDeleteComponent
        onCloseCallback={onCloseCallback}
        onConfirmClick={deleteModifierOption}
        name={modifier_option.displayName}
        isProcessing={deleteMutation.isPending}
      />
    )
  );
};

export default ModifierOptionDeleteContainer;
