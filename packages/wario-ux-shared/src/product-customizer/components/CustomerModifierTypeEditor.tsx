/**
 * CustomerModifierTypeEditor - Customer-facing modifier type editor.
 *
 * Orchestrates CustomerModifierRadio, CustomerModifierCheckbox, and CustomerModifierToggle
 * based on the modifier type's configuration. Uses CustomizerContext for product/catalog
 * data and derives visibility/state internally.
 *
 * Usage:
 * ```tsx
 * <CustomizerProvider product={product} catalogSelectors={...} ...>
 *   <CustomerModifierTypeEditor
 *     mtid={mtid}
 *     onSelectRadio={selectRadio}
 *     onToggleCheckbox={toggleCheckbox}
 *   />
 * </CustomizerProvider>
 * ```
 */

import { type ReactNode, useCallback, useMemo } from 'react';

import FormControl, { type FormControlProps } from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';

import { OptionPlacement, SortAndFilterModifierOptions } from '@wcp/wario-shared/logic';
import type { IOption, IOptionInstance, MetadataModifierOptionMapEntry } from '@wcp/wario-shared/types';

import { useCustomizerContext } from '../context';

import { CustomerModifierCheckbox } from './CustomerModifierCheckbox';
import { CustomerModifierRadio } from './CustomerModifierRadio';
import { CustomerModifierToggle } from './CustomerModifierToggle';

// =============================================================================
// Types
// =============================================================================

export interface CustomerModifierTypeEditorProps {
  /** The modifier type ID */
  mtid: string;
  /** Whether split placement mode is enabled */
  enableSplitMode?: boolean;
  /** Size variant: 'medium' (default) or 'small' (compact for POS) */
  size?: 'medium' | 'small';
  /** Called when a radio option is selected */
  onSelectRadio: (mtId: string, optionId: string) => void;
  /** Called when a checkbox option is toggled */
  onToggleCheckbox: (mtId: string, optionId: string, state: Pick<IOptionInstance, 'placement' | 'qualifier'>) => void;
  /** Called when advanced options are opened */
  onOpenAdvanced?: (mtId: string, optionId: string) => void;
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

export function CustomerModifierTypeEditor({
  mtid,
  enableSplitMode = false,
  size = 'medium',
  onSelectRadio,
  onToggleCheckbox,
  onOpenAdvanced,
  renderOptionWrapper,
  ...other
}: CustomerModifierTypeEditorProps & Omit<FormControlProps, 'children'>) {
  // Get raw data from context
  const { product, catalogSelectors, serviceDateTime } = useCustomizerContext();

  // Derive state from context data
  const baseProductInstance = product.p;
  const modifierType = catalogSelectors.modifierEntry(mtid);

  // getOptionState - simple lookup into product.m.modifier_map
  const getOptionState = useCallback(
    (modifierTypeId: string, optionId: string): MetadataModifierOptionMapEntry | undefined => {
      const modifierMap = product.m.modifier_map;
      if (Object.hasOwn(modifierMap, modifierTypeId) && Object.hasOwn(modifierMap[modifierTypeId].options, optionId)) {
        return modifierMap[modifierTypeId].options[optionId];
      }
      return undefined;
    },
    [product.m.modifier_map],
  );

  // getVisibleOptions - filters and sorts options based on availability
  const visibleOptions = useMemo((): IOption[] => {
    if (!modifierType) return [];
    return SortAndFilterModifierOptions(product.m, modifierType, catalogSelectors.option, serviceDateTime);
  }, [modifierType, product.m, catalogSelectors.option, serviceDateTime]);

  const modifierOptionsHtml = useMemo(() => {
    if (!modifierType) return null;

    // Single-select modifier
    if (modifierType.max_selected === 1) {
      // Required single-select
      if (modifierType.min_selected === 1) {
        // Check for toggle display (exactly 2 visible options with specific conditions)
        if (modifierType.displayFlags.use_toggle_if_only_two_options && visibleOptions.length === 2) {
          const mtidx = baseProductInstance.modifiers.findIndex((x) => x.modifierTypeId === mtid);
          if (mtidx !== -1 && baseProductInstance.modifiers[mtidx].options.length === 1) {
            const baseOptionIndex = visibleOptions.findIndex(
              (x) => x.id === baseProductInstance.modifiers[mtidx].options[0].optionId,
            );
            if (baseOptionIndex !== -1) {
              // Toggle mode
              const optionCheckedState = getOptionState(mtid, visibleOptions[baseOptionIndex === 0 ? 1 : 0].id);
              const optionUncheckedState = getOptionState(mtid, visibleOptions[baseOptionIndex].id);

              if (optionCheckedState && optionUncheckedState) {
                return (
                  <CustomerModifierToggle
                    modifierTypeId={mtid}
                    toggleOptionChecked={visibleOptions[baseOptionIndex === 0 ? 1 : 0]}
                    toggleOptionUnchecked={visibleOptions[baseOptionIndex]}
                    optionCheckedState={optionCheckedState}
                    optionUncheckedState={optionUncheckedState}
                    onSelectRadio={onSelectRadio}
                    renderOptionWrapper={renderOptionWrapper}
                  />
                );
              }
            }
          }
        }
      }

      // Radio mode (default for max_selected === 1)
      // Find selected option
      let selectedOptionId: string | null = null;
      for (const opt of visibleOptions) {
        const state = getOptionState(mtid, opt.id);
        if (state && state.placement !== OptionPlacement.NONE) {
          selectedOptionId = opt.id;
          break;
        }
      }

      return (
        <CustomerModifierRadio
          modifierType={modifierType}
          options={visibleOptions}
          selectedOptionId={selectedOptionId}
          getOptionState={getOptionState}
          onSelectRadio={onSelectRadio}
          renderOptionWrapper={renderOptionWrapper}
        />
      );
    }

    // Multi-select modifier (checkbox mode)
    return (
      <FormGroup aria-labelledby={`modifier_control_${mtid}`} sx={{ width: '100%' }}>
        <Grid container>
          {visibleOptions.map((option, i) => (
            <CustomerModifierCheckbox
              key={i}
              modifierTypeId={mtid}
              option={option}
              showAdvancedMode={enableSplitMode}
              size={size}
              getOptionState={getOptionState}
              onToggleCheckbox={onToggleCheckbox}
              onOpenAdvanced={
                onOpenAdvanced
                  ? (optId) => {
                      onOpenAdvanced(mtid, optId);
                    }
                  : undefined
              }
              renderOptionWrapper={renderOptionWrapper}
            />
          ))}
        </Grid>
      </FormGroup>
    );
  }, [
    modifierType,
    mtid,
    baseProductInstance.modifiers,
    visibleOptions,
    getOptionState,
    onSelectRadio,
    onToggleCheckbox,
    enableSplitMode,
    size,
    onOpenAdvanced,
    renderOptionWrapper,
  ]);

  if (!modifierType) return null;

  return (
    <FormControl fullWidth {...other}>
      <FormLabel id={`modifier_control_${mtid}`}>{modifierType.displayName || modifierType.name}:</FormLabel>
      {modifierOptionsHtml}
    </FormControl>
  );
}
