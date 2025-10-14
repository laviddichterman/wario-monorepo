import { useAppSelector } from '../app/useHooks';
import { OptionEnableState, IOption, WCPProduct } from '@wcp/wcpshared';
import { SelectCatalogSelectors, getFulfillments } from '@wcp/wario-ux-shared';
import { ModifierOptionTooltipComponent } from '@wcp/wario-fe-ux-shared';

interface ModifierOptionTooltipProps {
  enableState: OptionEnableState;
  option: IOption;
  // passing the product in allows us to use this for the general case, not just the customizer
  product: WCPProduct;
  children: React.ReactNode;
}

export function ModifierOptionTooltip(props: ModifierOptionTooltipProps) {
  const fulfillments = useAppSelector(s => getFulfillments(s.ws.fulfillments));
  const catalogSelectors = useAppSelector(s=>SelectCatalogSelectors(s.ws));
  return <ModifierOptionTooltipComponent {...props} fulfillments={fulfillments} catalogSelectors={catalogSelectors} />;
};