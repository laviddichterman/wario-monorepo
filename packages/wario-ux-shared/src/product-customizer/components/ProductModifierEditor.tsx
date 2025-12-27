/**
 * ProductModifierEditor - Renders all modifier types for a product.
 *
 * This component composes ModifierTypeEditor for each modifier type
 * and provides a consistent layout.
 *
 * Usage:
 * ```tsx
 * const { normalizedModifiers, selectRadio, toggleCheckbox, getModifierType } = useModifierEditor({
 *   productModifiers: product.modifiers,
 *   currentSelections: form.modifiers,
 *   onSelectionsChange: setModifiers,
 *   catalog,
 * });
 *
 * <ProductModifierEditor
 *   modifierEntries={normalizedModifiers}
 *   getModifierType={getModifierType}
 *   getOption={getOption}
 *   onSelectRadio={selectRadio}
 *   onToggleCheckbox={toggleCheckbox}
 * />
 * ```
 */

import { type ReactNode } from 'react';

import { Card, CardContent, FormControl, FormLabel, Grid } from '@mui/material';

import { OptionPlacement, OptionQualifier } from '@wcp/wario-shared/logic';
import type { IOption, IOptionInstance, IOptionType, ProductInstanceModifierEntry } from '@wcp/wario-shared/types';

import { ModifierTypeEditor, type OptionEditorState } from './ModifierTypeEditor';

// =============================================================================
// Types
// =============================================================================

export interface ProductModifierEditorProps {
  /** Normalized modifier entries (all options represented) */
  modifierEntries: ProductInstanceModifierEntry[];
  /** Function to get modifier type definition by ID */
  getModifierType: (mtId: string) => IOptionType | undefined;
  /** Function to get option definition by ID */
  getOption: (optionId: string) => IOption | undefined;
  /** Called when a radio option is selected */
  onSelectRadio: (mtId: string, optionId: string) => void;
  /** Called when a checkbox option is toggled */
  onToggleCheckbox: (mtId: string, optionId: string, state: Pick<IOptionInstance, 'placement' | 'qualifier'>) => void;

  // === Optional Features ===

  /** Enable placement selection (left/half/right) - default: false */
  enablePlacement?: boolean;
  /** Filter visible options per modifier type */
  filterOptions?: (mtId: string, options: IOption[]) => IOption[];
  /** Render wrapper for each option (e.g., for tooltips) */
  renderOptionWrapper?: (mtId: string, option: IOption, state: OptionEditorState, children: ReactNode) => ReactNode;
  /** Called when advanced options should be opened */
  onOpenAdvanced?: (mtId: string, optionId: string) => void;
  /** Layout variant - 'cards' wraps each modifier in a card, 'compact' uses minimal spacing */
  layout?: 'cards' | 'compact';
  /** Grid column sizes per modifier type */
  gridSizes?: { xs?: number; sm?: number; md?: number; lg?: number };
}

// =============================================================================
// Component
// =============================================================================

export function ProductModifierEditor({
  modifierEntries,
  getModifierType,
  getOption,
  onSelectRadio,
  onToggleCheckbox,
  enablePlacement = false,
  filterOptions,
  renderOptionWrapper,
  onOpenAdvanced,
  layout = 'cards',
  gridSizes = { xs: 12 },
}: ProductModifierEditorProps) {
  return (
    <Grid container spacing={2}>
      {modifierEntries.map((entry) => {
        const modifierType = getModifierType(entry.modifierTypeId);
        if (!modifierType) return null;

        // Build options array from option IDs
        const allOptions = modifierType.options
          .map((oId) => getOption(oId))
          .filter((o): o is IOption => o !== undefined);

        // Apply visibility filter if provided
        const visibleOptions = filterOptions ? filterOptions(entry.modifierTypeId, allOptions) : allOptions;

        if (visibleOptions.length === 0) return null;

        // Build option states map
        const optionStates = new Map<string, OptionEditorState>();
        for (const opt of entry.options) {
          optionStates.set(opt.optionId, {
            optionId: opt.optionId,
            placement: opt.placement,
            qualifier: opt.qualifier,
          });
        }
        // Ensure all visible options have a state
        for (const opt of visibleOptions) {
          if (!optionStates.has(opt.id)) {
            optionStates.set(opt.id, {
              optionId: opt.id,
              placement: OptionPlacement.NONE,
              qualifier: OptionQualifier.REGULAR,
            });
          }
        }

        const modifierEditor = (
          <ModifierTypeEditor
            modifierType={modifierType}
            options={visibleOptions}
            optionStates={optionStates}
            onSelectRadio={(optionId) => {
              onSelectRadio(entry.modifierTypeId, optionId);
            }}
            onToggleCheckbox={(optionId, state) => {
              onToggleCheckbox(entry.modifierTypeId, optionId, state);
            }}
            enablePlacement={enablePlacement}
            renderOptionWrapper={
              renderOptionWrapper
                ? (option, state, children) => renderOptionWrapper(entry.modifierTypeId, option, state, children)
                : undefined
            }
            onOpenAdvanced={
              onOpenAdvanced
                ? (optionId) => {
                    onOpenAdvanced(entry.modifierTypeId, optionId);
                  }
                : undefined
            }
          />
        );

        const content =
          layout === 'cards' ? (
            <Card variant="outlined">
              <CardContent>
                <FormControl fullWidth>
                  <FormLabel>{modifierType.name}:</FormLabel>
                  {modifierEditor}
                </FormControl>
              </CardContent>
            </Card>
          ) : (
            <FormControl fullWidth>
              <FormLabel>{modifierType.name}:</FormLabel>
              {modifierEditor}
            </FormControl>
          );

        return (
          <Grid key={entry.modifierTypeId} size={gridSizes}>
            {content}
          </Grid>
        );
      })}
    </Grid>
  );
}
