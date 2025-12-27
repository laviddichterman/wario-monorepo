import { useMemo } from 'react';

import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';

import { DISABLE_REASON, type IOption, type IOptionInstance, OptionPlacement } from '@wcp/wario-shared/logic';
import type { MetadataModifierOptionMapEntry, MTID_MOID } from '@wcp/wario-shared/types';
import { DialogContainer } from '@wcp/wario-ux-shared/containers';
import {
  LeftHalfIcon,
  LeftHalfOutlinedIcon,
  RightHalfIcon,
  RightHalfOutlinedIcon,
  WholeCircleIcon,
  WholeCircleOutlinedIcon,
} from '@wcp/wario-ux-shared/icons';
import { useOptionById } from '@wcp/wario-ux-shared/query';

import { useCustomizerStore } from '@/stores/useCustomizerStore';

interface IOptionDetailModal {
  mtid_moid: MTID_MOID;
  toggleCheckbox: (mtId: string, optionId: string, state: Pick<IOptionInstance, 'placement' | 'qualifier'>) => void;
  getOptionState: (mtId: string, optionId: string) => MetadataModifierOptionMapEntry | undefined;
}

export function WOptionDetailModal({ mtid_moid, toggleCheckbox, getOptionState }: IOptionDetailModal) {
  const setAdvancedModifierOption = useCustomizerStore((s) => s.setAdvancedModifierOption);
  const option = useOptionById(mtid_moid[1]) as IOption;
  const initialOptionState = useCustomizerStore((s) => s.advancedModifierInitialState);

  const mtId = mtid_moid[0];
  const optionId = mtid_moid[1];
  const optionState = getOptionState(mtId, optionId);

  const isWhole = useMemo(() => optionState?.placement === OptionPlacement.WHOLE, [optionState]);
  const isLeft = useMemo(() => optionState?.placement === OptionPlacement.LEFT, [optionState]);
  const isRight = useMemo(() => optionState?.placement === OptionPlacement.RIGHT, [optionState]);

  const onClickWhole = () => {
    if (!optionState) return;
    toggleCheckbox(mtId, optionId, {
      placement: isWhole ? OptionPlacement.NONE : OptionPlacement.WHOLE,
      qualifier: optionState.qualifier,
    });
  };

  const onClickLeft = () => {
    if (!optionState) return;
    toggleCheckbox(mtId, optionId, {
      placement: isLeft ? OptionPlacement.NONE : OptionPlacement.LEFT,
      qualifier: optionState.qualifier,
    });
  };

  const onClickRight = () => {
    if (!optionState) return;
    toggleCheckbox(mtId, optionId, {
      placement: isRight ? OptionPlacement.NONE : OptionPlacement.RIGHT,
      qualifier: optionState.qualifier,
    });
  };

  const onConfirmCallback = () => {
    setAdvancedModifierOption(null);
  };

  const onCancelCallback = () => {
    // Reset to initial state before closing
    toggleCheckbox(mtId, optionId, initialOptionState);
    onConfirmCallback();
  };

  const enableLeft = optionState?.enable_left.enable === DISABLE_REASON.ENABLED;
  const enableWhole = optionState?.enable_whole.enable === DISABLE_REASON.ENABLED;
  const enableRight = optionState?.enable_right.enable === DISABLE_REASON.ENABLED;

  return (
    <DialogContainer
      title={`${option.displayName} options`}
      onClose={onCancelCallback}
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      open={option !== null}
      innerComponent={
        <Grid container spacing={3} justifyContent="center">
          <Grid size={12}>Placement:</Grid>
          <Grid>
            <FormControlLabel
              control={
                <Checkbox
                  icon={<LeftHalfOutlinedIcon />}
                  checkedIcon={<LeftHalfIcon />}
                  disabled={!enableLeft}
                  checked={isLeft}
                  onChange={() => {
                    onClickLeft();
                  }}
                />
              }
              label="Left"
            />
          </Grid>
          <Grid>
            <FormControlLabel
              control={
                <Checkbox
                  icon={<WholeCircleOutlinedIcon />}
                  checkedIcon={<WholeCircleIcon />}
                  disabled={!enableWhole}
                  checked={isWhole}
                  onChange={() => {
                    onClickWhole();
                  }}
                />
              }
              label="Whole"
            />
          </Grid>
          <Grid>
            <FormControlLabel
              control={
                <Checkbox
                  icon={<RightHalfOutlinedIcon />}
                  checkedIcon={<RightHalfIcon />}
                  disabled={!enableRight}
                  checked={isRight}
                  onChange={() => {
                    onClickRight();
                  }}
                />
              }
              label="Right"
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
