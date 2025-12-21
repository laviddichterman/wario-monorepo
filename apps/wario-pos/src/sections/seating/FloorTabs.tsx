/**
 * FloorSelector - Floor dropdown selector for the seating builder.
 *
 * Features:
 * - Floor dropdown selector
 * - Add Floor via dialog
 * - Delete Floor with confirmation (cascade deletes sections and tables)
 */

import { memo, useCallback, useMemo, useState } from 'react';

import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';
import { type SelectChangeEvent } from '@mui/material';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';

import { AppDialog } from '@wcp/wario-ux-shared/containers';

import { useBoolean } from '@/hooks/useBoolean';

import { toast } from '@/components/snackbar';

import { useActiveFloorIndex, useSeatingBuilderStore } from '@/stores/useSeatingBuilderStore';

import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

const ADD_FLOOR_VALUE = '__add__';

export const FloorSelector = memo(function FloorSelector() {
  // Use nested floors array directly
  const floors = useSeatingBuilderStore((s) => s.layout.floors);
  const activeFloorIndex = useActiveFloorIndex();
  const setActiveFloor = useSeatingBuilderStore((s) => s.setActiveFloor);
  const addFloor = useSeatingBuilderStore((s) => s.addFloor);
  const deleteFloor = useSeatingBuilderStore((s) => s.deleteFloor);

  const addDialog = useBoolean();
  const [newFloorName, setNewFloorName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Compute counts for the active floor (for delete confirmation)
  const activeFloor = floors[activeFloorIndex] ?? null;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const activeSectionCount = activeFloor?.sections.length ?? 0;
  const activeTableCount = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!activeFloor) return 0;
    let count = 0;
    for (const section of activeFloor.sections) {
      count += section.resources.length;
    }
    return count;
  }, [activeFloor]);

  const canDeleteFloor = floors.length > 1;

  const handleFloorChange = useCallback(
    (event: SelectChangeEvent) => {
      const value = event.target.value;
      if (value === ADD_FLOOR_VALUE) {
        addDialog.onTrue();
      } else {
        // Value is the index as string
        setActiveFloor(Number(value));
      }
    },
    [setActiveFloor, addDialog],
  );

  const handleAddFloor = useCallback(() => {
    if (newFloorName.trim()) {
      addFloor(newFloorName.trim());
      setNewFloorName('');
      addDialog.onFalse();
    }
  }, [addFloor, newFloorName, addDialog]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddFloor();
      }
    },
    [handleAddFloor],
  );

  const handleDeleteFloor = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!activeFloor) return;
    deleteFloor(activeFloorIndex);
    setDeleteDialogOpen(false);
    toast.success(`Deleted floor "${activeFloor.name}"`);
  }, [activeFloorIndex, activeFloor, deleteFloor]);

  // Build warning items for delete confirmation
  const deleteWarningItems = useMemo(() => {
    const items: string[] = [];
    if (activeSectionCount > 0) {
      items.push(`${String(activeSectionCount)} section${activeSectionCount > 1 ? 's' : ''}`);
    }
    if (activeTableCount > 0) {
      items.push(`${String(activeTableCount)} table${activeTableCount > 1 ? 's' : ''}`);
    }
    return items;
  }, [activeSectionCount, activeTableCount]);

  return (
    <>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="floor-select-label">Floor</InputLabel>
        <Select
          labelId="floor-select-label"
          id="floor-select"
          value={String(activeFloorIndex)}
          label="Floor"
          onChange={handleFloorChange}
        >
          {floors.map((floor, index) => (
            <MenuItem key={floor.id} value={String(index)} disabled={floor.disabled}>
              {floor.name}
            </MenuItem>
          ))}
          <Divider />
          <MenuItem value={ADD_FLOOR_VALUE}>
            <Add sx={{ mr: 1, fontSize: 20 }} />
            Add Floor...
          </MenuItem>
        </Select>
      </FormControl>

      {/* Delete Floor Button */}
      <Tooltip title={canDeleteFloor ? 'Delete current floor' : 'Cannot delete the only floor'}>
        <span>
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              setDeleteDialogOpen(true);
            }}
            disabled={!canDeleteFloor}
          >
            <Delete fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* Add Floor Dialog */}
      <AppDialog.Root open={addDialog.value} onClose={addDialog.onFalse} maxWidth="xs" fullWidth>
        <AppDialog.Header onClose={addDialog.onFalse} title="Add Floor" />
        <AppDialog.Content>
          <TextField
            autoFocus
            value={newFloorName}
            onChange={(e) => {
              setNewFloorName(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            label="Floor Name"
            placeholder="e.g., Main Floor, Patio, Rooftop"
            fullWidth
          />
        </AppDialog.Content>
        <AppDialog.Actions>
          <Button onClick={addDialog.onFalse}>Cancel</Button>
          <Button variant="contained" onClick={handleAddFloor} disabled={!newFloorName.trim()}>
            Add
          </Button>
        </AppDialog.Actions>
      </AppDialog.Root>

      {/* Delete Floor Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
        }}
        onConfirm={handleDeleteFloor}
        title="Delete Floor"
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        entityName={activeFloor?.name ?? 'Floor'}
        warningItems={deleteWarningItems.length > 0 ? deleteWarningItems : undefined}
      />
    </>
  );
});

// Re-export with both names for backwards compatibility
export { FloorSelector as FloorTabs };
