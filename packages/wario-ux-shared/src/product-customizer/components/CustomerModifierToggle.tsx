/**
 * CustomerModifierToggle - Customer-facing toggle switch modifier selection.
 *
 * Renders a toggle switch for binary choice modifiers (min=1, max=1, exactly 2 options).
 * This is a shared, decoupled version of WModifierOptionToggle.
 *
 * Usage:
 * ```tsx
 * <CustomerModifierToggle
 *   modifierTypeId={mtid}
 *   toggleOptionChecked={option1}
 *   toggleOptionUnchecked={option2}
 *   product={product}
 *   optionCheckedState={state1}
 *   optionUncheckedState={state2}
 *   onSelectRadio={selectRadio}
 * />
 * ```
 */

import React, { type ReactNode, useMemo } from 'react';

import Checkbox from '@mui/material/Checkbox';

import { DISABLE_REASON, type IOption, OptionPlacement } from '@wcp/wario-shared/logic';
import type { MetadataModifierOptionMapEntry } from '@wcp/wario-shared/types';

import { WholeCircleIcon, WholeCircleOutlinedIcon } from '../../icons';
import { CustomizerFormControlLabel } from '../../styled';

// =============================================================================
// Types
// =============================================================================

export interface CustomerModifierToggleProps {
  /** The modifier type ID */
  modifierTypeId: string;
  /** Option that represents the "checked" state */
  toggleOptionChecked: IOption;
  /** Option that represents the "unchecked" state */
  toggleOptionUnchecked: IOption;
  /** State of the checked option */
  optionCheckedState: MetadataModifierOptionMapEntry;
  /** State of the unchecked option */
  optionUncheckedState: MetadataModifierOptionMapEntry;
  /** Called when toggle state changes */
  onSelectRadio: (mtId: string, optionId: string) => void;
  /** Optional wrapper for the toggle (e.g., for tooltips) */
  renderOptionWrapper?: (
    option: IOption,
    enableState: MetadataModifierOptionMapEntry,
    children: ReactNode,
  ) => ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function CustomerModifierToggle({
  modifierTypeId,
  toggleOptionChecked,
  toggleOptionUnchecked,
  optionCheckedState,
  optionUncheckedState,
  onSelectRadio,
  renderOptionWrapper,
}: CustomerModifierToggleProps) {
  const optionValue = useMemo(
    () => optionCheckedState.placement === OptionPlacement.WHOLE,
    [optionCheckedState.placement],
  );

  const toggleOption = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    onSelectRadio(modifierTypeId, e.target.checked ? toggleOptionChecked.id : toggleOptionUnchecked.id);
  };

  const toggleElement = (
    <CustomizerFormControlLabel
      control={
        <Checkbox
          checkedIcon={<WholeCircleIcon />}
          icon={<WholeCircleOutlinedIcon />}
          disableRipple
          disableFocusRipple
          disableTouchRipple
          disabled={
            (optionValue ? optionUncheckedState.enable_whole : optionCheckedState.enable_whole).enable !==
            DISABLE_REASON.ENABLED
          }
          checked={optionValue}
          onChange={toggleOption}
        />
      }
      label={toggleOptionChecked.displayName}
    />
  );

  if (renderOptionWrapper) {
    return renderOptionWrapper(
      optionValue ? toggleOptionUnchecked : toggleOptionChecked,
      optionValue ? optionUncheckedState : optionCheckedState,
      toggleElement,
    );
  }

  return toggleElement;
}
