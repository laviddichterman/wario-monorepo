import { useAppSelector } from '../app/useHooks';
import { SelectCatalogSelectors, WCheckoutCartComponent, selectGroupedAndOrderedCart, SelectTaxRate } from '@wcp/wario-ux-shared';
import { SelectDiscountsApplied, SelectPaymentsApplied, SelectTaxAmount, SelectTipValue, SelectTotal } from '../app/store';
import { getCart } from '../app/slices/WCartSlice';

export function WCheckoutCart() {
  //const ungroupedCart = useAppSelector(s=>getCart(s.cart.cart));
  const cart = useAppSelector(s => selectGroupedAndOrderedCart(s, getCart(s.cart.cart)));
  const submitToWarioResponse = useAppSelector(s => s.payment.warioResponse);
  const TAX_RATE = useAppSelector(SelectTaxRate);
  const catalogSelectors = useAppSelector(s => SelectCatalogSelectors(s.ws));
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