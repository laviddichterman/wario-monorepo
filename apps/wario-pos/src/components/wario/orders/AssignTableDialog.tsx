/**
 * AssignTableDialog - Modal dialog for selecting tables to assign to an order.
 * Supports both List View (grouped by floor/section) and Map View (using SeatingCanvas).
 */

import { useCallback, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import type { FullSeatingFloor } from '@wcp/wario-shared/types';

import { useSeatingLayoutQuery, useSeatingLayoutsQuery } from '@/hooks/useSeatingLayoutQuery';
import { useAssignTableMutation } from '@/hooks/useTableAssignment';

import { SeatingCanvas } from '@/sections/seating/SeatingCanvas';

import { useSeatingBuilderStore } from '@/stores/useSeatingBuilderStore';

export interface AssignTableDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  currentTableIds: string[];
}

type ViewMode = 'list' | 'map';

export function AssignTableDialog({ open, onClose, orderId, currentTableIds }: AssignTableDialogProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>(currentTableIds);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);

  const { mutate: assignTable, isLoading } = useAssignTableMutation();

  // Get layout data
  const { data: layouts } = useSeatingLayoutsQuery();
  const firstLayoutId = layouts?.[0]?.id ?? null;
  const { data: fullLayout } = useSeatingLayoutQuery(firstLayoutId);

  // For Map View: sync with SeatingBuilderStore
  const selectResources = useSeatingBuilderStore((s) => s.selectResources);
  const selectedResourceIds = useSeatingBuilderStore((s) => s.editor.selectedResourceIds);
  const setActiveFloorById = useSeatingBuilderStore((s) => s.setActiveFloor);

  // Sync selectedIds when switching to map view
  const handleViewModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
      if (newMode === null) return;
      setViewMode(newMode);

      if (newMode === 'map') {
        // Sync our local selection to the store
        selectResources(selectedIds);
        // Set active floor by index
        const floors = fullLayout?.floors ?? [];
        if (floors[activeFloorIndex]) {
          const floorIdx = floors.findIndex((f) => f.id === floors[activeFloorIndex].id);
          if (floorIdx >= 0) {
            setActiveFloorById(floorIdx);
          }
        }
      }
    },
    [selectedIds, selectResources, fullLayout, activeFloorIndex, setActiveFloorById],
  );

  // Sync from store when in map mode
  const handleSyncFromMap = useCallback(() => {
    setSelectedIds(selectedResourceIds);
  }, [selectedResourceIds]);

  const handleToggleTable = useCallback((tableId: string) => {
    setSelectedIds((prev) => (prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]));
  }, []);

  const handleFloorTabChange = useCallback(
    (_: React.SyntheticEvent, newValue: number) => {
      setActiveFloorIndex(newValue);
      if (viewMode === 'map') {
        setActiveFloorById(newValue);
      }
    },
    [viewMode, setActiveFloorById],
  );

  const handleConfirm = useCallback(() => {
    const finalSelection = viewMode === 'map' ? selectedResourceIds : selectedIds;
    void assignTable({ orderId, tableIds: finalSelection });
    onClose();
  }, [viewMode, selectedResourceIds, selectedIds, assignTable, orderId, onClose]);

  const handleCancel = useCallback(() => {
    setSelectedIds(currentTableIds);
    onClose();
  }, [currentTableIds, onClose]);

  // Reset state when dialog opens
  const handleDialogEnter = useCallback(() => {
    setSelectedIds(currentTableIds);
    setActiveFloorIndex(0);
  }, [currentTableIds]);

  const floors = fullLayout?.floors ?? [];

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      slotProps={{
        transition: { onEnter: handleDialogEnter },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Assign Table</Typography>
          <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeChange} size="small">
            <ToggleButton value="list">List</ToggleButton>
            <ToggleButton value="map">Map</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 400 }}>
        {floors.length > 1 && (
          <Tabs value={activeFloorIndex} onChange={handleFloorTabChange} sx={{ mb: 2 }}>
            {floors.map((floor, idx) => (
              <Tab key={floor.id} label={floor.name} value={idx} />
            ))}
          </Tabs>
        )}

        {viewMode === 'list' ? (
          <ListViewContent floor={floors[activeFloorIndex]} selectedIds={selectedIds} onToggle={handleToggleTable} />
        ) : (
          <Box sx={{ height: 400 }}>
            <SeatingCanvas mode="selection" />
            <Button size="small" onClick={handleSyncFromMap} sx={{ mt: 1 }}>
              Update Selection from Map
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Stack direction="row" spacing={1} sx={{ width: '100%', justifyContent: 'space-between', px: 1, py: 0.5 }}>
          <Box>
            {(viewMode === 'map' ? selectedResourceIds : selectedIds).length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {(viewMode === 'map' ? selectedResourceIds : selectedIds).length} table(s) selected
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button variant="contained" onClick={handleConfirm} disabled={isLoading}>
              Confirm
            </Button>
          </Stack>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

// --- List View Sub-component ---

interface ListViewContentProps {
  floor: FullSeatingFloor | undefined;
  selectedIds: string[];
  onToggle: (tableId: string) => void;
}

function ListViewContent({ floor, selectedIds, onToggle }: ListViewContentProps) {
  if (!floor) {
    return (
      <Typography color="text.secondary" sx={{ p: 2 }}>
        No floor data available
      </Typography>
    );
  }

  return (
    <Box>
      {floor.sections.map((section) => (
        <Box key={section.id} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            {section.name}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {section.resources.map((resource) => (
              <Chip
                key={resource.id}
                label={resource.name}
                variant={selectedIds.includes(resource.id) ? 'filled' : 'outlined'}
                color={selectedIds.includes(resource.id) ? 'primary' : 'default'}
                onClick={() => {
                  onToggle(resource.id);
                }}
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
          <Divider sx={{ mt: 1 }} />
        </Box>
      ))}
    </Box>
  );
}
