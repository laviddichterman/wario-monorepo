import { type ICatalogSelectors } from '@wcp/wario-shared';
import { WCheckoutCartComponent } from '@wcp/wario-ux-shared/components';
import { useCatalogSelectors, useTaxRate } from '@wcp/wario-ux-shared/query';

import { useGroupedAndOrderedCart } from '@/hooks/useDerivedState';

import { SelectDiscountsApplied, SelectPaymentsApplied, SelectTaxAmount, SelectTipValue, SelectTotal } from '@/app/selectors';
import { useAppSelector } from '@/app/useHooks';

export function WCheckoutCart() {
  //const ungroupedCart = useAppSelector(s=>getCart(s.cart.cart));
  const cart = useGroupedAndOrderedCart();
  const submitToWarioResponse = useAppSelector(s => s.payment.warioResponse);
  const TAX_RATE = useTaxRate() as number;
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors;
  const tipValue = useAppSelector(SelectTipValue);
  const taxValue = useAppSelector(SelectTaxAmount);
  const paymentsApplied = useAppSelector(SelectPaymentsApplied);
  const discountsApplied = useAppSelector(SelectDiscountsApplied);
  const total = useAppSelector(SelectTotal);

  const selectedService = useAppSelector(s => s.fulfillment.selectedService);
  if (selectedService === null) {
    return null;
  }
  return <WCheckoutCartComponent
    cart={cart}
    catalogSelectors={catalogSelectors}
    discounts={submitToWarioResponse && submitToWarioResponse.success ? submitToWarioResponse.result.discounts : discountsApplied}
    payments={submitToWarioResponse && submitToWarioResponse.success ? submitToWarioResponse.result.payments : paymentsApplied}
    selectedService={selectedService}
    taxRate={TAX_RATE}
    taxValue={taxValue}
    tipValue={tipValue}
    total={total}
  />
}