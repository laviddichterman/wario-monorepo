/**
 * SeatingToolbar - Toolbar for table add/rotate/delete and save actions.
 *
 * Quick-add buttons for Round (80x80 ellipse) and Square (80x80 rectangle) tables.
 */

import { memo, useCallback } from 'react';

import CircleOutlined from '@mui/icons-material/CircleOutlined';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Delete from '@mui/icons-material/Delete';
import Redo from '@mui/icons-material/Redo';
import RotateRight from '@mui/icons-material/RotateRight';
import Save from '@mui/icons-material/Save';
import SquareOutlined from '@mui/icons-material/SquareOutlined';
import Undo from '@mui/icons-material/Undo';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';

import { SeatingShape } from '@wcp/wario-shared/types';

import { useCreateSeatingLayoutMutation, useUpdateSeatingLayoutMutation } from '@/hooks/useSeatingLayoutQuery';

import { toast } from '@/components/snackbar';

import {
  useActiveSection,
  useCanRedo,
  useCanUndo,
  useIsDirty,
  useSeatingBuilderStore,
  useSelectedResourceIds,
} from '@/stores/useSeatingBuilderStore';

// Default size for quick-add tables (80x80 total, so 40 radius)
const QUICK_ADD_SIZE = 40;
const QUICK_ADD_CAPACITY = 2;

export const SeatingToolbar = memo(function SeatingToolbar() {
  const activeSection = useActiveSection();
  const selectedResourceIds = useSelectedResourceIds();
  const isDirty = useIsDirty();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  const addResource = useSeatingBuilderStore((s) => s.addResource);
  const deleteResources = useSeatingBuilderStore((s) => s.deleteResources);
  const rotateResources = useSeatingBuilderStore((s) => s.rotateResources);
  const copyResources = useSeatingBuilderStore((s) => s.copyResources);
  const getNextTableNumber = useSeatingBuilderStore((s) => s.getNextTableNumber);
  const findAvailablePosition = useSeatingBuilderStore((s) => s.findAvailablePosition);
  const toLayout = useSeatingBuilderStore((s) => s.toLayout);
  const originalLayoutId = useSeatingBuilderStore((s) => s.originalLayoutId);
  const undo = useSeatingBuilderStore((s) => s.undo);
  const redo = useSeatingBuilderStore((s) => s.redo);

  const createMutation = useCreateSeatingLayoutMutation();
  const updateMutation = useUpdateSeatingLayoutMutation();

  // Selection state helpers
  const hasSelection = selectedResourceIds.length > 0;

  // Quick-add handlers
  const handleAddRoundTable = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!activeSection) return;

    const tableNum = getNextTableNumber();
    const position = findAvailablePosition();

    addResource({
      sectionId: activeSection.id,
      name: `Table ${String(tableNum)}`,
      capacity: QUICK_ADD_CAPACITY,
      shape: SeatingShape.ELLIPSE,
      shapeDimX: QUICK_ADD_SIZE,
      shapeDimY: QUICK_ADD_SIZE,
      centerX: position.x,
      centerY: position.y,
    });

    toast.success('Round table added');
  }, [activeSection, addResource, getNextTableNumber, findAvailablePosition]);

  const handleAddSquareTable = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!activeSection) return;

    const tableNum = getNextTableNumber();
    const position = findAvailablePosition();

    addResource({
      sectionId: activeSection.id,
      name: `Table ${String(tableNum)}`,
      capacity: QUICK_ADD_CAPACITY,
      shape: SeatingShape.RECTANGLE,
      shapeDimX: QUICK_ADD_SIZE,
      shapeDimY: QUICK_ADD_SIZE,
      centerX: position.x,
      centerY: position.y,
    });

    toast.success('Square table added');
  }, [activeSection, addResource, getNextTableNumber, findAvailablePosition]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedResourceIds.length === 0) return;
    deleteResources(selectedResourceIds);
    toast.success(`Deleted ${String(selectedResourceIds.length)} table(s)`);
  }, [selectedResourceIds, deleteResources]);

  const handleRotateSelected = useCallback(() => {
    if (selectedResourceIds.length === 0) return;
    rotateResources(selectedResourceIds, 90);
    toast.success('Rotated 90°');
  }, [selectedResourceIds, rotateResources]);

  const handleCopySelected = useCallback(() => {
    if (selectedResourceIds.length === 0) return;
    copyResources(selectedResourceIds);
    toast.success(`Copied ${String(selectedResourceIds.length)} table(s)`);
  }, [selectedResourceIds, copyResources]);

  const handleUndo = useCallback(() => {
    const label = undo();
    if (label) {
      toast.info(`Undo: ${label}`);
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const label = redo();
    if (label) {
      toast.info(`Redo: ${label}`);
    }
  }, [redo]);

  const handleSave = useCallback(async () => {
    const layout = toLayout();
    const loadLayout = useSeatingBuilderStore.getState().loadLayout;

    try {
      if (originalLayoutId) {
        // Update existing layout and reload to sync server-generated IDs for any new entities
        const updated = await updateMutation.mutateAsync({ id: originalLayoutId, layout });
        loadLayout(updated);
        toast.success('Changes committed');
      } else {
        // Create new layout and reload server response to get server-generated IDs
        const created = await createMutation.mutateAsync(layout);
        loadLayout(created);
        toast.success('Layout created');
      }
    } catch {
      toast.error('Failed to save changes');
    }
  }, [toLayout, originalLayoutId, updateMutation, createMutation]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 1 }}>
      {/* Quick-Add Round Table */}
      <Tooltip title="Add Round Table (80×80)">
        <span>
          <IconButton color="primary" onClick={handleAddRoundTable} disabled={!activeSection}>
            <CircleOutlined />
          </IconButton>
        </span>
      </Tooltip>

      {/* Quick-Add Square Table */}
      <Tooltip title="Add Square Table (80×80)">
        <span>
          <IconButton color="primary" onClick={handleAddSquareTable} disabled={!activeSection}>
            <SquareOutlined />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem />

      {/* Undo */}
      <Tooltip title="Undo (Ctrl+Z)">
        <span>
          <IconButton onClick={handleUndo} disabled={!canUndo}>
            <Undo />
          </IconButton>
        </span>
      </Tooltip>

      {/* Redo */}
      <Tooltip title="Redo (Ctrl+Shift+Z)">
        <span>
          <IconButton onClick={handleRedo} disabled={!canRedo}>
            <Redo />
          </IconButton>
        </span>
      </Tooltip>

      {/* Rotate */}
      <Tooltip title="Rotate 90°">
        <span>
          <IconButton onClick={handleRotateSelected} disabled={!hasSelection}>
            <RotateRight />
          </IconButton>
        </span>
      </Tooltip>

      {/* Copy */}
      <Tooltip title="Copy Selected">
        <span>
          <IconButton onClick={handleCopySelected} disabled={!hasSelection}>
            <ContentCopy />
          </IconButton>
        </span>
      </Tooltip>

      {/* Delete */}
      <Tooltip title="Delete Selected">
        <span>
          <IconButton onClick={handleDeleteSelected} disabled={!hasSelection} color="error">
            <Delete />
          </IconButton>
        </span>
      </Tooltip>

      {/* Spacer */}
      <Stack sx={{ flexGrow: 1 }} />

      {/* Commit/Create Button */}
      <Button
        variant="contained"
        startIcon={<Save />}
        onClick={() => {
          void handleSave();
        }}
        disabled={!isDirty || isSaving}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
    </Stack>
  );
});
