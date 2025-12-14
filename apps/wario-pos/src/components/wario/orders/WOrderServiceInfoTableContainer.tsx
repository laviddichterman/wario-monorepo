import type { WOrderInstance } from '@wcp/wario-shared/types';
import { ServiceInfoTableComponent } from '@wcp/wario-ux-shared/components';
import { useFulfillmentDisplayName, useFulfillmentMinDuration } from '@wcp/wario-ux-shared/query';

export type WOrderServiceInfoTableContainerProps = {
  order: WOrderInstance;
};

export const WOrderServiceInfoTableContainer = ({ order }: WOrderServiceInfoTableContainerProps) => {
  const displayName = useFulfillmentDisplayName(order.fulfillment.selectedService);
  const minDuration = useFulfillmentMinDuration(order.fulfillment.selectedService) || 0;
  return (
    displayName && (
      <ServiceInfoTableComponent
        customerInfo={order.customerInfo}
        fulfillment={order.fulfillment}
        fulfillmentConfig={{ displayName, minDuration }}
        specialInstructions={order.specialInstructions ?? ''}
      />
    )
  );
};
