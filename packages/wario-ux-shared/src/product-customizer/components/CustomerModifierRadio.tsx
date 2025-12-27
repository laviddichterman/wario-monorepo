/**
 * CustomerModifierRadio - Customer-facing radio button modifier selection.
 *
 * Renders radio buttons with custom circle icons for single-select modifiers.
 * This is a shared, decoupled version of WModifierRadioComponent.
 *
 * Usage:
 * ```tsx
 * <CustomerModifierRadio
 *   modifierType={modifierType}
 *   options={visibleOptions}
 *   product={product}
 *   selectedOptionId={selectedId}
 *   getOptionState={getOptionState}
 *   onSelectRadio={selectRadio}
 * />
 * ```
 */

import React, { type ReactNode } from 'react';

import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

import { DISABLE_REASON, type IOption, type IOptionType } from '@wcp/wario-shared/logic';
import type { MetadataModifierOptionMapEntry } from '@wcp/wario-shared/types';

import { WholeCircleIcon, WholeCircleOutlinedIcon } from '../../icons';
import { CustomizerFormControlLabel } from '../../styled';

// =============================================================================
// Styles
// =============================================================================

const radioSx = {
  p: '9px',
  m: 0,
};

// =============================================================================
// Types
// =============================================================================

export interface CustomerModifierRadioProps {
  /** The modifier type definition */
  modifierType: IOptionType;
  /** Visible options for this modifier type */
  options: IOption[];
  /** Currently selected option ID, or null if none selected */
  selectedOptionId: string | null;
  /** Get option state from metadata */
  getOptionState: (mtId: string, optionId: string) => MetadataModifierOptionMapEntry | undefined;
  /** Called when an option is selected */
  onSelectRadio: (mtId: string, optionId: string) => void;
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

export function CustomerModifierRadio({
  modifierType,
  options,
  selectedOptionId,
  getOptionState,
  onSelectRadio,
  renderOptionWrapper,
}: CustomerModifierRadioProps) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    onSelectRadio(modifierType.id, e.target.value);
  };

  return (
    <RadioGroup
      sx={{ width: '100%' }}
      onChange={onChange}
      value={selectedOptionId ?? ''}
      aria-labelledby={`modifier_control_${modifierType.id}`}
    >
      <Grid container>
        {options.map((opt, i) => {
          const optionState = getOptionState(modifierType.id, opt.id);
          const enableWhole = optionState?.enable_whole;
          const isDisabled = enableWhole?.enable !== DISABLE_REASON.ENABLED;

          const radioElement = (
            <CustomizerFormControlLabel
              value={opt.id}
              control={
                <Radio
                  checkedIcon={<WholeCircleIcon />}
                  icon={<WholeCircleOutlinedIcon />}
                  disableRipple
                  disableFocusRipple
                  disableTouchRipple
                  disabled={isDisabled}
                  sx={radioSx}
                />
              }
              label={opt.displayName}
            />
          );

          const wrappedElement =
            renderOptionWrapper && optionState ? renderOptionWrapper(opt, optionState, radioElement) : radioElement;

          return (
            <Grid
              key={i}
              size={{
                xs: 12,
                sm: 6,
                md: 4,
                lg: 3,
              }}
            >
              {wrappedElement}
            </Grid>
          );
        })}
      </Grid>
    </RadioGroup>
  );
}
