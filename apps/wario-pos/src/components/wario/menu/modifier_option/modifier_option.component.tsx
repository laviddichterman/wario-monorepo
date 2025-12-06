import { useAtom, useAtomValue } from 'jotai';
import { useState } from 'react';

import { Autocomplete, Grid, TextField } from '@mui/material';

import {
  type IMoney,
  type IOptionType,
  type IRecurringInterval,
  type IWInterval,
  type KeyValue,
} from '@wcp/wario-shared';
import { type ValSetValNamed } from '@wcp/wario-ux-shared/common';
import { useCatalogSelectors, useProductInstanceFunctionIds } from '@wcp/wario-ux-shared/query';

import AvailabilityListBuilderComponent from '@/components/wario/AvailabilityListBuilderComponent';
import DatetimeBasedDisableComponent from '@/components/wario/datetime_based_disable.component';
import { ExternalIdsExpansionPanelComponent } from '@/components/wario/ExternalIdsExpansionPanelComponent';
import { FloatNumericPropertyComponent } from '@/components/wario/property-components/FloatNumericPropertyComponent';
import { IMoneyPropertyComponent } from '@/components/wario/property-components/IMoneyPropertyComponent';
import { IntNumericPropertyComponent } from '@/components/wario/property-components/IntNumericPropertyComponent';
import { StringPropertyComponent } from '@/components/wario/property-components/StringPropertyComponent';
import { ToggleBooleanPropertyComponent } from '@/components/wario/property-components/ToggleBooleanPropertyComponent';

import {
  modifierOptionFormAtom,
  modifierOptionFormIsValidAtom,
  modifierOptionFormProcessingAtom,
  type ModifierOptionFormState,
} from '@/atoms/forms/modifierOptionFormAtoms';

import { ElementActionComponent } from '../element.action.component';

export type ModifierOptionContainerProps = ValSetValNamed<string, 'displayName'> &
  ValSetValNamed<string, 'description'> &
  ValSetValNamed<string, 'shortcode'> &
  ValSetValNamed<number, 'ordinal'> &
  ValSetValNamed<IMoney, 'price'> &
  ValSetValNamed<KeyValue[], 'externalIds'> &
  ValSetValNamed<string | null, 'enableFunction'> &
  ValSetValNamed<number, 'flavorFactor'> &
  ValSetValNamed<number, 'bakeFactor'> &
  ValSetValNamed<boolean, 'canSplit'> &
  ValSetValNamed<boolean, 'allowHeavy'> &
  ValSetValNamed<boolean, 'allowLite'> &
  ValSetValNamed<boolean, 'allowOTS'> &
  ValSetValNamed<boolean, 'omitFromShortname'> &
  ValSetValNamed<boolean, 'omitFromName'> &
  ValSetValNamed<IRecurringInterval[], 'availability'> &
  ValSetValNamed<IWInterval | null, 'disabled'> & {
    modifierType: Omit<IOptionType, 'id'>;
    isProcessing: boolean;
  };

export const ModifierOptionContainer = (
  props: ModifierOptionContainerProps & ValSetValNamed<boolean, 'availabilityIsValid'>,
) => {
  const catalogSelectors = useCatalogSelectors();
  const productInstanceFunctions = useProductInstanceFunctionIds();
  const handleSetAllowOTS = (value: boolean) => {
    if (props.modifierType.max_selected !== 1) {
      props.setAllowOTS(value);
    }
  };
  const handleSetCanSplit = (value: boolean) => {
    if (props.modifierType.max_selected !== 1) {
      props.setCanSplit(value);
    }
  };
  return (
    <>
      <Grid
        size={{
          xs: 12,
          md: 6,
        }}
      >
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Display Name"
          value={props.displayName}
          setValue={props.setDisplayName}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          md: 6,
        }}
      >
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Description"
          value={props.description}
          setValue={props.setDescription}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4,
        }}
      >
        <StringPropertyComponent
          disabled={props.isProcessing}
          label="Short Code"
          value={props.shortcode}
          setValue={props.setShortcode}
        />
      </Grid>
      <Grid
        size={{
          xs: 6,
          sm: 4,
        }}
      >
        <IMoneyPropertyComponent
          disabled={props.isProcessing}
          label="Price"
          value={props.price}
          setValue={props.setPrice}
        />
      </Grid>
      <Grid
        size={{
          xs: 6,
          sm: 4,
        }}
      >
        <IntNumericPropertyComponent
          disabled={props.isProcessing}
          label="Ordinal"
          value={props.ordinal}
          setValue={props.setOrdinal}
        />
      </Grid>
      <Grid size={4}>
        <FloatNumericPropertyComponent
          disabled={props.isProcessing}
          label="Flavor Factor"
          value={props.flavorFactor}
          setValue={props.setFlavorFactor}
        />
      </Grid>
      <Grid size={4}>
        <FloatNumericPropertyComponent
          disabled={props.isProcessing}
          label="Bake Max"
          value={props.bakeFactor}
          setValue={props.setBakeFactor}
        />
      </Grid>
      <Grid size={4}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing || props.modifierType.max_selected === 1}
          label="Can Split"
          value={props.modifierType.max_selected !== 1 && props.canSplit}
          setValue={handleSetCanSplit}
          labelPlacement="end"
        />
      </Grid>
      <Grid size={4}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Allow Heavy"
          value={props.allowHeavy}
          setValue={props.setAllowHeavy}
          labelPlacement="end"
        />
      </Grid>
      <Grid size={4}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Allow Lite"
          value={props.allowLite}
          setValue={props.setAllowLite}
          labelPlacement="end"
        />
      </Grid>
      <Grid size={4}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing || props.modifierType.max_selected === 1}
          label="Allow OTS"
          value={props.modifierType.max_selected !== 1 && props.allowOTS}
          setValue={handleSetAllowOTS}
          labelPlacement="end"
        />
      </Grid>
      <Grid size={12}>
        <Autocomplete
          fullWidth
          options={productInstanceFunctions}
          value={props.enableFunction}
          onChange={(_e, v) => {
            props.setEnableFunction(v);
          }}
          getOptionLabel={(option) => catalogSelectors?.productInstanceFunction(option).name || option}
          isOptionEqualToValue={(o, v) => o === v}
          renderInput={(params) => <TextField {...params} label="Enable Function Name" />}
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Omit from shortname"
          value={props.omitFromShortname}
          setValue={props.setOmitFromShortname}
          labelPlacement="end"
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Omit from name"
          value={props.omitFromName}
          setValue={props.setOmitFromName}
          labelPlacement="end"
        />
      </Grid>
      <Grid size={12}>
        <ExternalIdsExpansionPanelComponent
          title="External IDs"
          disabled={props.isProcessing}
          value={props.externalIds}
          setValue={props.setExternalIds}
        />
      </Grid>
      <Grid size={12}>
        <AvailabilityListBuilderComponent
          availabilityIsValid={props.availabilityIsValid}
          setAvailabilityIsValid={props.setAvailabilityIsValid}
          disabled={props.isProcessing}
          value={props.availability}
          setValue={props.setAvailability}
        />
      </Grid>
      <Grid size={12}>
        <DatetimeBasedDisableComponent
          disabled={props.isProcessing}
          value={props.disabled}
          setValue={props.setDisabled}
        />
      </Grid>
    </>
  );
};

