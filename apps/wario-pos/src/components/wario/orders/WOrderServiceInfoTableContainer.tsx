import type { WOrderInstance } from "@wcp/wario-shared";
import { ServiceInfoTableComponent } from '@wcp/wario-ux-shared/components';
import { getFulfillmentById } from '@wcp/wario-ux-shared/redux';

import { useAppSelector } from "../../../hooks/useRedux";

export type WOrderServiceInfoTableContainerProps = {
  order: WOrderInstance;
};

export const WOrderServiceInfoTableContainer = ({ order }: WOrderServiceInfoTableContainerProps) => {
  const displayName = useAppSelector(s => getFulfillmentById(s.ws.fulfillments, order.fulfillment.selectedService).displayName);
  const minDuration = useAppSelector(s => getFulfillmentById(s.ws.fulfillments, order.fulfillment.selectedService).minDuration);
  return <ServiceInfoTableComponent customerInfo={order.customerInfo} fulfillment={order.fulfillment} fulfillmentConfig={{ displayName, minDuration }} specialInstructions={order.specialInstructions ?? ""} />

}