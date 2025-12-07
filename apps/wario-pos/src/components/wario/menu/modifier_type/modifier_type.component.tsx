import { snakeCase, startCase } from 'es-toolkit/compat';

import { FormControl, FormControlLabel, FormLabel, Grid, Radio, RadioGroup } from '@mui/material';

import { DISPLAY_AS, formatDecimal, MODIFIER_CLASS, parseInteger } from '@wcp/wario-shared';
import { CheckedNumericInput } from '@wcp/wario-ux-shared/components';

import { ExternalIdsExpansionPanelComponent } from '@/components/wario/ExternalIdsExpansionPanelComponent';
import { IntNumericPropertyComponent } from '@/components/wario/property-components/IntNumericPropertyComponent';
import { StringEnumPropertyComponent } from '@/components/wario/property-components/StringEnumPropertyComponent';
import { StringPropertyComponent } from '@/components/wario/property-components/StringPropertyComponent';
import { ToggleBooleanPropertyComponent } from '@/components/wario/property-components/ToggleBooleanPropertyComponent';

import { useModifierTypeForm } from '@/atoms/forms/modifierTypeFormAtoms';

import { ElementActionComponent } from '../element.action.component';

export interface ModifierTypeUiProps {
  onCloseCallback: VoidFunction;
}

export type ModifierTypeModifyUiProps = {
  modifier_type_id: string;
} & ModifierTypeUiProps;
/**
 * Form body for ModifierType - reads state from Jotai atoms.
 * This replaces the old ModifierTypeContainer which required 30+ props.
 */
