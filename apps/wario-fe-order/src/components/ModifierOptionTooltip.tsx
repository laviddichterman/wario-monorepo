import { ModifierOptionTooltip as ModifierOptionTooltipBase } from '@wcp/wario-fe-ux-shared';
import { type IOption, type OptionEnableState, type WCPProduct } from '@wcp/wario-shared';
import { getFulfillments, SelectCatalogSelectors } from '@wcp/wario-ux-shared';

import { useAppSelector } from '@/app/useHooks';

interface ModifierOptionTooltipProps {
  enableState: OptionEnableState;
  option: IOption;
  // passing the product in allows us to use this for the general case, not just the customizer
  product: WCPProduct;
  children: React.ReactNode;
}

export function ModifierOptionTooltip(props: ModifierOptionTooltipProps) {
  const fulfillments = useAppSelector(s => getFulfillments(s.ws.fulfillments));
  const catalogSelectors = useAppSelector(s => SelectCatalogSelectors(s.ws));
  return <ModifierOptionTooltipBase {...props} fulfillments={fulfillments} catalogSelectors={catalogSelectors} />;
}
