import { useState } from 'react';

import {
  Cancel as CancelIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Send as ForceSendIcon,
  LocalShipping as MoveIcon,
  Code as RawDataIcon,
  CalendarMonth as RescheduleIcon,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';

import { WOrderStatus } from '@wcp/wario-shared/logic';

import { useConfirmOrderMutation } from '@/hooks/useOrdersQuery';

export type OrderActionsBarProps = {
  orderId: string;
  orderStatus: WOrderStatus;
  hasExpoPrinter: boolean;
  onReschedule: () => void;
  onModify: () => void;
  onMove: () => void;
  onCancel: () => void;
  onForceSend: () => void;
  onViewRawData: () => void;
};

/**
 * Compact action bar for order drawer.
 * Uses icon buttons for common actions with tooltips.
 */
export function OrderActionsBar({
  orderId,
  orderStatus,
  hasExpoPrinter,
  onReschedule,
  onModify,
  onMove,
  onCancel,
  onForceSend,
  onViewRawData,
}: OrderActionsBarProps) {
  const confirmMutation = useConfirmOrderMutation();
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const isOpen = orderStatus === WOrderStatus.OPEN;
  const isEditable =
    orderStatus === WOrderStatus.OPEN ||
    orderStatus === WOrderStatus.CONFIRMED ||
    orderStatus === WOrderStatus.PROCESSING;
  const showMoveAction =
    hasExpoPrinter &&
    (orderStatus === WOrderStatus.CONFIRMED ||
      orderStatus === WOrderStatus.COMPLETED ||
      orderStatus === WOrderStatus.PROCESSING);

  const handleConfirm = () => {
    confirmMutation.mutate({ orderId, additionalMessage: '' });
  };

  return (
    <Stack spacing={2}>
      {/* Primary Action - Confirm (for OPEN orders only) */}
      {isOpen && (
        <Button
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          onClick={handleConfirm}
          disabled={confirmMutation.isPending}
        >
          {confirmMutation.isPending ? 'Confirming...' : 'Confirm Order'}
        </Button>
      )}

      {/* Standard Actions - Icon Buttons Row */}
      {isEditable && (
        <Stack direction="row" spacing={1} justifyContent="center">
          <Tooltip title="Reschedule">
            <IconButton
              onClick={onReschedule}
              sx={{
                border: 1,
                borderColor: 'divider',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <RescheduleIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Modify Order">
            <IconButton
              onClick={onModify}
              sx={{
                border: 1,
                borderColor: 'divider',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>

          {showMoveAction && (
            <Tooltip title="Move to Expo">
              <IconButton
                onClick={onMove}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <MoveIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      )}

      {/* Advanced Actions - Collapsible */}
      <Accordion
        expanded={advancedExpanded}
        onChange={(_event, isExpanded) => {
          setAdvancedExpanded(isExpanded);
        }}
        square
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" color="text.secondary">
            Advanced Actions
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
            {isEditable && (
              <Tooltip title="Cancel Order">
                <IconButton
                  onClick={onCancel}
                  color="error"
                  sx={{
                    border: 1,
                    borderColor: 'error.main',
                    '&:hover': { bgcolor: 'error.main', color: 'white' },
                  }}
                >
                  <CancelIcon />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Force Send">
              <IconButton
                onClick={onForceSend}
                color="warning"
                sx={{
                  border: 1,
                  borderColor: 'warning.main',
                  '&:hover': { bgcolor: 'warning.main', color: 'white' },
                }}
              >
                <ForceSendIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="View Raw Data">
              <IconButton
                onClick={onViewRawData}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <RawDataIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}

export default OrderActionsBar;