export const ModifierTypeFormBody = () => {
  const { form, updateField, isProcessing } = useModifierTypeForm();

  if (!form) return null;

  const handleSetMaxSelected = (val: number | null) => {
    if (val !== 1) {
      if (form.emptyDisplayAs === DISPLAY_AS.LIST_CHOICES) {
        updateField('emptyDisplayAs', DISPLAY_AS.YOUR_CHOICE_OF);
      }
      updateField('useToggleIfOnlyTwoOptions', false);
    }
    updateField('maxSelected', val);
  };

  const handleSetMinSelected = (val: number) => {
    if (val !== 1) {
      updateField('useToggleIfOnlyTwoOptions', false);
    }
    if (form.maxSelected !== null && form.maxSelected < val) {
      updateField('maxSelected', val);
    }
    updateField('minSelected', val);
  };

  return (
    <>
      <Grid size={12}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Modifier Type Name"
          setValue={(v) => {
            updateField('name', v);
          }}
          value={form.name}
        />
      </Grid>
      <Grid size={12}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Display Name (Optional)"
          setValue={(v) => {
            updateField('displayName', v);
          }}
          value={form.displayName}
        />
      </Grid>
      <Grid size={4}>
        <IntNumericPropertyComponent
          disabled={isProcessing}
          label="Ordinal"
          value={form.ordinal}
          setValue={(v) => {
            updateField('ordinal', v);
          }}
        />
      </Grid>
      <Grid size={4}>
        <IntNumericPropertyComponent
          disabled={isProcessing}
          label="Min Selected"
          value={form.minSelected}
          setValue={handleSetMinSelected}
        />
      </Grid>
      <Grid size={4}>
        <CheckedNumericInput
          label="Max Selected"
          type="number"
          inputMode="numeric"
          step={1}
          numberProps={{
            allowEmpty: true,
            formatFunction: (i) => formatDecimal(i, 2),
            parseFunction: parseInteger,
            min: form.minSelected,
          }}
          pattern="[0-9]*"
          value={form.maxSelected}
          disabled={isProcessing}
          onChange={(e: number | '') => {
            handleSetMaxSelected(e ? e : null);
          }}
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={isProcessing}
          label="Omit Section If No Available Options"
          value={form.omitSectionIfNoAvailableOptions}
          setValue={(v) => {
            updateField('omitSectionIfNoAvailableOptions', v);
          }}
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={isProcessing}
          label="Omit Option If Not Available"
          value={form.omitOptionIfNotAvailable}
          setValue={(v) => {
            updateField('omitOptionIfNotAvailable', v);
          }}
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={isProcessing || form.maxSelected !== 1 || form.minSelected !== 1}
          label="Use Toggle If Only Two Options"
          value={form.useToggleIfOnlyTwoOptions}
          setValue={(v) => {
            updateField('useToggleIfOnlyTwoOptions', v);
          }}
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={isProcessing}
          label="Hide from user customization"
          setValue={(v) => {
            updateField('isHiddenDuringCustomization', v);
          }}
          value={form.isHiddenDuringCustomization}
        />
      </Grid>
      <Grid container size={12}>
        <StringEnumPropertyComponent
          disabled={isProcessing}
          label="Modifier Class"
          value={form.modifierClass}
          setValue={(v) => {
            updateField('modifierClass', v);
          }}
          options={Object.values(MODIFIER_CLASS)}
        />
      </Grid>
      <Grid container size={9}>
        <FormControl component="fieldset">
          <FormLabel component="legend">Empty modifier display in product name as...</FormLabel>
          <RadioGroup
            aria-label="empty-display-as"
            name="empty-display-as"
            row
            value={form.emptyDisplayAs}
            onChange={(e) => {
              updateField('emptyDisplayAs', e.target.value as DISPLAY_AS);
            }}
          >
            {Object.values(DISPLAY_AS).map((opt, i) => (
              <FormControlLabel
                key={i}
                value={opt}
                disabled={opt === DISPLAY_AS.LIST_CHOICES && form.maxSelected !== 1}
                control={<Radio />}
                label={startCase(snakeCase(opt))}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Grid>
      <Grid size={3}>
        <ToggleBooleanPropertyComponent
          disabled={isProcessing}
          label="Is 3rd Party"
          setValue={(v) => {
            updateField('is3p', v);
          }}
          value={form.is3p}
        />
      </Grid>
      <Grid size={6}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Template String"
          setValue={(v) => {
            updateField('templateString', v);
          }}
          value={form.templateString}
        />
      </Grid>
      <Grid size={6}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Multiple Item Separator"
          setValue={(v) => {
            updateField('multipleItemSeparator', v);
          }}
          value={form.multipleItemSeparator}
        />
      </Grid>
      <Grid size={6}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Non-Empty Group Prefix"
          setValue={(v) => {
            updateField('nonEmptyGroupPrefix', v);
          }}
          value={form.nonEmptyGroupPrefix}
        />
      </Grid>
      <Grid size={6}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Non-Empty Group Suffix"
          setValue={(v) => {
            updateField('nonEmptyGroupSuffix', v);
          }}
          value={form.nonEmptyGroupSuffix}
        />
      </Grid>
      <Grid size={12}>
        <ExternalIdsExpansionPanelComponent
          title="External IDs"
          disabled={isProcessing}
          value={form.externalIds}
          setValue={(v) => {
            updateField('externalIds', v);
          }}
        />
      </Grid>
    </>
  );
};

export interface ModifierTypeFormComponentProps {
  confirmText: string;
  onCloseCallback: VoidFunction;
  onConfirmClick: VoidFunction;
  disableConfirm?: boolean;
  children?: React.ReactNode;
}

/**
 * Complete ModifierType form with actions.
 * Wraps ModifierTypeFormBody with confirm/cancel buttons.
 */
export const ModifierTypeFormComponent = ({
  confirmText,
  onCloseCallback,
  onConfirmClick,
  disableConfirm = false,
  children,
}: ModifierTypeFormComponentProps) => {
  const { isValid, isProcessing } = useModifierTypeForm();

  return (
    <ElementActionComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={onConfirmClick}
      isProcessing={isProcessing}
      disableConfirmOn={disableConfirm || !isValid || isProcessing}
      confirmText={confirmText}
      body={
        <>
          <ModifierTypeFormBody />
          {children}
        </>
      }
    />
  );
};
