import { snakeCase, startCase } from 'es-toolkit/compat';

import { FormControl, FormControlLabel, FormLabel, Grid, Radio, RadioGroup } from "@mui/material";

import type { KeyValue } from "@wcp/wario-shared";
import { DISPLAY_AS, MODIFIER_CLASS } from "@wcp/wario-shared";
import { CheckedNumericInput, type ValSetValNamed } from "@wcp/wario-ux-shared";

import { ExternalIdsExpansionPanelComponent } from "../../ExternalIdsExpansionPanelComponent";
import { IntNumericPropertyComponent } from "../../property-components/IntNumericPropertyComponent";
import { StringEnumPropertyComponent } from "../../property-components/StringEnumPropertyComponent";
import { StringPropertyComponent } from "../../property-components/StringPropertyComponent";
import { ToggleBooleanPropertyComponent } from "../../property-components/ToggleBooleanPropertyComponent";
import { ElementActionComponent } from "../element.action.component";

export interface ModifierTypeUiProps {
  onCloseCallback: VoidFunction;
}

export type ModifierTypeModifyUiProps = {
  modifier_type_id: string;
} & ModifierTypeUiProps;

export type ModifierTypeContainerProps =
  ValSetValNamed<number, 'ordinal'> &
  ValSetValNamed<number, 'minSelected'> &
  ValSetValNamed<number | null, 'maxSelected'> &
  ValSetValNamed<string, 'name'> &
  ValSetValNamed<string, 'displayName'> &
  ValSetValNamed<KeyValue[], 'externalIds'> &
  ValSetValNamed<string, 'templateString'> &
  ValSetValNamed<string, 'multipleItemSeparator'> &
  ValSetValNamed<string, 'nonEmptyGroupPrefix'> &
  ValSetValNamed<string, 'nonEmptyGroupSuffix'> &
  ValSetValNamed<boolean, 'is3p'> &
  ValSetValNamed<boolean, 'omitOptionIfNotAvailable'> &
  ValSetValNamed<boolean, 'omitSectionIfNoAvailableOptions'> &
  ValSetValNamed<boolean, 'useToggleIfOnlyTwoOptions'> &
  ValSetValNamed<boolean, 'isHiddenDuringCustomization'> &
  ValSetValNamed<keyof typeof DISPLAY_AS, 'emptyDisplayAs'> &
  ValSetValNamed<keyof typeof MODIFIER_CLASS, 'modifierClass'> & {
    confirmText: string;
    onConfirmClick: VoidFunction;
    isProcessing: boolean;
  };

export const IsValidModifierType = (props: Pick<ModifierTypeContainerProps, 'name' | 'maxSelected' | 'minSelected' | 'useToggleIfOnlyTwoOptions'>) => !(props.name.length === 0 ||
  (Number.isFinite(props.maxSelected) && (props.maxSelected!) < props.minSelected) ||
  (props.useToggleIfOnlyTwoOptions && (props.maxSelected !== 1 || props.minSelected !== 1)));

