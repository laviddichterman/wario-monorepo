import { type ICatalogSelectors } from '@wcp/wario-shared/types';
import { WCheckoutCartComponent } from '@wcp/wario-ux-shared/components';
import { useCatalogSelectors, useTaxRate } from '@wcp/wario-ux-shared/query';

import { useGroupedAndOrderedCart } from '@/hooks/useDerivedState';
import {
  useDiscountsApplied,
  useOrderTotal,
  usePaymentsApplied,
  useTaxAmount,
  useTipValue,
} from '@/hooks/useOrderTotals';
import { useSubmitOrderMutation } from '@/hooks/useSubmitOrderMutation';

import { selectSelectedService, useFulfillmentStore } from '@/stores/useFulfillmentStore';

export function WCheckoutCart() {
  const cart = useGroupedAndOrderedCart();
  const submitToWarioMutation = useSubmitOrderMutation();
  const TAX_RATE = useTaxRate() as number;
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors;
  const tipValue = useTipValue();
  const taxValue = useTaxAmount();
  const paymentsApplied = usePaymentsApplied();
  const discountsApplied = useDiscountsApplied();
  const total = useOrderTotal();

  const selectedService = useFulfillmentStore(selectSelectedService);
  if (selectedService === null) {
    return null;
  }
  return (
    <WCheckoutCartComponent
      cart={cart}
      catalogSelectors={catalogSelectors}
      discounts={submitToWarioMutation.isSuccess ? submitToWarioMutation.data.result.discounts : discountsApplied}
      payments={submitToWarioMutation.isSuccess ? submitToWarioMutation.data.result.payments : paymentsApplied}
      selectedService={selectedService}
      taxRate={TAX_RATE}
      taxValue={taxValue}
      tipValue={tipValue}
      total={total}
    />
  );
}
