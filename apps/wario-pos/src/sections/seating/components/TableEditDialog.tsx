/**
 * TableEditDialog - Dialog for editing table properties on double-click.
 */

import { memo, useCallback, useEffect, useState } from 'react';

import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import { SeatingShape } from '@wcp/wario-shared/types';
import { AppDialog } from '@wcp/wario-ux-shared/containers';

import { toast } from '@/components/snackbar';

import { type UpdateResourceParams, useSeatingBuilderStore } from '@/stores/useSeatingBuilderStore';

import { CANVAS_HEIGHT, CANVAS_WIDTH, clampCenterToCanvas } from '../utils/bounding-utils';

// Max table dimension: round(1/sqrt(2), 2) * min(width, height) ≈ 0.71 * 800 = 566
const MAX_TABLE_DIM = (Math.round((1 / Math.sqrt(2)) * 100) / 100) * Math.min(CANVAS_WIDTH, CANVAS_HEIGHT);

export interface TableEditDialogProps {
  /** ID of the resource being edited (null if dialog closed) */
  resourceId: string | null;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
}

interface FormState {
  name: string;
  capacity: number;
  shape: SeatingShape;
  width: number;
  height: number;
  rotation: number;
  centerX: number;
  centerY: number;
}

export const TableEditDialog = memo(function TableEditDialog({ resourceId, open, onClose }: TableEditDialogProps) {
  const resourcesById = useSeatingBuilderStore((s) => s.layout.resourcesById);
  const updateResource = useSeatingBuilderStore((s) => s.updateResource);

  const resource = resourceId ? resourcesById[resourceId] : null;

  const [form, setForm] = useState<FormState>({
    name: '',
    capacity: 2,
    shape: SeatingShape.RECTANGLE,
    width: 40,
    height: 40,
    rotation: 0,
    centerX: 100,
    centerY: 100,
  });

  // Sync form state when dialog opens with a resource
  useEffect(() => {
    if (resource) {
      setForm({
        name: resource.name,
        capacity: resource.capacity,
        shape: resource.shape,
        width: resource.shapeDimX,
        height: resource.shapeDimY,
        rotation: resource.rotation,
        centerX: resource.centerX,
        centerY: resource.centerY,
      });
    }
  }, [resource]);

  // Handle rotation blur - normalize to 0-360
  const handleRotationBlur = useCallback(() => {
    setForm((f) => {
      let normalized = ((f.rotation % 360) + 360) % 360;
      if (normalized === 360) normalized = 0;
      return { ...f, rotation: normalized };
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!resourceId) return;

    // Calculate final dimensions
    const shapeDimX = Math.min(form.width, MAX_TABLE_DIM / 2);
    const shapeDimY = Math.min(form.height, MAX_TABLE_DIM / 2);

    // Clamp center position to keep table within canvas bounds
    const clampedCenter = clampCenterToCanvas({
      centerX: form.centerX,
      centerY: form.centerY,
      shapeDimX,
      shapeDimY,
      rotation: form.rotation,
      shape: form.shape,
    });

    const updates: UpdateResourceParams = {
      name: form.name,
      capacity: form.capacity,
      shape: form.shape,
      shapeDimX,
      shapeDimY,
      rotation: form.rotation,
      centerX: clampedCenter.x,
      centerY: clampedCenter.y,
    };

    updateResource(resourceId, updates);
    toast.success('Table updated');
    onClose();
  }, [resourceId, form, updateResource, onClose]);

  if (!resource) {
    return null;
  }

  // Max half-dimension (since form stores half-sizes, max display is MAX_TABLE_DIM)
  const maxDimDisplay = Math.round(MAX_TABLE_DIM);

  return (
    <AppDialog.Root open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <AppDialog.Header onClose={onClose} title="Edit Table" />
      <AppDialog.Content>
        <Stack spacing={2}>
          <TextField
            label="Table Name"
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
            }}
            fullWidth
          />

          <TextField
            label="Capacity"
            type="number"
            value={form.capacity}
            onChange={(e) => {
              setForm((f) => ({ ...f, capacity: Number(e.target.value) }));
            }}
            slotProps={{ htmlInput: { min: 1, max: 20 } }}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Shape</InputLabel>
            <Select
              value={form.shape}
              label="Shape"
              onChange={(e) => {
                setForm((f) => ({ ...f, shape: e.target.value as SeatingShape }));
              }}
            >
              <MenuItem value={SeatingShape.RECTANGLE}>Square/Rectangle</MenuItem>
              <MenuItem value={SeatingShape.ELLIPSE}>Round/Oval</MenuItem>
            </Select>
          </FormControl>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Width"
              type="number"
              value={form.width * 2}
              onChange={(e) => {
                setForm((f) => ({ ...f, width: Number(e.target.value) / 2 }));
              }}
              slotProps={{ htmlInput: { min: 20, max: maxDimDisplay } }}
              fullWidth
            />
            <TextField
              label="Height"
              type="number"
              value={form.height * 2}
              onChange={(e) => {
                setForm((f) => ({ ...f, height: Number(e.target.value) / 2 }));
              }}
              slotProps={{ htmlInput: { min: 20, max: maxDimDisplay } }}
              fullWidth
            />
          </Stack>

          <TextField
            label="Rotation (degrees)"
            type="number"
            value={form.rotation}
            onChange={(e) => {
              setForm((f) => ({ ...f, rotation: Number(e.target.value) }));
            }}
            onBlur={handleRotationBlur}
            slotProps={{ htmlInput: { min: 0, max: 359, step: 1 } }}
            helperText="0-359°"
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Center X"
              type="number"
              value={Math.round(form.centerX)}
              onChange={(e) => {
                setForm((f) => ({ ...f, centerX: Number(e.target.value) }));
              }}
              slotProps={{ htmlInput: { min: 0, max: CANVAS_WIDTH, step: 10 } }}
              helperText="Position is auto-clamped on save"
              fullWidth
            />
            <TextField
              label="Center Y"
              type="number"
              value={Math.round(form.centerY)}
              onChange={(e) => {
                setForm((f) => ({ ...f, centerY: Number(e.target.value) }));
              }}
              slotProps={{ htmlInput: { min: 0, max: CANVAS_HEIGHT, step: 10 } }}
              helperText="Position is auto-clamped on save"
              fullWidth
            />
          </Stack>
        </Stack>
      </AppDialog.Content>
      <AppDialog.Actions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </AppDialog.Actions>
    </AppDialog.Root>
  );
});