export const ModifierTypeContainer = (props: ModifierTypeContainerProps) => {
  const handleSetMaxSelected = (val: number | null) => {
    if (val !== 1) {
      if (props.emptyDisplayAs === DISPLAY_AS.LIST_CHOICES) {
        props.setEmptyDisplayAs(DISPLAY_AS.YOUR_CHOICE_OF);
      }
      props.setUseToggleIfOnlyTwoOptions(false);
    }
    props.setMaxSelected(val);
  }

  const handleSetMinSelected = (val: number) => {
    if (val !== 1) {
      props.setUseToggleIfOnlyTwoOptions(false);
    }
    if (props.maxSelected !== null && props.maxSelected < val) {
      props.setMaxSelected(val);
    }
    props.setMinSelected(val);
  }
  return (
    <>
      <Grid size={12}>
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Modifier Type Name"
          setValue={props.setName}
          value={props.name}
        />
      </Grid>
      <Grid size={12}>
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Display Name (Optional)"
          setValue={props.setDisplayName}
          value={props.displayName}
        />
      </Grid>
      <Grid size={4}>
        <IntNumericPropertyComponent
          disabled={props.isProcessing}
          label="Ordinal"
          value={props.ordinal}
          setValue={props.setOrdinal}
        />
      </Grid>
      <Grid size={4}>
        <IntNumericPropertyComponent
          disabled={props.isProcessing}
          label="Min Selected"
          value={props.minSelected}
          setValue={handleSetMinSelected}
        />
      </Grid>
      <Grid size={4}>
        <CheckedNumericInput
          label="Max Selected"
          type="number"
          inputProps={{ inputMode: 'numeric', min: props.minSelected, pattern: '[0-9]*', step: 1 }}
          value={props.maxSelected}
          disabled={props.isProcessing}
          onChange={(e) => { handleSetMaxSelected(e); }}
          parseFunction={(v) => v !== null && v ? parseInt(v) : null}
          allowEmpty />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Omit Section If No Available Options"
          value={props.omitSectionIfNoAvailableOptions}
          setValue={props.setOmitSectionIfNoAvailableOptions}
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Omit Option If Not Available"
          value={props.omitOptionIfNotAvailable}
          setValue={props.setOmitOptionIfNotAvailable}
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing || props.maxSelected !== 1 || props.minSelected !== 1}
          label="Use Toggle If Only Two Options"
          value={props.useToggleIfOnlyTwoOptions}
          setValue={props.setUseToggleIfOnlyTwoOptions}
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Hide from user customization"
          setValue={props.setIsHiddenDuringCustomization}
          value={props.isHiddenDuringCustomization} />
      </Grid>
      <Grid container size={12}>
        <StringEnumPropertyComponent
          disabled={props.isProcessing}
          label="Modifier Class"
          value={props.modifierClass}
          setValue={props.setModifierClass}
          options={Object.keys(MODIFIER_CLASS)}
        />
      </Grid>
      <Grid container size={9}>
        <FormControl component="fieldset">
          <FormLabel component="legend">Empty modifier display in product name as...</FormLabel>
          <RadioGroup
            aria-label="empty-display-as"
            name="empty-display-as"
            row
            value={props.emptyDisplayAs}
            onChange={(e) => { props.setEmptyDisplayAs(e.target.value as keyof typeof DISPLAY_AS); }}
          >
            {Object.keys(DISPLAY_AS).map((opt, i) =>
              <FormControlLabel
                key={i}
                value={opt}
                disabled={opt === DISPLAY_AS.LIST_CHOICES && props.maxSelected !== 1}
                control={<Radio />}
                label={startCase(snakeCase(opt))}
              />
            )}
          </RadioGroup>
        </FormControl>
      </Grid>
      <Grid size={3}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Is 3rd Party"
          setValue={props.setIs3p}
          value={props.is3p} />
      </Grid>
      <Grid size={6}>
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Template String"
          setValue={props.setTemplateString}
          value={props.templateString}
        />
      </Grid>
      <Grid size={6}>
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Multiple Item Separator"
          setValue={props.setMultipleItemSeparator}
          value={props.multipleItemSeparator}
        />
      </Grid>
      <Grid size={6}>
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Non-Empty Group Prefix"
          setValue={props.setNonEmptyGroupPrefix}
          value={props.nonEmptyGroupPrefix}
        />
      </Grid>
      <Grid size={6}>
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Non-Empty Group Suffix"
          setValue={props.setNonEmptyGroupSuffix}
          value={props.nonEmptyGroupSuffix}
        />
      </Grid>
      <Grid size={12}>
        <ExternalIdsExpansionPanelComponent
          title='External IDs'
          disabled={props.isProcessing}
          value={props.externalIds}
          setValue={props.setExternalIds}
        />
      </Grid>
    </>
  );
}


export type ModifierTypeComponentProps = ModifierTypeContainerProps & {
  confirmText: string;
  onConfirmClick: VoidFunction;
  isProcessing: boolean;
  disableConfirm: boolean;
  children?: React.ReactNode;
};

export const ModifierTypeComponent = (props: ModifierTypeComponentProps & ModifierTypeUiProps) => (
  <ElementActionComponent
    onCloseCallback={props.onCloseCallback}
    onConfirmClick={props.onConfirmClick}
    isProcessing={props.isProcessing}
    disableConfirmOn={props.disableConfirm || !IsValidModifierType(props) || props.isProcessing}
    confirmText={props.confirmText}
    body={
      <>
        <ModifierTypeContainer {...props} />
        {props.children}
      </>
    }
  />
);

export default ModifierTypeComponent;
