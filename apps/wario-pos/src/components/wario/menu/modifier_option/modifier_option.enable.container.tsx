import { Grid } from '@mui/material';

import { useOptionById } from '@wcp/wario-ux-shared/query';

import { useSetModifierOptionDisabledMutation } from '@/hooks/useModifierOptionMutations';

import { toast } from '@/components/snackbar';

import { ElementActionComponent } from '../element.action.component';

import type { ModifierOptionQuickActionProps } from './modifier_option.delete.container';

const ModifierOptionEnableContainer = ({
  modifier_type_id,
  modifier_option_id,
  onCloseCallback,
}: ModifierOptionQuickActionProps) => {
  const modifier_option = useOptionById(modifier_option_id);

  const setDisabledMutation = useSetModifierOptionDisabledMutation();

  const enableModifierOption = () => {
    if (!modifier_option || setDisabledMutation.isPending) return;

    setDisabledMutation.mutate(
      {
        modifierTypeId: modifier_type_id,
        option: modifier_option,
        disabled: null,
      },
      {
        onSuccess: () => {
          toast.success(`Enabled modifier option: ${modifier_option.displayName}.`);
        },
        onError: (error) => {
          toast.error(
            `Unable to update modifier option: ${modifier_option.displayName}. Got error ${JSON.stringify(error, null, 2)}`,
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
      <ElementActionComponent
        onCloseCallback={onCloseCallback}
        onConfirmClick={enableModifierOption}
        isProcessing={setDisabledMutation.isPending}
        disableConfirmOn={setDisabledMutation.isPending}
        confirmText="Confirm"
        body={<Grid size={12}>Are you sure you'd like to enable {modifier_option.displayName}?</Grid>}
      />
    )
  );
};

export default ModifierOptionEnableContainer;