// =============================================================================
// NEW JOTAI-BASED EXPORTS
// =============================================================================

export const useModifierOptionForm = () => {
  const form = useAtomValue(modifierOptionFormAtom);
  const isValid = useAtomValue(modifierOptionFormIsValidAtom);
  const isProcessing = useAtomValue(modifierOptionFormProcessingAtom);
  return { form, isValid, isProcessing };
};

export const ModifierOptionFormBody = ({ modifierType }: { modifierType: Omit<IOptionType, 'id'> }) => {
  const [form, setForm] = useAtom(modifierOptionFormAtom);
  const isProcessing = useAtomValue(modifierOptionFormProcessingAtom);
  const [availabilityIsValid, setAvailabilityIsValid] = useState(true);

  if (!form) return null;

  const updateField = <K extends keyof ModifierOptionFormState>(field: K, value: ModifierOptionFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  return (
    <ModifierOptionContainer
      modifierType={modifierType}
      isProcessing={isProcessing}
      displayName={form.displayName}
      setDisplayName={(v) => {
        updateField('displayName', v);
      }}
      description={form.description}
      setDescription={(v) => {
        updateField('description', v);
      }}
      shortcode={form.shortcode}
      setShortcode={(v) => {
        updateField('shortcode', v);
      }}
      ordinal={form.ordinal}
      setOrdinal={(v) => {
        updateField('ordinal', v);
      }}
      price={form.price}
      setPrice={(v) => {
        updateField('price', v);
      }}
      externalIds={form.externalIds}
      setExternalIds={(v) => {
        updateField('externalIds', v);
      }}
      enableFunction={form.enableFunction}
      setEnableFunction={(v) => {
        updateField('enableFunction', v);
      }}
      flavorFactor={form.flavorFactor}
      setFlavorFactor={(v) => {
        updateField('flavorFactor', v);
      }}
      bakeFactor={form.bakeFactor}
      setBakeFactor={(v) => {
        updateField('bakeFactor', v);
      }}
      canSplit={form.canSplit}
      setCanSplit={(v) => {
        updateField('canSplit', v);
      }}
      allowHeavy={form.allowHeavy}
      setAllowHeavy={(v) => {
        updateField('allowHeavy', v);
      }}
      allowLite={form.allowLite}
      setAllowLite={(v) => {
        updateField('allowLite', v);
      }}
      allowOTS={form.allowOTS}
      setAllowOTS={(v) => {
        updateField('allowOTS', v);
      }}
      omitFromShortname={form.omitFromShortname}
      setOmitFromShortname={(v) => {
        updateField('omitFromShortname', v);
      }}
      omitFromName={form.omitFromName}
      setOmitFromName={(v) => {
        updateField('omitFromName', v);
      }}
      availability={form.availability}
      setAvailability={(v) => {
        updateField('availability', v);
      }}
      disabled={form.disabled}
      setDisabled={(v) => {
        updateField('disabled', v);
      }}
      availabilityIsValid={availabilityIsValid}
      setAvailabilityIsValid={setAvailabilityIsValid}
    />
  );
};

export interface ModifierOptionFormProps {
  confirmText: string;
  onCloseCallback: VoidFunction;
  onConfirmClick: VoidFunction;
  disableConfirm?: boolean;
  modifierType: Omit<IOptionType, 'id'>;
  children?: React.ReactNode;
}

export const ModifierOptionComponent = ({
  confirmText,
  onCloseCallback,
  onConfirmClick,
  disableConfirm = false,
  children,
  modifierType,
}: ModifierOptionFormProps) => {
  const { isValid, isProcessing } = useModifierOptionForm();

  return (
    <ElementActionComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={onConfirmClick}
      isProcessing={isProcessing}
      disableConfirmOn={disableConfirm || !isValid || isProcessing}
      confirmText={confirmText}
      body={
        <>
          <ModifierOptionFormBody modifierType={modifierType} />
          {children}
        </>
      }
    />
  );
};

export default ModifierOptionComponent;
