import { type ReactNode, useMemo } from 'react';

import {
  type ICatalogModifierSelectors,
  type MetadataModifierMap,
  type ProductInstanceModifierEntry,
  WFunctional,
} from '@wcp/wario-shared';
import {
  useCatalogSelectors,
  useModifierTypeNameById,
  useProductById,
  useProductInstanceFunctionById,
} from '@wcp/wario-ux-shared/query';
import { ErrorResponseOutput, OkResponseOutput, WarningResponseOutput } from '@wcp/wario-ux-shared/styled';

const useProcessProductInstanceFunction = (productModifierEntries: ProductInstanceModifierEntry[], pifId: string) => {
  const productInstanceFunction = useProductInstanceFunctionById(pifId);
  const { modifierEntry, option } = useCatalogSelectors() as ICatalogModifierSelectors;
  return useMemo(
    () =>
      productInstanceFunction
        ? (WFunctional.ProcessProductInstanceFunction(productModifierEntries, productInstanceFunction, {
            modifierEntry,
            option,
          }) as string)
        : null,
    [productInstanceFunction, productModifierEntries, modifierEntry, option],
  );
};

const OrderGuideMessage = ({
  pifId,
  productModifierEntries,
  innerComponent,
}: {
  pifId: string;
  productModifierEntries: ProductInstanceModifierEntry[];
  innerComponent: (message: string) => ReactNode;
}) => {
  const processedFunctionResult = useProcessProductInstanceFunction(productModifierEntries, pifId);
  return (<>{processedFunctionResult !== null ? innerComponent(processedFunctionResult) : ''}</>) satisfies ReactNode;
};

export const OrderGuideMessagesComponent = ({
  productId,
  productModifierEntries,
}: {
  productId: string;
  productModifierEntries: ProductInstanceModifierEntry[];
}) => {
  const productEntry = useProductById(productId);
  const orderGuideWarningFunctions = productEntry?.displayFlags.order_guide.suggestions ?? [];
  return (
    <>
      {orderGuideWarningFunctions.map((pifId, i) => (
        <OrderGuideMessage
          key={`${i.toString()}guide`}
          pifId={pifId}
          productModifierEntries={productModifierEntries}
          innerComponent={(msg) => <OkResponseOutput>{msg}</OkResponseOutput>}
        />
      ))}
    </>
  );
};
export const OrderGuideWarningsComponent = ({
  productId,
  productModifierEntries,
}: {
  productId: string;
  productModifierEntries: ProductInstanceModifierEntry[];
}) => {
  const productEntry = useProductById(productId);
  const orderGuideSuggestionFunctions = productEntry?.displayFlags.order_guide.warnings ?? [];
  return (
    <>
      {orderGuideSuggestionFunctions.map((pifId, i) => (
        <OrderGuideMessage
          key={`${i.toString()}warnguide`}
          pifId={pifId}
          productModifierEntries={productModifierEntries}
          innerComponent={(msg) => <WarningResponseOutput>{msg}</WarningResponseOutput>}
        />
      ))}
    </>
  );
};

const OrderGuideError = ({ mtId }: { mtId: string }) => {
  const modifierTypeName = useModifierTypeNameById(mtId);
  return <ErrorResponseOutput>{`Please select your choice of ${modifierTypeName.toLowerCase()}`}</ErrorResponseOutput>;
};

export const OrderGuideErrorsComponent = ({ modifierMap }: { modifierMap: MetadataModifierMap }) => {
  return (
    <>
      {Object.entries(modifierMap)
        .filter(([_, v]) => !v.meets_minimum)
        .map(([mtId, _v], i) => (
          <OrderGuideError key={`${i.toString()}err`} mtId={mtId} />
        ))}
    </>
  );
};
