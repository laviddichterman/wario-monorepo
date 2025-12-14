import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';

import { type IOption, type MTID_MOID } from '@wcp/wario-shared/types';
import { DialogContainer } from '@wcp/wario-ux-shared/containers';
import { useOptionById } from '@wcp/wario-ux-shared/query';

import { useCustomizerStore } from '@/stores/useCustomizerStore';

import { useModifierOptionCheckbox } from './useModifierOptionCheckbox';

interface IOptionDetailModal {
  mtid_moid: MTID_MOID;
}

export function WOptionDetailModal({ mtid_moid }: IOptionDetailModal) {
  const setAdvancedModifierOption = useCustomizerStore((s) => s.setAdvancedModifierOption);
  const option = useOptionById(mtid_moid[1]) as IOption;
  const { onClickWhole, onClickLeft, onClickRight, onUpdateOption, isWhole, isLeft, isRight, optionState } =
    useModifierOptionCheckbox({ option, modifierTypeId: mtid_moid[0] });
  const intitialOptionState = useCustomizerStore((s) => s.advancedModifierInitialState);

  const onConfirmCallback = () => {
    setAdvancedModifierOption(null);
  };
  const onCancelCallback = () => {
    // set the modifier option state to what it was before we opened this modal
    onUpdateOption(intitialOptionState);
    onConfirmCallback();
  };

  return (
    <DialogContainer
      title={`${option.displayName} options`}
      onClose={onCancelCallback} // TODO: handle the clicking outside the container but we've made changes in the modal case
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      open={option !== null}
      innerComponent={
        <Grid container spacing={3} justifyContent="center">
          <Grid size={12}>Placement:</Grid>
          <Grid>
            <FormControlLabel
              control={
                <Checkbox
                  disabled={!optionState?.enable_left}
                  checked={isLeft}
                  onChange={() => {
                    onClickLeft();
                  }}
                />
              }
              label={null}
            />
          </Grid>
          <Grid>
            <FormControlLabel
              control={
                <Checkbox
                  disabled={!optionState?.enable_whole}
                  checked={isWhole}
                  onChange={() => {
                    onClickWhole();
                  }}
                />
              }
              label={null}
            />
          </Grid>
          <Grid>
            <FormControlLabel
              control={
                <Checkbox
                  disabled={!optionState?.enable_right}
                  checked={isRight}
                  onChange={() => {
                    onClickRight();
                  }}
                />
              }
              label={null}
            />
          </Grid>
          <Grid container justifyContent="flex-end" size={12}>
            <Grid>
              <Button onClick={onCancelCallback}>Cancel</Button>
            </Grid>
            <Grid>
              <Button onClick={onConfirmCallback}>Confirm</Button>
            </Grid>
          </Grid>
        </Grid>
      }
    />
  );
}
