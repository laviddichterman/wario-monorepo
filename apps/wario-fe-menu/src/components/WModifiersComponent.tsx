import { WDateUtils, DISABLE_REASON, DisableDataCheck, MoneyToDisplayString, type IProductModifier } from "@wcp/wario-shared";
import { ProductPrice, ProductTitle, ProductDescription, getModifierOptionById, SelectCatalogSelectors, getProductInstanceById, getModifierTypeEntryById, SelectDefaultFulfillmentId, SelectParentProductEntryFromProductInstanceId } from "@wcp/wario-ux-shared";
import { createSelector } from "@reduxjs/toolkit";

import { Box, Grid } from "@mui/material";

import { type RootState, GetNextAvailableServiceDateTime, FilterUnselectableModifierOption, SelectShouldFilterModifierTypeDisplay } from "../app/store";
import { useAppSelector } from "../app/useHooks";
import { SelectProductMetadataForMenu } from "./WMenuComponent";
import { ModifierOptionTooltip } from "./ModifierOptionTooltip";


const MenuSelectOrderedModifiersVisibleForProductInstanceId = createSelector(
  (s: RootState, productInstanceId: string) => SelectProductMetadataForMenu(s, productInstanceId),
  (s: RootState, productInstanceId: string) => SelectParentProductEntryFromProductInstanceId(s.ws, productInstanceId),
  (s: RootState, _productInstanceId: string) => SelectDefaultFulfillmentId(s),
  (s: RootState, _productInstanceId: string) => (modifierTypeId: string, hasSelectable: boolean) => SelectShouldFilterModifierTypeDisplay(s, modifierTypeId, hasSelectable),
  (s: RootState, _productInstanceId: string) => (modifierTypeId: string) => getModifierTypeEntryById(s.ws.modifierEntries, modifierTypeId).modifierType.ordinal,
  (metadata, productEntry, fulfillmentId, shouldFilter, getOrdinal) => productEntry ?
    // TODO: do we need/want to check the product modifier definition enable function?
    productEntry.product.modifiers
      .filter(x => x.serviceDisable.indexOf(fulfillmentId) === -1)
      .filter(x => shouldFilter(x.mtid, metadata.modifier_map[x.mtid].has_selectable))
      .sort((a, b) => getOrdinal(a.mtid) - getOrdinal(b.mtid)) : []
);

const MenuSelectVisibleModifierOptions = createSelector(
  (s: RootState, productInstanceId: string, _mtId: string) => SelectProductMetadataForMenu(s, productInstanceId),
  (s: RootState, _productInstanceId: string, mtId: string) => getModifierTypeEntryById(s.ws.modifierEntries, mtId),
  (s: RootState, _productInstanceId: string, _mtId: string) => SelectCatalogSelectors(s.ws).option,
  (s: RootState, _productInstanceId: string, _mtId: string) => WDateUtils.ComputeServiceDateTime(GetNextAvailableServiceDateTime(s)),
  (metadata, modifierType, modifierOptionSelector, serviceDateTime) => {
    const filterUnavailable = modifierType.modifierType.displayFlags.omit_options_if_not_available;
    const mmEntry = metadata.modifier_map[modifierType.modifierType.id];
    return modifierType.options.map(o => modifierOptionSelector(o))
      .sort((a, b) => a.ordinal - b.ordinal)
      .filter((o) => DisableDataCheck(o.disabled, o.availability, serviceDateTime) && (!filterUnavailable || FilterUnselectableModifierOption(mmEntry, o.id)))
      .map(x => x.id);
  }
);

const MenuSelectMetadataModifierOptionMapEntryFromProductInstanceIdAndModifierOptionId = createSelector(
  (s: RootState, productInstanceId: string, _moId: string) => SelectProductMetadataForMenu(s, productInstanceId),
  (s: RootState, _productInstanceId: string, moId: string) => getModifierOptionById(s.ws.modifierOptions, moId),
  (metadata, modifierOption) => metadata.modifier_map[modifierOption.modifierTypeId].options[modifierOption.id]
)

function ModifierOptionComponent({ moId, productInstanceId }: { moId: string, productInstanceId: string }) {
  const product = useAppSelector(s => getProductInstanceById(s.ws.productInstances, productInstanceId));
  const modifierOption = useAppSelector(s => getModifierOptionById(s.ws.modifierOptions, moId));
  const modifierOptionMetadata = useAppSelector(s => MenuSelectMetadataModifierOptionMapEntryFromProductInstanceIdAndModifierOptionId(s, productInstanceId, moId));
  return (
    <Grid
      sx={{ pl: 3, pt: 1 }}
      size={{
        xs: 12,
        md: 6,
        lg: 4
      }}>
      <Box sx={{ position: 'relative' }}>
        <ModifierOptionTooltip enableState={modifierOptionMetadata.enable_whole} option={modifierOption} product={product} >
          <ProductDescription sx={{ textDecoration: modifierOptionMetadata.enable_whole.enable === DISABLE_REASON.ENABLED ? "none" : "line-through" }}>{modifierOption.displayName}</ProductDescription>
          <ProductPrice sx={{
            textDecoration: modifierOptionMetadata.enable_whole.enable === DISABLE_REASON.ENABLED ? "none" : "line-through", position: 'absolute', top: 0, right: 0, zIndex: 1
          }}>
            {modifierOption.price.amount !== 0 ? MoneyToDisplayString(modifierOption.price, false) : "No Charge"}
          </ProductPrice>
        </ModifierOptionTooltip>
      </Box>
    </Grid>
  );
}

function ModifierTypeComponent({ modifierDefinition, productInstanceId }: { modifierDefinition: IProductModifier; productInstanceId: string }) {
  const modifierTypeEntry = useAppSelector(s => getModifierTypeEntryById(s.ws.modifierEntries, modifierDefinition.mtid));
  const modifierOptions = useAppSelector(s => MenuSelectVisibleModifierOptions(s, productInstanceId, modifierDefinition.mtid));
  return (
    <Grid container sx={{ py: 2 }}>
      <Grid sx={{ pb: 1 }} size={12}>
        <ProductTitle>
          {modifierTypeEntry.modifierType.displayName ? modifierTypeEntry.modifierType.displayName : modifierTypeEntry.modifierType.name}
        </ProductTitle>
      </Grid>
      {modifierOptions.map((optId, j) => {
        return (<ModifierOptionComponent key={j} moId={optId} productInstanceId={productInstanceId} />)
      })}
    </Grid>
  );
}

export function WModifiersComponent({ productInstanceId }: { productInstanceId: string }) {
  const modifiers = useAppSelector(s => MenuSelectOrderedModifiersVisibleForProductInstanceId(s, productInstanceId));
  return (
    <>
      {modifiers.map((mod_def, i) => {
        return <ModifierTypeComponent key={i} modifierDefinition={mod_def} productInstanceId={productInstanceId} />
      })}
    </>
  )
};

