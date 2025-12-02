import { useMemo } from 'react';

import Circle from '@mui/icons-material/Circle';
import CircleOutlined from '@mui/icons-material/CircleOutlined';
import SettingsTwoTone from '@mui/icons-material/SettingsTwoTone';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';

import { DISABLE_REASON, type IOption, OptionPlacement, OptionQualifier } from '@wcp/wario-shared';
import { CustomizerFormControlLabel } from '@wcp/wario-ux-shared/styled';

import { selectShowAdvanced, useCustomizerStore } from '@/stores/useCustomizerStore';

import { ModifierOptionTooltip } from '../ModifierOptionTooltip';

import { useModifierOptionCheckbox } from './useModifierOptionCheckbox';

interface IModifierOptionCheckboxCustomizerComponent {
  option: IOption;
}

export function WModifierOptionCheckboxComponent({ option }: IModifierOptionCheckboxCustomizerComponent) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const selectedProduct = useCustomizerStore((s) => s.selectedProduct!);
  const setAdvancedModifierOption = useCustomizerStore((s) => s.setAdvancedModifierOption);
  const { onClickWhole, onClickLeft, onClickRight,
    isWhole, isLeft, isRight,
    optionState } = useModifierOptionCheckbox(option);
  const canShowAdvanced = useCustomizerStore(selectShowAdvanced);
  const showAdvanced = useMemo(() => optionState !== undefined && canShowAdvanced && (optionState.enable_left.enable === DISABLE_REASON.ENABLED || optionState.enable_right.enable === DISABLE_REASON.ENABLED), [canShowAdvanced, optionState]);
  const advancedOptionSelected = useMemo(() => optionState !== undefined && (optionState.placement === OptionPlacement.LEFT || optionState.placement === OptionPlacement.RIGHT || optionState.qualifier !== OptionQualifier.REGULAR), [optionState]);
  if (optionState === undefined) {
    return null;
  }
  const onClickAdvanced = () => {
    setAdvancedModifierOption([option.modifierTypeId, option.id]);
  }

  return (
    <Grid
      size={{
        xs: 12,
        sm: 6,
        md: 4,
        lg: 3
      }}>
      <ModifierOptionTooltip option={option} enableState={optionState.enable_whole} product={selectedProduct.p} >
        <CustomizerFormControlLabel
          disabled={optionState.enable_whole.enable !== DISABLE_REASON.ENABLED}
          control={
            <span>
              {!advancedOptionSelected &&
                <Checkbox
                  checkedIcon={<Circle />}
                  icon={<CircleOutlined />}
                  disableRipple
                  disableFocusRipple
                  disableTouchRipple
                  disabled={optionState.enable_whole.enable !== DISABLE_REASON.ENABLED}
                  checked={isWhole}
                  onClick={() => { onClickWhole(); }} />}
              {(isLeft || (optionState.enable_whole.enable !== DISABLE_REASON.ENABLED && optionState.enable_left.enable === DISABLE_REASON.ENABLED)) &&
                <Checkbox
                  disableRipple
                  disableFocusRipple
                  disableTouchRipple
                  disabled={optionState.enable_left.enable !== DISABLE_REASON.ENABLED}
                  checked={isLeft}
                  onClick={() => { onClickLeft(); }} />}
              {(isRight || (optionState.enable_whole.enable !== DISABLE_REASON.ENABLED && optionState.enable_right.enable === DISABLE_REASON.ENABLED)) &&
                <Checkbox
                  disableRipple
                  disableFocusRipple
                  disableTouchRipple
                  disabled={optionState.enable_right.enable !== DISABLE_REASON.ENABLED}
                  checked={isRight}
                  onClick={() => { onClickRight(); }} />}
            </span>}
          // onClick={() => {
          //   console.log(optionState)

          // }}
          label={option.displayName} />
        {showAdvanced ? <IconButton onClick={onClickAdvanced} name={`${option.id}_advanced`} aria-label={`${option.id}_advanced`} size="small">
          <SettingsTwoTone fontSize="inherit" />
        </IconButton> : null}
      </ModifierOptionTooltip>
    </Grid>
  );
}
