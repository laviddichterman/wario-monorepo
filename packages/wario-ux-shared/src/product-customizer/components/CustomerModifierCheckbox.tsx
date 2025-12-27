/**
 * CustomerModifierCheckbox - Customer-facing checkbox modifier selection.
 *
 * Renders checkbox controls with optional split placement (left/whole/right)
 * for multi-select modifiers. This is a shared, decoupled version of
 * WModifierOptionCheckboxComponent.
 *
 * Usage:
 * ```tsx
 * <CustomerModifierCheckbox
 *   modifierTypeId={mtid}
 *   option={option}
 *   product={product}
 *   showAdvancedMode={false}
 *   getOptionState={getOptionState}
 *   onToggleCheckbox={toggleCheckbox}
 * />
 * ```
 */

import { type ReactNode, useMemo } from 'react';

import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import {
  DISABLE_REASON,
  type IOption,
  type IOptionInstance,
  OptionPlacement,
  OptionQualifier,
} from '@wcp/wario-shared/logic';
import type { MetadataModifierOptionMapEntry } from '@wcp/wario-shared/types';

import {
  LeftHalfIcon,
  LeftHalfOutlinedIcon,
  RightHalfIcon,
  RightHalfOutlinedIcon,
  SettingsTwoToneIcon,
  WholeCircleIcon,
  WholeCircleOutlinedIcon,
} from '../../icons';

// =============================================================================
// Styles
// =============================================================================

// Medium size (default for customer-facing apps)
const checkboxMediumSx = {
  p: '9px',
  m: 0,
};

const tightCheckboxMediumSx = {
  p: 0,
  m: 0,
};

const HALF_ICON_WIDTH_MEDIUM = 12;
const halfCheckboxMediumSx = {
  p: 0,
  m: 0,
  width: HALF_ICON_WIDTH_MEDIUM,
  minWidth: HALF_ICON_WIDTH_MEDIUM,
};

// Small size (for compact POS interfaces)
const checkboxSmallSx = {
  p: '4px',
  m: 0,
  '& .MuiSvgIcon-root': {
    fontSize: '1rem',
  },
};

const tightCheckboxSmallSx = {
  p: 0,
  m: 0,
  '& .MuiSvgIcon-root': {
    fontSize: '1rem',
  },
};

const HALF_ICON_WIDTH_SMALL = 8;
const halfCheckboxSmallSx = {
  p: 0,
  m: 0,
  width: HALF_ICON_WIDTH_SMALL,
  minWidth: HALF_ICON_WIDTH_SMALL,
  '& .MuiSvgIcon-root': {
    fontSize: '1rem',
  },
};

// =============================================================================
// Types
// =============================================================================

