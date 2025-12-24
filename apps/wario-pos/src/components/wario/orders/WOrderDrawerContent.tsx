import { format } from 'date-fns';
import { useState } from 'react';

import { ExpandMore as ExpandMoreIcon, InfoOutlined } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';

import {
  ComputeServiceTimeDisplayString,
  DateTimeIntervalBuilder,
  WDateUtils,
  WOrderStatus,
} from '@wcp/wario-shared/logic';
import { useFulfillmentById } from '@wcp/wario-ux-shared/query';

import { useOrderById } from '@/hooks/useOrdersQuery';
import { usePrinterGroupsQuery } from '@/hooks/usePrinterGroupsQuery';

import { WOrderModifyComponent } from '@/components/wario/orders/WOrderModifyComponent';
import WOrderMoveComponent from '@/components/wario/orders/WOrderMoveComponent';
import WOrderRescheduleComponent from '@/components/wario/orders/WOrderRescheduleComponent';

import CancelOrderDialog from './CancelOrderDialog';
import ForceSendOrderDialog from './ForceSendOrderDialog';
import OrderActionsBar from './OrderActionsBar';
import { TableAssignmentStatus } from './TableAssignmentStatus';
import { WOrderCheckoutCartContainer } from './WOrderCheckoutCartContainer';
import { WOrderServiceInfoTableContainer } from './WOrderServiceInfoTableContainer';

export type WOrderDrawerContentProps = {
  orderId: string;
  onClose: (() => void) | null;
};

type ActiveAction = 'none' | 'reschedule' | 'move' | 'modify';

/**
 * Main drawer content for order management.
 * Replaces the old WOrderComponentCard with a drawer-optimized layout.
 */
export function WOrderDrawerContent({ orderId, onClose: _onClose }: WOrderDrawerContentProps) {
  const order = useOrderById(orderId);
  const fulfillmentConfig = useFulfillmentById(order?.fulfillment.selectedService ?? '');
  const { data: printerGroups = [] } = usePrinterGroupsQuery();

  const [activeAction, setActiveAction] = useState<ActiveAction>('none');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [forceSendDialogOpen, setForceSendDialogOpen] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [customerInfoExpanded, setCustomerInfoExpanded] = useState(false);

  if (!order) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading order...</Typography>
      </Box>
    );
  }

  const hasExpoPrinter = printerGroups.some((x) => x.isExpo);
  const orderStatus = order.status;

  // Compute service summary line
  const serviceSummary = (() => {
    if (!fulfillmentConfig) return '';
    const interval = DateTimeIntervalBuilder(order.fulfillment, fulfillmentConfig.maxDuration);
    const dateStr = format(interval.start, WDateUtils.ServiceDateDisplayFormat);
    const timeStr = ComputeServiceTimeDisplayString(fulfillmentConfig.minDuration, order.fulfillment.selectedTime);
    return `${fulfillmentConfig.displayName} • ${dateStr} • ${timeStr}`;
  })();

  const statusColor = (() => {
    switch (orderStatus) {
      case WOrderStatus.OPEN:
        return 'warning';
      case WOrderStatus.CONFIRMED:
        return 'info';
      case WOrderStatus.PROCESSING:
        return 'success';
      case WOrderStatus.COMPLETED:
        return 'default';
      case WOrderStatus.CANCELED:
        return 'error';
      default:
        return 'default';
    }
  })();

  const handleBackToMain = () => {
    setActiveAction('none');
    setShowRawData(false);
  };

  // Render inline action form if one is active
  if (activeAction === 'reschedule') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Reschedule Order</Typography>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <WOrderRescheduleComponent orderId={orderId} onCloseCallback={handleBackToMain} />
        </Box>
      </Box>
    );
  }

  if (activeAction === 'modify') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Modify Order</Typography>
        </Box>
        <WOrderModifyComponent orderId={orderId} onCloseCallback={handleBackToMain} />
      </Box>
    );
  }

  if (activeAction === 'move') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Move to Expo</Typography>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <WOrderMoveComponent orderId={orderId} onCloseCallback={handleBackToMain} />
        </Box>
      </Box>
    );
  }

  if (showRawData) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">Raw Order Data</Typography>
          <IconButton size="small" onClick={handleBackToMain}>
            <ExpandMoreIcon sx={{ transform: 'rotate(90deg)' }} />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(order, null, 2)}
          </pre>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Service Summary Header */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" color="text.secondary">
            {serviceSummary}
          </Typography>
          <Chip label={orderStatus} color={statusColor} size="small" />
        </Stack>
      </Box>

      {/* Special Instructions - Prominently Displayed */}
      {order.specialInstructions && (
        <Alert
          severity="warning"
          icon={<InfoOutlined />}
          sx={{
            mx: 2,
            mt: 1.5,
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Special Instructions
          </Typography>
          <Typography variant="body2">{order.specialInstructions}</Typography>
        </Alert>
      )}

      {/* Scrollable Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Order Summary - Always Visible */}
        <Box sx={{ p: 2 }}>
          <WOrderCheckoutCartContainer order={order} hideProductDescriptions />
        </Box>

        <Divider />

        {/* Customer Info - Collapsible */}
        <Accordion
          expanded={customerInfoExpanded}
          onChange={(_event, isExpanded) => {
            setCustomerInfoExpanded(isExpanded);
          }}
          square
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              Customer Info
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <WOrderServiceInfoTableContainer order={order} />
          </AccordionDetails>
        </Accordion>

        {/* Table Assignment (Dine-In orders only) */}
        <TableAssignmentStatus order={order} />

        <Divider />

        {/* Actions Section */}
        <Box sx={{ p: 2 }}>
          <OrderActionsBar
            orderId={orderId}
            orderStatus={orderStatus}
            hasExpoPrinter={hasExpoPrinter}
            onReschedule={() => {
              setActiveAction('reschedule');
            }}
            onMove={() => {
              setActiveAction('move');
            }}
            onModify={() => {
              setActiveAction('modify');
            }}
            onCancel={() => {
              setCancelDialogOpen(true);
            }}
            onForceSend={() => {
              setForceSendDialogOpen(true);
            }}
            onViewRawData={() => {
              setShowRawData(true);
            }}
          />
        </Box>
      </Box>

      {/* Cancel Confirmation Dialog */}
      <CancelOrderDialog
        open={cancelDialogOpen}
        orderId={orderId}
        onClose={() => {
          setCancelDialogOpen(false);
        }}
      />

      {/* Force Send Confirmation Dialog */}
      <ForceSendOrderDialog
        open={forceSendDialogOpen}
        orderId={orderId}
        onClose={() => {
          setForceSendDialogOpen(false);
        }}
      />
    </Box>
  );
}

export default WOrderDrawerContent;
