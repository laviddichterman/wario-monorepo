import React, { type ReactNode } from 'react';
import { ErrorResponseOutput, OkResponseOutput, WarningResponseOutput, getProductInstanceFunctionById, getModifierTypeEntryById, getModifierOptionById, getProductEntryById } from '@wcp/wario-ux-shared';
import { WFunctional, type ICatalogModifierSelectors, type ProductModifierEntry, type MetadataModifierMap } from '@wcp/wario-shared';
import {
  type RootState,
  SelectModifierTypeNameFromModifierTypeId,
} from '../app/store';
import { useAppSelector } from '../app/useHooks';

import { createSelector } from '@reduxjs/toolkit';

const SelectCatalogModifierSelectors = createSelector(
  (s: RootState) => (oid: string) => getModifierOptionById(s.ws.modifierOptions, oid),
  (s: RootState) => (mtid: string) => getModifierTypeEntryById(s.ws.modifierEntries, mtid),
  (moselector, mtselector) => { return { modifierEntry: mtselector, option: moselector } satisfies ICatalogModifierSelectors; }
)
const SelectProcessProductInstanceFunction = createSelector(
  (s: RootState, _productModifierEntries: ProductModifierEntry[], pifId: string) => SelectCatalogModifierSelectors(s),
  (_s: RootState, productModifierEntries: ProductModifierEntry[], _pifId: string) => productModifierEntries,
  (s: RootState, _productModifierEntries: ProductModifierEntry[], pifId: string) => getProductInstanceFunctionById(s.ws.productInstanceFunctions, pifId),
  (catModSelectors, productModifierEntries, productInstanceFunction) => {
    if (productInstanceFunction) {
      const result = WFunctional.ProcessProductInstanceFunction(productModifierEntries, productInstanceFunction, catModSelectors);
      if (result) {
        return result as string
      }
    }
    return null;
  }
)

const OrderGuideMessage = ({ pifId, productModifierEntries, innerComponent }: { pifId: string, productModifierEntries: ProductModifierEntry[], innerComponent: (message: string) => ReactNode }) => {
  const processedFunctionResult = useAppSelector(s => SelectProcessProductInstanceFunction(s, productModifierEntries, pifId));
  return <>{processedFunctionResult !== null ? innerComponent(processedFunctionResult) : ''}</> satisfies ReactNode;
}

export const OrderGuideMessagesComponent = ({ productId, productModifierEntries }: { productId: string; productModifierEntries: ProductModifierEntry[]; }) => {
  const orderGuideWarningFunctions = useAppSelector(s => getProductEntryById(s.ws.products, productId).product.displayFlags.order_guide.suggestions);
  return (<>
    {orderGuideWarningFunctions.map((pifId, i) =>
      <OrderGuideMessage
        key={`${i}guide`}
        pifId={pifId}
        productModifierEntries={productModifierEntries}
        innerComponent={(msg => <OkResponseOutput>{msg}</OkResponseOutput>)}
      />)}
  </>);
}
export const OrderGuideWarningsComponent = ({ productId, productModifierEntries }: { productId: string; productModifierEntries: ProductModifierEntry[]; }) => {
  const orderGuideSuggestionFunctions = useAppSelector(s => getProductEntryById(s.ws.products, productId).product.displayFlags.order_guide.warnings);
  return (<>
    {orderGuideSuggestionFunctions.map((pifId, i) =>
      <OrderGuideMessage
        key={`${i}warnguide`}
        pifId={pifId}
        productModifierEntries={productModifierEntries}
        innerComponent={(msg => <WarningResponseOutput>{msg}</WarningResponseOutput>)}
      />)}
  </>);
}

const OrderGuideError = ({ mtId }: { mtId: string }) => {
  const modifierTypeName = useAppSelector(s => SelectModifierTypeNameFromModifierTypeId(s.ws.modifierEntries, mtId));
  return <ErrorResponseOutput>{`Please select your choice of ${String(modifierTypeName).toLowerCase()}`}</ErrorResponseOutput>
}

export const OrderGuideErrorsComponent = ({ modifierMap }: { modifierMap: MetadataModifierMap; }) => {
  return (<>
    {Object.entries(modifierMap).filter(([_, v]) => !v.meets_minimum).map(([mtId, _v], i) =>
      <OrderGuideError
        key={`${i}err`}
        mtId={mtId}
      />)}
  </>);
}
