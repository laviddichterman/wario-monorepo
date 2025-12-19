/**
 * FloorSelector - Floor dropdown selector for the seating builder.
 *
 * Matches the layout selector style with dropdown + "Add Floor" option.
 */

import { memo, useCallback, useMemo, useState } from 'react';

import Add from '@mui/icons-material/Add';
import { type SelectChangeEvent } from '@mui/material';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';

import { AppDialog } from '@wcp/wario-ux-shared/containers';

import { useBoolean } from '@/hooks/useBoolean';

import { useActiveFloorId, useSeatingBuilderStore } from '@/stores/useSeatingBuilderStore';

const ADD_FLOOR_VALUE = '__add__';

export const FloorSelector = memo(function FloorSelector() {
  // Select raw data (stable references) instead of derived arrays
  const floorIds = useSeatingBuilderStore((s) => s.layout.floorIds);
  const floorsById = useSeatingBuilderStore((s) => s.layout.floorsById);

  // Memoize the derived floors array to prevent infinite re-renders
  const floors = useMemo(() => floorIds.map((id) => floorsById[id]).filter(Boolean), [floorIds, floorsById]);

  const activeFloorId = useActiveFloorId();
  const setActiveFloor = useSeatingBuilderStore((s) => s.setActiveFloor);
  const addFloor = useSeatingBuilderStore((s) => s.addFloor);

  const addDialog = useBoolean();
  const [newFloorName, setNewFloorName] = useState('');

  const handleFloorChange = useCallback(
    (event: SelectChangeEvent) => {
      const value = event.target.value;
      if (value === ADD_FLOOR_VALUE) {
        addDialog.onTrue();
      } else {
        setActiveFloor(value);
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

  return (
    <>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="floor-select-label">Floor</InputLabel>
        <Select
          labelId="floor-select-label"
          id="floor-select"
          value={activeFloorId ?? ''}
          label="Floor"
          onChange={handleFloorChange}
        >
          {floors.map((floor) => (
            <MenuItem key={floor.id} value={floor.id} disabled={floor.disabled}>
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
    </>
  );
});

// Re-export with both names for backwards compatibility
export { FloorSelector as FloorTabs };
