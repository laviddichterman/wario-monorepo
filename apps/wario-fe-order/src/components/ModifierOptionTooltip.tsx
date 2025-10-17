import { useAppSelector } from '../app/useHooks';
import { useMemo } from 'react';
import { type OptionEnableState, DISABLE_REASON, WFunctional, type IOption, type WCPProduct } from '@wcp/wario-shared';
import { Tooltip } from '@mui/material';
import { SelectCatalogSelectors, getFulfillments } from '@wcp/wario-ux-shared';

interface ModifierOptionTooltipProps {
  enableState: OptionEnableState;
  option: IOption;
  // passing the product in allows us to use this for the general case, not just the customizer
  product: WCPProduct;
  children: React.ReactNode;
}

export function ModifierOptionTooltip({ enableState, option, product, children }: ModifierOptionTooltipProps) {
  const fulfillments = useAppSelector(s => getFulfillments(s.ws.fulfillments));
  const catalogSelectors = useAppSelector(s => SelectCatalogSelectors(s.ws));

  const tooltipText = useMemo(() => {
    const displayName = option.displayName;
    switch (enableState.enable) {
      case DISABLE_REASON.ENABLED:
        return displayName;
      case DISABLE_REASON.DISABLED_TIME:
        return `We're out of ${displayName} at the moment.`;
      case DISABLE_REASON.DISABLED_BLANKET:
        return `${displayName} is disabled until further notice.`;
      case DISABLE_REASON.DISABLED_FLAVORS:
        return `Adding ${displayName} would exceed maximum flavor count.`;
      case DISABLE_REASON.DISABLED_WEIGHT:
        return `Adding ${displayName} would exceed maximum weight.`;
      case DISABLE_REASON.DISABLED_FULFILLMENT_TYPE:
        return `${displayName} is disabled for ${fulfillments.find(x => x.id === enableState.fulfillment)!.displayName}.`;
      case DISABLE_REASON.DISABLED_NO_SPLITTING:
        return `${displayName} is disabled as a split modifier.`;
      case DISABLE_REASON.DISABLED_SPLIT_DIFFERENTIAL:
        return `Adding ${displayName} would throw off balance.`;
      case DISABLE_REASON.DISABLED_MAXIMUM:
        return `Adding ${displayName} would exceed the maximum modifiers allowed of this type.`;
      case DISABLE_REASON.DISABLED_FUNCTION:
        const PIF = catalogSelectors.productInstanceFunction(enableState.functionId);
        if (PIF) {
          const trackedFailure = WFunctional.ProcessAbstractExpressionStatementWithTracking(product.modifiers, PIF.expression, catalogSelectors);
          return `${displayName} requires ${WFunctional.AbstractExpressionStatementToHumanReadableString(trackedFailure[1][0], catalogSelectors)}`;
        }
        return `${displayName} is not available with the current combination of options.`;
    }
    //return displayName;
  }, [enableState, option, fulfillments, catalogSelectors, product.modifiers]);
  return enableState.enable === DISABLE_REASON.ENABLED ?
    <span>{children}</span> :
    <Tooltip arrow title={tooltipText}>
      <span>{children}</span>
    </Tooltip>;
};
