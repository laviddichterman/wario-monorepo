import React, { useState } from 'react';

import {
  Autocomplete,
  Grid,
  TextField,
} from '@mui/material';

import type { IMoney, IProductModifier, IRecurringInterval, IWInterval, KeyValue, PrepTiming } from '@wcp/wario-shared';
import { ReduceArrayToMapByKey } from '@wcp/wario-shared';
import { getFulfillments } from '@wcp/wario-ux-shared';
import type { ValSetValNamed } from "@wcp/wario-ux-shared";

import { useAppSelector } from '@/hooks/useRedux';

import AvailabilityListBuilderComponent from '@/components/wario/AvailabilityListBuilderComponent';
import DatetimeBasedDisableComponent, { IsDisableValueValid } from '@/components/wario/datetime_based_disable.component';
import { ExternalIdsExpansionPanelComponent } from '@/components/wario/ExternalIdsExpansionPanelComponent';
import PrepTimingPropertyComponent from '@/components/wario/PrepTimingPropertyComponent';
import { FloatNumericPropertyComponent } from '@/components/wario/property-components/FloatNumericPropertyComponent';
import { IMoneyPropertyComponent } from '@/components/wario/property-components/IMoneyPropertyComponent';
import { StringPropertyComponent } from '@/components/wario/property-components/StringPropertyComponent';
import { ToggleBooleanPropertyComponent } from '@/components/wario/property-components/ToggleBooleanPropertyComponent';

import { getPrinterGroups } from '@/redux/slices/PrinterGroupSlice';

import { ElementActionComponent } from '../element.action.component';

import ProductModifierComponent from "./ProductModifierComponent";


type ProductComponentPropsModeSpecific = (ValSetValNamed<string, 'baseProductId'> & { isEdit: true }) | ({ isEdit: false });
type ProductComponentFieldsNoBaseId =
  ValSetValNamed<IMoney, 'price'> &
  ValSetValNamed<KeyValue[], 'externalIds'> &
  ValSetValNamed<IWInterval | null, 'disabled'> &
  ValSetValNamed<IRecurringInterval[], 'availability'> &
  ValSetValNamed<PrepTiming | null, 'timing'> &
  ValSetValNamed<string[], 'serviceDisable'> &
  ValSetValNamed<number, 'flavorMax'> &
  ValSetValNamed<number, 'bakeMax'> &
  ValSetValNamed<number, 'bakeDifferentialMax'> &
  ValSetValNamed<boolean, 'is3p'> &
  ValSetValNamed<string[], 'orderGuideWarningFunctions'> &
  ValSetValNamed<string[], 'orderGuideSuggestionFunctions'> &
  ValSetValNamed<boolean, 'showNameOfBaseProduct'> &
  ValSetValNamed<string, 'singularNoun'> &
  ValSetValNamed<string[], 'parentCategories'> &
  ValSetValNamed<string | null, 'printerGroup'> &
  ValSetValNamed<IProductModifier[], 'modifiers'>;

interface ProductComponentProps {
  confirmText: string;
  onCloseCallback: VoidFunction;
  onConfirmClick: VoidFunction;
  isProcessing: boolean;
  disableConfirmOn: boolean;
  children?: React.ReactNode;
};

