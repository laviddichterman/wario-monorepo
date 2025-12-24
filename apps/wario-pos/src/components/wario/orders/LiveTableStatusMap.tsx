/**
 * LiveTableStatusMap - Real-time view of restaurant floor showing table occupancy and status.
 *
 * Features:
 * - Color-coded tables based on WSeatingStatus
 * - Click occupied table to interact with order
 * - Click empty table for quick walk-in assignment
 * - Floor navigation (if multiple floors)
 * - Status legend
 */

import { useCallback, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import { WSeatingStatus } from '@wcp/wario-shared/types';

import { STATUS_COLORS, STATUS_LABELS, useLiveTableStatus } from '@/hooks/useLiveTableStatus';
import { useSeatingLayoutQuery, useSeatingLayoutsQuery } from '@/hooks/useSeatingLayoutQuery';

import { SeatingCanvas, type TableStatusMapEntry } from '@/sections/seating/SeatingCanvas';

import { useSeatingBuilderStore } from '@/stores/useSeatingBuilderStore';

export interface LiveTableStatusMapProps {
  /** Optional specific layout ID, defaults to first available */
  layoutId?: string;
  /** Handler for clicking an occupied table */
  onOccupiedTableClick?: (orderId: string, tableIds: string[]) => void;
  /** Handler for clicking an empty table (walk-in flow) */
  onEmptyTableClick?: (tableId: string) => void;
}

// Status entries to show in the legend
const LEGEND_STATUSES: WSeatingStatus[] = [
  WSeatingStatus.ASSIGNED,
  WSeatingStatus.WAITING_ARRIVAL,
  WSeatingStatus.SEATED,
  WSeatingStatus.WAITING_FOR_CHECK,
  WSeatingStatus.PAID,
];

/**
 * Status Legend component showing what each color means.
 */
function StatusLegend() {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
      {LEGEND_STATUSES.map((status) => (
        <Chip
          key={status}
          label={STATUS_LABELS[status]}
          size="small"
          sx={{
            backgroundColor: STATUS_COLORS[status],
            color: 'white',
            fontWeight: 500,
          }}
        />
      ))}
      <Chip label="Empty" variant="outlined" size="small" />
    </Stack>
  );
}

export function LiveTableStatusMap({ layoutId, onOccupiedTableClick, onEmptyTableClick }: LiveTableStatusMapProps) {
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);

  // Get layout data
  const { data: layouts, isLoading: isLoadingLayouts } = useSeatingLayoutsQuery();
  const effectiveLayoutId = layoutId ?? layouts?.[0]?.id ?? null;
  const { data: fullLayout, isLoading: isLoadingLayout } = useSeatingLayoutQuery(effectiveLayoutId);

  // Get live table status
  const { tableStatusMap: liveStatusMap, isLoading: isLoadingStatus } = useLiveTableStatus();

  // Sync floor index with store for SeatingCanvas
  const setActiveFloor = useSeatingBuilderStore((s) => s.setActiveFloor);

  // Build the tableStatusMap for SeatingCanvas
  const canvasStatusMap = useMemo<Record<string, TableStatusMapEntry>>(() => {
    const map: Record<string, TableStatusMapEntry> = {};

    for (const [tableId, entry] of Object.entries(liveStatusMap)) {
      if (entry.status) {
        map[tableId] = {
          color: STATUS_COLORS[entry.status],
          orderId: entry.orderId,
        };
      }
    }

    return map;
  }, [liveStatusMap]);

  // Handle floor tab change
  const handleFloorChange = useCallback(
    (_: React.SyntheticEvent, newValue: number) => {
      setActiveFloorIndex(newValue);
      setActiveFloor(newValue);
    },
    [setActiveFloor],
  );

  // Handle table click
  const handleTableClick = useCallback(
    (tableId: string, orderId: string | null) => {
      if (orderId && onOccupiedTableClick) {
        // Find all tables linked to this order
        const linkedTables = Object.entries(liveStatusMap)
          .filter(([_, entry]) => entry.orderId === orderId)
          .map(([id]) => id);
        onOccupiedTableClick(orderId, linkedTables);
      } else if (!orderId && onEmptyTableClick) {
        onEmptyTableClick(tableId);
      }
    },
    [liveStatusMap, onOccupiedTableClick, onEmptyTableClick],
  );

  // Initialize store with layout when loaded
  const loadLayoutIntoStore = useSeatingBuilderStore((s) => s.loadLayout);
  useMemo(() => {
    if (fullLayout) {
      loadLayoutIntoStore(fullLayout);
      setActiveFloor(0);
    }
  }, [fullLayout, loadLayoutIntoStore, setActiveFloor]);

  const isLoading = isLoadingLayouts || isLoadingLayout || isLoadingStatus;
  const floors = fullLayout?.floors ?? [];

  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading floor map...</Typography>
      </Box>
    );
  }

  if (!fullLayout || floors.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">No seating layout configured</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with legend */}
      <Box sx={{ px: 2, pt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Floor Status
        </Typography>
        <StatusLegend />
      </Box>

      {/* Floor tabs (if multiple floors) */}
      {floors.length > 1 && (
        <Tabs value={activeFloorIndex} onChange={handleFloorChange} sx={{ px: 2 }}>
          {floors.map((floor, idx) => (
            <Tab key={floor.id} label={floor.name} value={idx} />
          ))}
        </Tabs>
      )}

      {/* Canvas area */}
      <Box sx={{ flex: 1, minHeight: 400, p: 2 }}>
        <SeatingCanvas mode="readonly" tableStatusMap={canvasStatusMap} onTableClick={handleTableClick} />
      </Box>
    </Box>
  );
}
