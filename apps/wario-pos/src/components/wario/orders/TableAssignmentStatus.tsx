/**
 * TableAssignmentStatus - Displays current table assignment and seating status in the order drawer.
 * Only renders for DineIn orders.
 */

import { useCallback, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { WSeatingStatus } from '@wcp/wario-shared/logic';
import type { WOrderInstance } from '@wcp/wario-shared/types';

import { useSeatingLayoutQuery, useSeatingLayoutsQuery } from '@/hooks/useSeatingLayoutQuery';
import { useUpdateSeatingStatusMutation } from '@/hooks/useTableAssignment';

import { AssignTableDialog } from './AssignTableDialog';

export interface TableAssignmentStatusProps {
  order: WOrderInstance;
}

const STATUS_LABELS: Record<WSeatingStatus, string> = {
  [WSeatingStatus.PENDING]: 'Pending',
  [WSeatingStatus.ASSIGNED]: 'Assigned',
  [WSeatingStatus.WAITING_ARRIVAL]: 'Waiting for Arrival',
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

/**
 * Define valid status transitions.
 * Staff can only move forward through the workflow (with some flexibility).
 */
const VALID_TRANSITIONS: Record<WSeatingStatus, WSeatingStatus[]> = {
  [WSeatingStatus.PENDING]: [WSeatingStatus.ASSIGNED],
  [WSeatingStatus.ASSIGNED]: [WSeatingStatus.WAITING_ARRIVAL, WSeatingStatus.SEATED],
  [WSeatingStatus.WAITING_ARRIVAL]: [WSeatingStatus.SEATED_WAITING, WSeatingStatus.SEATED],
  [WSeatingStatus.SEATED_WAITING]: [WSeatingStatus.SEATED],
  [WSeatingStatus.SEATED]: [WSeatingStatus.WAITING_FOR_CHECK],
  [WSeatingStatus.WAITING_FOR_CHECK]: [WSeatingStatus.PAID],
  [WSeatingStatus.PAID]: [WSeatingStatus.COMPLETED],
  [WSeatingStatus.COMPLETED]: [],
};

export function TableAssignmentStatus({ order }: TableAssignmentStatusProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateSeatingStatusMutation();

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

  // Get available transitions for current status
  const availableStatuses = useMemo(() => {
    return VALID_TRANSITIONS[status];
  }, [status]);

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

  const handleStatusChange = useCallback(
    (event: SelectChangeEvent<WSeatingStatus>) => {
      const newStatus = event.target.value as WSeatingStatus;
      updateStatus({
        orderId: order.id,
        status: newStatus,
        order,
      });
    },
    [updateStatus, order],
  );

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
  const canChangeStatus = hasAssignment && availableStatuses.length > 0;

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

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" size="small" onClick={handleOpenDialog}>
            {hasAssignment ? 'Change Table' : 'Assign Table'}
          </Button>

          {canChangeStatus && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="seating-status-label">Update Status</InputLabel>
              <Select
                labelId="seating-status-label"
                label="Update Status"
                value=""
                onChange={handleStatusChange}
                disabled={isUpdatingStatus}
                displayEmpty
              >
                {availableStatuses.map((nextStatus) => (
                  <MenuItem key={nextStatus} value={nextStatus}>
                    {STATUS_LABELS[nextStatus]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </Box>

      <AssignTableDialog open={dialogOpen} onClose={handleCloseDialog} orderId={order.id} currentTableIds={tableIds} />
    </>
  );
}