export const ProductComponent = (props: ProductComponentPropsModeSpecific & ProductComponentFieldsNoBaseId & ProductComponentProps) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const catalog = useAppSelector(s => s.ws.catalog!);
  const printerGroups = useAppSelector(s => ReduceArrayToMapByKey(getPrinterGroups(s.printerGroup.printerGroups), 'id'));
  const fulfillments = useAppSelector(s => getFulfillments(s.ws.fulfillments));
  const [availabilityIsValid, setAvailabilityIsValid] = useState(true);

  const handleSetModifiers = (mods: IProductModifier[]) => {
    if (mods.length === 0 && !props.showNameOfBaseProduct) {
      props.setShowNameOfBaseProduct(true);
    }
    props.setModifiers(mods);
  };

  return (
    <ElementActionComponent
      onCloseCallback={props.onCloseCallback}
      onConfirmClick={props.onConfirmClick}
      isProcessing={props.isProcessing}
      disableConfirmOn={props.disableConfirmOn || !IsDisableValueValid(props.disabled) || !availabilityIsValid}
      confirmText={props.confirmText}
      body={
        <>
          <Grid size={12}>
            <Autocomplete
              multiple
              filterSelectedOptions
              options={Object.keys(catalog.categories)}
              value={props.parentCategories}
              onChange={(e, v) => { props.setParentCategories(v); }}
              getOptionLabel={(option) => catalog.categories[option].category.name}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => <TextField {...params} label="Categories" />}
            />
          </Grid>
          <Grid size={12}>
            <Autocomplete
              filterSelectedOptions
              options={Object.keys(printerGroups)}
              value={props.printerGroup}
              onChange={(e, v) => { props.setPrinterGroup(v); }}
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              getOptionLabel={(pgId) => printerGroups[pgId]?.name ?? "Undefined"}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => <TextField {...params} label="Printer Group" />}
            />
          </Grid>
          {/* universal break */}
          <Grid size={6}>
            <IMoneyPropertyComponent
              disabled={props.isProcessing}
              label="Price"
              value={props.price}
              setValue={props.setPrice}
            />
          </Grid>
          <Grid size={6}>
            <StringPropertyComponent
              disabled={props.isProcessing}
              label="Singular Noun"
              value={props.singularNoun}
              setValue={props.setSingularNoun}
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
          {/* universal break */}
          <Grid size={4}>
            <FloatNumericPropertyComponent
              disabled={props.isProcessing}
              label="Flavor Max"
              value={props.flavorMax}
              setValue={props.setFlavorMax}
            />
          </Grid>
          <Grid size={4}>
            <FloatNumericPropertyComponent
              disabled={props.isProcessing}
              label="Bake Max"
              value={props.bakeMax}
              setValue={props.setBakeMax}
            />
          </Grid>
          <Grid size={4}>
            <FloatNumericPropertyComponent
              disabled={props.isProcessing}
              label="Bake Differential Max"
              value={props.bakeDifferentialMax}
              setValue={props.setBakeDifferentialMax}
            />
          </Grid>
          {/* universal break */}
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <Autocomplete
              multiple
              filterSelectedOptions
              fullWidth
              options={Object.keys(catalog.productInstanceFunctions)}
              value={props.orderGuideSuggestionFunctions}
              onChange={(_, v) => { props.setOrderGuideSuggestionFunctions(v); }}
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              getOptionLabel={(option) => catalog.productInstanceFunctions[option].name ?? 'CORRUPT DATA'}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => <TextField {...params} label="Order Guide Suggestion Functions" />}
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <Autocomplete
              multiple
              filterSelectedOptions
              fullWidth
              options={Object.keys(catalog.productInstanceFunctions)}
              value={props.orderGuideWarningFunctions}
              onChange={(_, v) => { props.setOrderGuideWarningFunctions(v); }}
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              getOptionLabel={(option) => catalog.productInstanceFunctions[option].name ?? 'CORRUPT DATA'}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => <TextField {...params} label="Order Guide Warning Functions" />}
            />
          </Grid>
          <Grid size={12}>
            <Autocomplete
              multiple
              filterSelectedOptions
              options={fulfillments.map(x => x.id)}
              value={props.serviceDisable}
              onChange={(_, v) => {
                props.setServiceDisable(v);
              }}
              getOptionLabel={(option) => fulfillments.find((v) => v.id === option)?.displayName ?? "INVALID"}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => <TextField {...params} label="Disabled Services" />}
            />
          </Grid>
          <Grid size={3}>
            <ToggleBooleanPropertyComponent
              disabled={props.isProcessing}
              label="Is 3rd Party"
              setValue={props.setIs3p}
              value={props.is3p}
              labelPlacement="end"
            />
          </Grid>
          <Grid size={9}>
            <ToggleBooleanPropertyComponent
              disabled={props.isProcessing || props.modifiers.length === 0}
              label="Show Name of Base Product Instead of Component Modifiers"
              value={props.showNameOfBaseProduct || props.modifiers.length === 0}
              setValue={props.setShowNameOfBaseProduct}
              labelPlacement='end'
            />
          </Grid>

          <Grid size={12}>
            <ProductModifierComponent isProcessing={props.isProcessing} modifiers={props.modifiers} setModifiers={handleSetModifiers} />
          </Grid>
          <Grid size={12}>
            <AvailabilityListBuilderComponent
              availabilityIsValid={availabilityIsValid}
              setAvailabilityIsValid={setAvailabilityIsValid}
              disabled={props.isProcessing}
              value={props.availability}
              setValue={props.setAvailability}
            />
          </Grid>
          <Grid size={12}>
            <PrepTimingPropertyComponent
              disabled={props.isProcessing}
              value={props.timing}
              setValue={props.setTiming}
            />
          </Grid>
          <Grid size={12}>
            <DatetimeBasedDisableComponent
              disabled={props.isProcessing}
              value={props.disabled}
              setValue={props.setDisabled}
            />
          </Grid>
          {props.children}
        </>
      }
    />
  );
};
