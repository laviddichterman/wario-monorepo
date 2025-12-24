/**
 * TableAssignmentStatus - Displays current table assignment and seating status in the order drawer.
 * Only renders for DineIn orders.
 */

import { useCallback, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { type WOrderInstance, WSeatingStatus } from '@wcp/wario-shared/types';

import { useSeatingLayoutQuery, useSeatingLayoutsQuery } from '@/hooks/useSeatingLayoutQuery';
import { useMarkArrivedMutation } from '@/hooks/useTableAssignment';

import { AssignTableDialog } from './AssignTableDialog';

export interface TableAssignmentStatusProps {
  order: WOrderInstance;
}

const STATUS_LABELS: Record<WSeatingStatus, string> = {
  [WSeatingStatus.PENDING]: 'Pending',
  [WSeatingStatus.ASSIGNED]: 'Assigned',
  [WSeatingStatus.WAITING_ARRIVAL]: 'Waiting',
  [WSeatingStatus.SEATED_WAITING]: 'Partially Seated',
  [WSeatingStatus.SEATED]: 'Seated',
  [WSeatingStatus.WAITING_FOR_CHECK]: 'Waiting for Check',
  [WSeatingStatus.PAID]: 'Paid',
  [WSeatingStatus.COMPLETED]: 'Completed',
};

const STATUS_COLORS: Record<WSeatingStatus, 'default' | 'primary' | 'success' | 'warning' | 'info'> = {
  [WSeatingStatus.PENDING]: 'default',
  [WSeatingStatus.ASSIGNED]: 'info',
  [WSeatingStatus.WAITING_ARRIVAL]: 'warning',
  [WSeatingStatus.SEATED_WAITING]: 'warning',
  [WSeatingStatus.SEATED]: 'success',
  [WSeatingStatus.WAITING_FOR_CHECK]: 'primary',
  [WSeatingStatus.PAID]: 'success',
  [WSeatingStatus.COMPLETED]: 'default',
};

export function TableAssignmentStatus({ order }: TableAssignmentStatusProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mutate: markArrived, isLoading: isMarkingArrived } = useMarkArrivedMutation();

  // Only render for DineIn orders
  const dineInInfo = order.fulfillment.dineInInfo;

  // Get list of layouts to find the first one (usually there's one active layout)
  const { data: layouts, isLoading: isLoadingLayouts } = useSeatingLayoutsQuery();
  const firstLayoutId = layouts?.[0]?.id ?? null;

  // Get the full layout with floors/sections/resources
  const { data: fullLayout } = useSeatingLayoutQuery(firstLayoutId);

  // Build a map of tableId -> table name
  const tableNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!fullLayout) return map;

    for (const floor of fullLayout.floors) {
      for (const section of floor.sections) {
        for (const resource of section.resources) {
          map[resource.id] = resource.name;
        }
      }
    }
    return map;
  }, [fullLayout]);

  const seating = dineInInfo?.seating;
  const tableIds = useMemo(() => seating?.tableId ?? [], [seating?.tableId]);
  const status = seating?.status ?? WSeatingStatus.PENDING;

  // Resolve table names
  const tableNames = useMemo(() => {
    return tableIds.map((id) => tableNameMap[id] || `Table ${id.slice(-4)}`);
  }, [tableIds, tableNameMap]);

  const handleOpenDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const handleMarkArrived = useCallback(async () => {
    await markArrived({
      orderId: order.id,
      status: WSeatingStatus.SEATED,
    });
  }, [markArrived, order.id]);

  // Don't render if not DineIn (check fulfillmentType if available, or just rely on dineInInfo existence)
  // We check if dineInInfo exists as primary indicator
  if (!dineInInfo) {
    return null;
  }

  if (isLoadingLayouts) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={60} />
      </Box>
    );
  }

  const hasAssignment = tableIds.length > 0;
  const canMarkArrived = hasAssignment && status === WSeatingStatus.ASSIGNED;

  return (
    <>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Table Assignment
          </Typography>
          <Chip label={STATUS_LABELS[status]} color={STATUS_COLORS[status]} size="small" />
        </Stack>

        {hasAssignment ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
            {tableNames.map((name, idx) => (
              <Chip key={tableIds[idx]} label={name} variant="outlined" size="small" />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary" mb={1}>
            No table assigned
          </Typography>
        )}

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" onClick={handleOpenDialog}>
            {hasAssignment ? 'Change Table' : 'Assign Table'}
          </Button>
          {canMarkArrived && (
            <Button
              variant="contained"
              size="small"
              color="success"
              onClick={() => {
                void handleMarkArrived();
              }}
              disabled={isMarkingArrived}
            >
              Mark Arrived
            </Button>
          )}
        </Stack>
      </Box>

      <AssignTableDialog open={dialogOpen} onClose={handleCloseDialog} orderId={order.id} currentTableIds={tableIds} />
    </>
  );
}
