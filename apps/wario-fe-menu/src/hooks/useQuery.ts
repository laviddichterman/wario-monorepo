import { formatISO } from 'date-fns';

import { GetNextAvailableServiceDate, WDateUtils } from '@wcp/wario-shared/logic';
import {
  useDefaultFulfillmentId,
  useFulfillmentById,
  useFulfillmentMenuCategoryId,
  useServerTime,
} from '@wcp/wario-ux-shared/query';

export function useMenuCategoryId() {
  const defaultFilfillmentId = useDefaultFulfillmentId();
  const fulfillment = useFulfillmentMenuCategoryId(defaultFilfillmentId as string);
  return fulfillment;
}

export function useDefaultFulfillmentInfo() {
  const defaultFilfillmentId = useDefaultFulfillmentId();
  const fulfillmentInfo = useFulfillmentById(defaultFilfillmentId as string);
  return fulfillmentInfo;
}

export function useNextAvailableServiceDateTime() {
  const fulfillmentInfo = useDefaultFulfillmentInfo();
  const { currentTime } = useServerTime();
  if (!fulfillmentInfo || WDateUtils.AreWeOpenNow([fulfillmentInfo], currentTime)) {
    return WDateUtils.ComputeFulfillmentTime(currentTime);
  }
  const nextAvailableServiceDate = GetNextAvailableServiceDate([fulfillmentInfo], formatISO(currentTime), 0);
  if (nextAvailableServiceDate) {
    return nextAvailableServiceDate;
  }
  console.warn('There should be a service date available, falling back to now. Likely a config or programming error.');
  return WDateUtils.ComputeFulfillmentTime(currentTime);
}

export function useCurrentTimeForDefaultFulfillment() {
  const data = useNextAvailableServiceDateTime();
  return WDateUtils.ComputeServiceDateTime(data);
}
