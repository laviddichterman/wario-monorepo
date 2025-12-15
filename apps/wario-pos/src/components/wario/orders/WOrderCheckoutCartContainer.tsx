import { useMemo } from 'react';

import { ComputeCartSubTotal, ComputeTaxAmount, ComputeTipBasis, ComputeTipValue } from '@wcp/wario-shared/logic';
import { type WOrderInstance } from '@wcp/wario-shared/types';
import { WCheckoutCartComponent } from '@wcp/wario-ux-shared/components';
import { useCatalogSelectors, useTaxRate } from '@wcp/wario-ux-shared/query';

import { useGroupedAndSortedCart } from '@/hooks/useOrdersQuery';

export type WOrderCheckoutCartContainerProps = {
  order: WOrderInstance;
  hideProductDescriptions: boolean;
};

export const WOrderCheckoutCartContainer = (props: WOrderCheckoutCartContainerProps) => {
  const TAX_RATE = useTaxRate() as number;
  const catalogSelectors = useCatalogSelectors();
  const fullGroupedCart = useGroupedAndSortedCart(props.order);
  const cartSubtotal = useMemo(() => ComputeCartSubTotal(fullGroupedCart.map((x) => x[1]).flat()), [fullGroupedCart]);
  const taxBasis = useMemo(
    () => ({
      currency: cartSubtotal.currency,
      amount: cartSubtotal.amount - props.order.discounts.reduce((acc, x) => acc + x.discount.amount.amount, 0),
    }),
    [props.order, cartSubtotal],
  );
  const taxAmount = useMemo(() => ComputeTaxAmount(taxBasis, TAX_RATE), [taxBasis, TAX_RATE]);
  const tipBasis = useMemo(() => ComputeTipBasis(cartSubtotal, taxAmount), [cartSubtotal, taxAmount]);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const tipAmount = useMemo(() => ComputeTipValue(props.order.tip ?? null, tipBasis), [props.order.tip, tipBasis]);

  return (
    catalogSelectors && (
      <WCheckoutCartComponent
        cart={fullGroupedCart}
        catalogSelectors={catalogSelectors}
        hideProductDescriptions={props.hideProductDescriptions}
        discounts={props.order.discounts}
        payments={props.order.payments}
        selectedService={props.order.fulfillment.selectedService}
        taxRate={TAX_RATE}
        taxValue={taxAmount}
        tipValue={tipAmount}
      />
    )
  );
};