export interface CustomerModifierCheckboxProps {
  /** The modifier type ID */
  modifierTypeId: string;
  /** The option being rendered */
  option: IOption;
  /** Whether advanced mode (split placement) is enabled */
  showAdvancedMode: boolean;
  /** Size variant: 'medium' (default) or 'small' (compact for POS) */
  size?: 'medium' | 'small';
  /** Get option state from metadata */
  getOptionState: (mtId: string, optionId: string) => MetadataModifierOptionMapEntry | undefined;
  /** Called when option placement changes */
  onToggleCheckbox: (mtId: string, optionId: string, state: Pick<IOptionInstance, 'placement' | 'qualifier'>) => void;
  /** Called when advanced options button is clicked */
  onOpenAdvanced?: (optionId: string) => void;
  /** Optional wrapper for each option (e.g., for tooltips) */
  renderOptionWrapper?: (
    option: IOption,
    enableState: MetadataModifierOptionMapEntry,
    children: ReactNode,
  ) => ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function CustomerModifierCheckbox({
  modifierTypeId,
  option,
  showAdvancedMode,
  size = 'medium',
  getOptionState,
  onToggleCheckbox,
  onOpenAdvanced,
  renderOptionWrapper,
}: CustomerModifierCheckboxProps) {
  // Select styles based on size
  const isSmall = size === 'small';
  const checkboxSx = isSmall ? checkboxSmallSx : checkboxMediumSx;
  const tightCheckboxSx = isSmall ? tightCheckboxSmallSx : tightCheckboxMediumSx;
  const halfCheckboxSx = isSmall ? halfCheckboxSmallSx : halfCheckboxMediumSx;
  const halfIconWidth = isSmall ? HALF_ICON_WIDTH_SMALL : HALF_ICON_WIDTH_MEDIUM;
  const labelTypographyVariant = isSmall ? 'body2' : 'body1';

  const optionState = getOptionState(modifierTypeId, option.id);

  const isWhole = useMemo(() => optionState?.placement === OptionPlacement.WHOLE, [optionState]);
  const isLeft = useMemo(() => optionState?.placement === OptionPlacement.LEFT, [optionState]);
  const isRight = useMemo(() => optionState?.placement === OptionPlacement.RIGHT, [optionState]);

  // Check if split placement is available for this option
  const splitPlacementAvailable = useMemo(
    () =>
      optionState !== undefined &&
      (optionState.enable_left.enable === DISABLE_REASON.ENABLED ||
        optionState.enable_right.enable === DISABLE_REASON.ENABLED),
    [optionState],
  );

  // Show split controls only if advanced mode is checked AND split placement is available
  const showSplitControls = showAdvancedMode && splitPlacementAvailable;

  // Only show advanced modal trigger if qualifier is non-regular
  const advancedQualifierSelected = useMemo(
    () => optionState !== undefined && optionState.qualifier !== OptionQualifier.REGULAR,
    [optionState],
  );

  if (optionState === undefined) {
    return null;
  }

  const onClickWhole = () => {
    onToggleCheckbox(modifierTypeId, option.id, {
      placement: isWhole ? OptionPlacement.NONE : OptionPlacement.WHOLE,
      qualifier: optionState.qualifier,
    });
  };

  const onClickLeft = () => {
    onToggleCheckbox(modifierTypeId, option.id, {
      placement: isLeft ? OptionPlacement.NONE : OptionPlacement.LEFT,
      qualifier: optionState.qualifier,
    });
  };

  const onClickRight = () => {
    onToggleCheckbox(modifierTypeId, option.id, {
      placement: isRight ? OptionPlacement.NONE : OptionPlacement.RIGHT,
      qualifier: optionState.qualifier,
    });
  };

  const onClickAdvanced = () => {
    if (onOpenAdvanced) {
      onOpenAdvanced(option.id);
    }
  };

  // Smart label click handler for split options
  const onClickLabel = () => {
    if (isWhole) {
      onToggleCheckbox(modifierTypeId, option.id, {
        placement: OptionPlacement.NONE,
        qualifier: optionState.qualifier,
      });
    } else if (isLeft) {
      if (optionState.enable_right.enable === DISABLE_REASON.ENABLED) {
        onToggleCheckbox(modifierTypeId, option.id, {
          placement: OptionPlacement.WHOLE,
          qualifier: optionState.qualifier,
        });
      } else {
        onToggleCheckbox(modifierTypeId, option.id, {
          placement: OptionPlacement.NONE,
          qualifier: optionState.qualifier,
        });
      }
    } else if (isRight) {
      if (optionState.enable_left.enable === DISABLE_REASON.ENABLED) {
        onToggleCheckbox(modifierTypeId, option.id, {
          placement: OptionPlacement.WHOLE,
          qualifier: optionState.qualifier,
        });
      } else {
        onToggleCheckbox(modifierTypeId, option.id, {
          placement: OptionPlacement.NONE,
          qualifier: optionState.qualifier,
        });
      }
    } else {
      if (optionState.enable_whole.enable === DISABLE_REASON.ENABLED) {
        onToggleCheckbox(modifierTypeId, option.id, {
          placement: OptionPlacement.WHOLE,
          qualifier: optionState.qualifier,
        });
      } else if (optionState.enable_left.enable === DISABLE_REASON.ENABLED) {
        onToggleCheckbox(modifierTypeId, option.id, {
          placement: OptionPlacement.LEFT,
          qualifier: optionState.qualifier,
        });
      } else if (optionState.enable_right.enable === DISABLE_REASON.ENABLED) {
        onToggleCheckbox(modifierTypeId, option.id, {
          placement: OptionPlacement.RIGHT,
          qualifier: optionState.qualifier,
        });
      }
    }
  };

  const isDisabled =
    optionState.enable_whole.enable !== DISABLE_REASON.ENABLED &&
    optionState.enable_left.enable !== DISABLE_REASON.ENABLED &&
    optionState.enable_right.enable !== DISABLE_REASON.ENABLED;

  // Render placement controls
  const renderPlacementControls = () => {
    if (showSplitControls) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, p: '9px' }}>
          <Checkbox
            icon={<LeftHalfOutlinedIcon />}
            checkedIcon={<LeftHalfIcon />}
            disableRipple
            disableFocusRipple
            disableTouchRipple
            disabled={optionState.enable_left.enable !== DISABLE_REASON.ENABLED}
            checked={isLeft}
            onClick={onClickLeft}
            sx={halfCheckboxSx}
          />
          <Checkbox
            icon={<WholeCircleOutlinedIcon />}
            checkedIcon={<WholeCircleIcon />}
            disableRipple
            disableFocusRipple
            disableTouchRipple
            disabled={optionState.enable_whole.enable !== DISABLE_REASON.ENABLED}
            checked={isWhole}
            onClick={onClickWhole}
            sx={tightCheckboxSx}
          />
          <Checkbox
            icon={<RightHalfOutlinedIcon />}
            checkedIcon={<RightHalfIcon />}
            disableRipple
            disableFocusRipple
            disableTouchRipple
            disabled={optionState.enable_right.enable !== DISABLE_REASON.ENABLED}
            checked={isRight}
            onClick={onClickRight}
            sx={halfCheckboxSx}
          />
        </Box>
      );
    }

    if (showAdvancedMode) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, p: '9px' }}>
          <Box sx={{ width: halfIconWidth, flexShrink: 0 }} />
          <Checkbox
            checkedIcon={<WholeCircleIcon />}
            icon={<WholeCircleOutlinedIcon />}
            disableRipple
            disableFocusRipple
            disableTouchRipple
            disabled={optionState.enable_whole.enable !== DISABLE_REASON.ENABLED}
            checked={isWhole}
            onChange={onClickWhole}
            sx={tightCheckboxSx}
          />
          <Box sx={{ width: halfIconWidth, flexShrink: 0 }} />
        </Box>
      );
    }

    return (
      <Checkbox
        checkedIcon={<WholeCircleIcon />}
        icon={<WholeCircleOutlinedIcon />}
        disableRipple
        disableFocusRipple
        disableTouchRipple
        disabled={optionState.enable_whole.enable !== DISABLE_REASON.ENABLED}
        checked={isWhole}
        onChange={onClickWhole}
        sx={checkboxSx}
      />
    );
  };

  const checkboxContent = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        opacity: isDisabled ? 0.5 : 1,
      }}
    >
      {renderPlacementControls()}
      <Typography
        component="span"
        variant={labelTypographyVariant}
        onClick={isDisabled ? undefined : onClickLabel}
        sx={{
          ml: 1,
          cursor: isDisabled ? 'default' : 'pointer',
          userSelect: 'none',
        }}
      >
        {option.displayName}
      </Typography>
      {showAdvancedMode && splitPlacementAvailable && advancedQualifierSelected && onOpenAdvanced ? (
        <IconButton
          onClick={onClickAdvanced}
          name={`${option.id}_advanced`}
          aria-label={`${option.id}_advanced`}
          size="small"
        >
          <SettingsTwoToneIcon fontSize="inherit" />
        </IconButton>
      ) : null}
    </Box>
  );

  const wrappedContent = renderOptionWrapper
    ? renderOptionWrapper(option, optionState, checkboxContent)
    : checkboxContent;

  return (
    <Grid
      size={
        isSmall
          ? { xs: 12 }
          : {
              xs: 12,
              sm: 6,
              md: 4,
              lg: 3,
            }
      }
    >
      {wrappedContent}
    </Grid>
  );
}
