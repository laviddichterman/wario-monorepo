import { ModifierOptionTooltip as ModifierOptionTooltipBase } from '@wcp/wario-fe-ux-shared';
import { type ICatalogSelectors, type IOption, type OptionEnableState, type WCPProduct } from '@wcp/wario-shared';
import { useCatalogSelectors, useFulfillments } from '@wcp/wario-ux-shared/query';
interface ModifierOptionTooltipProps {
  enableState: OptionEnableState;
  option: IOption;
  // passing the product in allows us to use this for the general case, not just the customizer
  product: WCPProduct;
  children: React.ReactNode;
}

export function ModifierOptionTooltip(props: ModifierOptionTooltipProps) {
  const fulfillments = useFulfillments();
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors;
  return <ModifierOptionTooltipBase {...props} fulfillments={fulfillments} catalogSelectors={catalogSelectors} />;
}
