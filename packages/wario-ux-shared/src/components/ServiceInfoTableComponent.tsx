import { format } from 'date-fns';
import { useMemo } from 'react';

import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';

import { ComputeServiceTimeDisplayString, WDateUtils } from '@wcp/wario-shared/logic';
import type { CustomerInfoData, FulfillmentConfig, FulfillmentData } from '@wcp/wario-shared/types';

export interface ServiceInfoTableComponentProps {
  customerInfo: CustomerInfoData;
  fulfillmentConfig: Pick<FulfillmentConfig, 'minDuration' | 'displayName'>;
  fulfillment: Omit<FulfillmentData, 'status'>;
  specialInstructions: string;
}

export const ServiceInfoTableComponent = ({
  fulfillment,
  customerInfo,
  specialInstructions,
  fulfillmentConfig,
}: ServiceInfoTableComponentProps) => {
  const serviceDateTime = useMemo(() => WDateUtils.ComputeServiceDateTime(fulfillment), [fulfillment]);
  return (
    <TableContainer component={Paper} sx={{ pb: 3 }}>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>
              {customerInfo.givenName} {customerInfo.familyName}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Mobile Number</TableCell>
            <TableCell>{customerInfo.mobileNum}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>E-Mail</TableCell>
            <TableCell>{customerInfo.email}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Service</TableCell>
            <TableCell>
              {fulfillmentConfig.displayName} on {format(serviceDateTime, WDateUtils.ServiceDateDisplayFormat)} at{' '}
              {ComputeServiceTimeDisplayString(fulfillmentConfig.minDuration, fulfillment.selectedTime)}
            </TableCell>
          </TableRow>
          {fulfillment.dineInInfo && (
            <TableRow>
              <TableCell>Party Size</TableCell>
              <TableCell>{fulfillment.dineInInfo.partySize}</TableCell>
            </TableRow>
          )}
          {fulfillment.deliveryInfo && (
            <TableRow>
              <TableCell>Delivery Address</TableCell>
              <TableCell>
                {fulfillment.deliveryInfo.address}
                {fulfillment.deliveryInfo.address2 && ` ${fulfillment.deliveryInfo.address2}`}
                {`, ${fulfillment.deliveryInfo.zipcode}`}
              </TableCell>
            </TableRow>
          )}
          {specialInstructions && (
            <TableRow>
              <TableCell>Special Instructions</TableCell>
              <TableCell>{specialInstructions}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
