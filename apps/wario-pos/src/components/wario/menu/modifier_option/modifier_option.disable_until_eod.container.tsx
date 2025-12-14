import { endOfDay, getTime } from 'date-fns';
import { useSnackbar } from 'notistack';

import { Grid } from '@mui/material';

import type { IOption } from '@wcp/wario-shared/types';
import { useCurrentTime, useOptionById } from '@wcp/wario-ux-shared/query';

import { useSetModifierOptionDisabledMutation } from '@/hooks/useModifierOptionMutations';

import { ElementActionComponent } from '../element.action.component';

import type { ModifierOptionQuickActionProps } from './modifier_option.delete.container';

const ModifierOptionDisableUntilEodContainer = ({
  modifier_type_id,
  modifier_option_id,
  onCloseCallback,
}: ModifierOptionQuickActionProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const modifier_option = useOptionById(modifier_option_id) as IOption | null;
  const currentTime = useCurrentTime();

  const setDisabledMutation = useSetModifierOptionDisabledMutation();

  const disableModifierOption = () => {
    if (!modifier_option || setDisabledMutation.isPending) return;

    setDisabledMutation.mutate(
      {
        modifierTypeId: modifier_type_id,
        option: modifier_option,
        disabled: { start: currentTime, end: getTime(endOfDay(currentTime)) },
      },
      {
        onSuccess: () => {
          enqueueSnackbar(`Disabled modifier option: ${modifier_option.displayName} until EOD.`);
        },
        onError: (error) => {
          enqueueSnackbar(
            `Unable to update modifier option: ${modifier_option.displayName}. Got error ${JSON.stringify(error, null, 2)}`,
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
      <ElementActionComponent
        onCloseCallback={onCloseCallback}
        onConfirmClick={disableModifierOption}
        isProcessing={setDisabledMutation.isPending}
        disableConfirmOn={setDisabledMutation.isPending}
        confirmText="Confirm"
        body={<Grid size={12}>Are you sure you'd like to disable {modifier_option.displayName} until end-of-day?</Grid>}
      />
    )
  );
};

export default ModifierOptionDisableUntilEodContainer;
