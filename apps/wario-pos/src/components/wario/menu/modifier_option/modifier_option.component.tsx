import { useState } from "react";

import { Autocomplete, Grid, TextField } from "@mui/material";

import { type IMoney, type IOptionType, type IRecurringInterval, type IWInterval, type KeyValue, type RecordProductInstanceFunctions } from "@wcp/wario-shared";
import { type ValSetValNamed } from "@wcp/wario-ux-shared";

import { useAppSelector } from '@/hooks/useRedux';

import AvailabilityListBuilderComponent from "@/components/wario/AvailabilityListBuilderComponent";
import DatetimeBasedDisableComponent, { IsDisableValueValid } from "@/components/wario/datetime_based_disable.component";
import { ExternalIdsExpansionPanelComponent } from "@/components/wario/ExternalIdsExpansionPanelComponent";
import { FloatNumericPropertyComponent } from "@/components/wario/property-components/FloatNumericPropertyComponent";
import { IMoneyPropertyComponent } from "@/components/wario/property-components/IMoneyPropertyComponent";
import { IntNumericPropertyComponent } from "@/components/wario/property-components/IntNumericPropertyComponent";
import { StringPropertyComponent } from "@/components/wario/property-components/StringPropertyComponent";
import { ToggleBooleanPropertyComponent } from "@/components/wario/property-components/ToggleBooleanPropertyComponent";

import { ElementActionComponent } from "../element.action.component";

type ModifierOptionContainerProps =
  ValSetValNamed<string, 'displayName'> &
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
  ValSetValNamed<IWInterval | null, 'disabled'> &
  {
    modifierType: Omit<IOptionType, 'id'>;
    isProcessing: boolean;
  }

type ModifierOptionComponentProps = ModifierOptionContainerProps &
{
  confirmText: string
  onCloseCallback: VoidFunction;
  onConfirmClick: VoidFunction;
}

export const ModifierOptionContainer = (props: ModifierOptionContainerProps & ValSetValNamed<boolean, 'availabilityIsValid'>) => {
  const productInstanceFunctions = useAppSelector(s => s.ws.catalog?.productInstanceFunctions) as RecordProductInstanceFunctions;
  const handleSetAllowOTS = (value: boolean) => {
    if (props.modifierType.max_selected !== 1) {
      props.setAllowOTS(value);
    }
  }
  const handleSetCanSplit = (value: boolean) => {
    if (props.modifierType.max_selected !== 1) {
      props.setCanSplit(value);
    }
  }
  return (
    <>
      <Grid
        size={{
          xs: 12,
          md: 6
        }}>
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
          md: 6
        }}>
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
          sm: 4
        }}>
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
          sm: 4
        }}>
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
          sm: 4
        }}>
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
          labelPlacement='end'
        />
      </Grid>
      <Grid size={4}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Allow Heavy"
          value={props.allowHeavy}
          setValue={props.setAllowHeavy}
          labelPlacement='end'
        />
      </Grid>
      <Grid size={4}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Allow Lite"
          value={props.allowLite}
          setValue={props.setAllowLite}
          labelPlacement='end'
        />
      </Grid>
      <Grid size={4}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing || props.modifierType.max_selected === 1}
          label="Allow OTS"
          value={props.modifierType.max_selected !== 1 && props.allowOTS}
          setValue={handleSetAllowOTS}
          labelPlacement='end'
        />
      </Grid>
      <Grid size={12}>
        <Autocomplete
          fullWidth
          options={Object.keys(productInstanceFunctions)}
          value={props.enableFunction}
          onChange={(e, v) => { props.setEnableFunction(v); }}
          getOptionLabel={(option) => productInstanceFunctions[option].name ?? "CORRUPT DATA"}
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
          labelPlacement='end'
        />
      </Grid>
      <Grid size={6}>
        <ToggleBooleanPropertyComponent
          disabled={props.isProcessing}
          label="Omit from name"
          value={props.omitFromName}
          setValue={props.setOmitFromName}
          labelPlacement='end'
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
}

export const ModifierOptionComponent = (props: ModifierOptionComponentProps) => {
  const [availabilityIsValid, setAvailabilityIsValid] = useState(true);
  return (
    <ElementActionComponent
      onCloseCallback={props.onCloseCallback}
      onConfirmClick={props.onConfirmClick}
      isProcessing={props.isProcessing}
      disableConfirmOn={!IsDisableValueValid(props.disabled) || props.displayName.length === 0 || props.shortcode.length === 0 ||
        props.price.amount < 0 || props.flavorFactor < 0 || props.bakeFactor < 0 || props.isProcessing || !availabilityIsValid}
      confirmText={props.confirmText}
      body={
        <ModifierOptionContainer {...props}
          availabilityIsValid={availabilityIsValid}
          setAvailabilityIsValid={setAvailabilityIsValid}
        />
      }
    />
  );
}
