/**
 * ModifierTypeEditor - A shared component for editing a single modifier type.
 *
 * This component renders the appropriate control based on the modifier type's
 * configuration (radio for single-select, checkbox for multi-select) and
 * supports opt-in advanced features like placement (left/half/right).
 *
 * Usage:
 * ```tsx
 * <ModifierTypeEditor
 *   modifierTypeId={mtId}
 *   options={visibleOptions}
 *   optionStates={normalizedOptions}
 *   onSelectRadio={(optionId) => selectRadio(mtId, optionId)}
 *   onToggleCheckbox={(optionId, state) => toggleCheckbox(mtId, optionId, state)}
 *   // Optional features:
 *   enablePlacement={true}
 *   renderOptionWrapper={(option, children) => <Tooltip>{children}</Tooltip>}
 * />
 * ```
 */

import { type ReactNode, useMemo } from 'react';

import {
  Checkbox,
  type CheckboxProps,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
  type RadioProps,
} from '@mui/material';

import { OptionPlacement, OptionQualifier } from '@wcp/wario-shared/logic';
import type { IOption, IOptionInstance, IOptionType } from '@wcp/wario-shared/types';

// =============================================================================
// Types
// =============================================================================

/** State for a single option in the normalized form */
export interface OptionEditorState extends IOptionInstance {
  /** Whether the option is enabled/disabled for selection */
  disabled?: boolean;
}

export interface ModifierTypeEditorProps {
  /** The modifier type definition */
  modifierType: IOptionType;
  /** The options to display (may be filtered for visibility) */
  options: IOption[];
  /** Current state for each option, keyed by option ID */
  optionStates: Map<string, OptionEditorState>;
  /** Called when a radio option is selected */
  onSelectRadio: (optionId: string) => void;
  /** Called when a checkbox option is toggled */
  onToggleCheckbox: (optionId: string, state: Pick<IOptionInstance, 'placement' | 'qualifier'>) => void;

  // === Optional Features ===

  /** Enable placement selection (left/half/right) - default: false */
  enablePlacement?: boolean;
  /** Render wrapper for each option (e.g., for tooltips) */
  renderOptionWrapper?: (option: IOption, state: OptionEditorState, children: ReactNode) => ReactNode;
  /** Custom checkbox props */
  checkboxProps?: Partial<CheckboxProps>;
  /** Custom radio props */
  radioProps?: Partial<RadioProps>;
  /** Layout direction - default: 'row' */
  direction?: 'row' | 'column';
  /** Called when advanced options should be opened for an option */
  onOpenAdvanced?: (optionId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function ModifierTypeEditor({
  modifierType,
  options,
  optionStates,
  onSelectRadio,
  onToggleCheckbox,
  enablePlacement = false,
  renderOptionWrapper,
  checkboxProps = {},
  radioProps = {},
  direction = 'row',
  onOpenAdvanced,
}: ModifierTypeEditorProps) {
  const isRadio = modifierType.min_selected === 1 && modifierType.max_selected === 1;

  // Find the currently selected option for radio mode
  const selectedRadioId = useMemo(() => {
    if (!isRadio) return null;
    for (const [optionId, state] of optionStates) {
      if (state.placement !== OptionPlacement.NONE) {
        return optionId;
      }
    }
    return null;
  }, [isRadio, optionStates]);

  // Wrapper helper
  const wrapOption = (option: IOption, state: OptionEditorState, children: ReactNode) => {
    if (renderOptionWrapper) {
      return renderOptionWrapper(option, state, children);
    }
    return children;
  };

  if (isRadio) {
    return (
      <RadioGroup
        aria-label={modifierType.name}
        name={modifierType.name}
        row={direction === 'row'}
        value={selectedRadioId ?? ''}
        onChange={(e) => {
          onSelectRadio(e.target.value);
        }}
      >
        {options.map((option) => {
          const state = optionStates.get(option.id) ?? {
            optionId: option.id,
            placement: OptionPlacement.NONE,
            qualifier: OptionQualifier.REGULAR,
          };
          return wrapOption(
            option,
            state,
            <FormControlLabel
              key={option.id}
              value={option.id}
              disabled={state.disabled}
              control={<Radio disableRipple {...radioProps} />}
              label={option.displayName}
            />,
          );
        })}
      </RadioGroup>
    );
  }

  // Checkbox mode
  return (
    <FormGroup row={direction === 'row'} aria-label={modifierType.name}>
      {options.map((option) => {
        const state = optionStates.get(option.id) ?? {
          optionId: option.id,
          placement: OptionPlacement.NONE,
          qualifier: OptionQualifier.REGULAR,
        };
        const isChecked = state.placement !== OptionPlacement.NONE;

        const handleClick = () => {
          if (enablePlacement) {
            // With placement enabled, clicking opens advanced options if available
            if (onOpenAdvanced) {
              onOpenAdvanced(option.id);
            } else {
              // Default: just toggle whole
              const newPlacement = isChecked ? OptionPlacement.NONE : OptionPlacement.WHOLE;
              onToggleCheckbox(option.id, { placement: newPlacement, qualifier: OptionQualifier.REGULAR });
            }
          } else {
            // Simple mode: toggle whole placement
            const newPlacement = isChecked ? OptionPlacement.NONE : OptionPlacement.WHOLE;
            onToggleCheckbox(option.id, { placement: newPlacement, qualifier: OptionQualifier.REGULAR });
          }
        };

        return wrapOption(
          option,
          state,
          <FormControlLabel
            key={option.id}
            disabled={state.disabled}
            control={<Checkbox checked={isChecked} onClick={handleClick} disableRipple {...checkboxProps} />}
            label={option.displayName}
          />,
        );
      })}
    </FormGroup>
  );
}
