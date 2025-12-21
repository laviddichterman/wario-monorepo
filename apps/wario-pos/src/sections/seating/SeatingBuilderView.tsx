/**
 * SeatingBuilderView - Main composed view for the seating layout builder.
 *
 * Orchestrates:
 * - Loading existing layouts or creating new ones
 * - Floor/Section navigation
 * - Canvas with drag-and-drop
 * - Toolbar for CRUD operations
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import {
  useCreateSeatingLayoutMutation,
  useDeleteSeatingLayoutMutation,
  useSeatingLayoutQuery,
  useSeatingLayoutsQuery,
  useUpdateSeatingLayoutMutation,
} from '@/hooks/useSeatingLayoutQuery';

import { NavigationGuardDialog } from '@/components/navigation-guard';
import { toast } from '@/components/snackbar';

import { useSeatingBuilderStore } from '@/stores/useSeatingBuilderStore';

import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { NamePopover } from './components/NamePopover';
import { UnsavedChangesDialog } from './components/UnsavedChangesDialog';
import { FloorSelector } from './FloorSelector';
import { SeatingCanvas } from './SeatingCanvas';
import { SeatingToolbar } from './SeatingToolbar';
import { SectionTabs } from './SectionTabs';

export function SeatingBuilderView() {
  const { data: layouts, isLoading: isLoadingList, error } = useSeatingLayoutsQuery();
  const deleteLayoutMutation = useDeleteSeatingLayoutMutation();

  const loadLayout = useSeatingBuilderStore((s) => s.loadLayout);
  const createEmptyLayout = useSeatingBuilderStore((s) => s.createEmptyLayout);
  const resetToDefaultLayout = useSeatingBuilderStore((s) => s.resetToDefaultLayout);
  const originalLayoutId = useSeatingBuilderStore((s) => s.originalLayoutId);
  const undo = useSeatingBuilderStore((s) => s.undo);
  const redo = useSeatingBuilderStore((s) => s.redo);
  const layout = useSeatingBuilderStore((s) => s.layout);
  const layoutName = layout.name;
  const isDirty = useSeatingBuilderStore((s) => s.isDirty);
  const toLayout = useSeatingBuilderStore((s) => s.toLayout);
  const markClean = useSeatingBuilderStore((s) => s.markClean);
  const renameLayout = useSeatingBuilderStore((s) => s.renameLayout);
  // Store starts with a default layout, so this is always true initially
  const layoutId = layout.id;

  // Track which layout ID to fetch fully
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    { type: 'switch'; layoutId: string } | { type: 'new'; name: string } | null
  >(null);

  // Add layout popover state
  const [addLayoutOpen, setAddLayoutOpen] = useState(false);
  const [renameLayoutOpen, setRenameLayoutOpen] = useState(false);
  const layoutSelectorRef = useRef<HTMLDivElement>(null);

  // Mutations for save & switch
  const createMutation = useCreateSeatingLayoutMutation();
  const updateMutation = useUpdateSeatingLayoutMutation();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Navigation guard for unsaved changes
  const { isBlocked, proceed, cancel } = useNavigationGuard({ when: isDirty });

  // Fetch full layout data when a layout is selected
  const {
    data: fullLayout,
    isLoading: _isLoadingLayout,
    refetch: _refetchLayout,
  } = useSeatingLayoutQuery(selectedLayoutId);

  // When layouts list loads, select first layout if none selected
  useEffect(() => {
    if (layouts === undefined) return; // Still loading

    // If we have saved layouts and haven't selected one yet
    if (layouts.length > 0 && selectedLayoutId === null && originalLayoutId === null) {
      setSelectedLayoutId(layouts[0].id);
    }
    // If no saved layouts, we keep the default layout from store initialization
  }, [layouts, selectedLayoutId, originalLayoutId]);

  // Load full layout data when fetched
  useEffect(() => {
    if (fullLayout) {
      loadLayout(fullLayout);
    }
  }, [fullLayout, loadLayout]);

  const handleLayoutChange = useCallback(
    (newLayoutId: string) => {
      if (isDirty) {
        setPendingAction({ type: 'switch', layoutId: newLayoutId });
        setUnsavedDialogOpen(true);
      } else {
        setSelectedLayoutId(newLayoutId);
      }
    },
    [isDirty],
  );

  const handleCreateNew = useCallback(
    (name: string) => {
      if (isDirty) {
        setPendingAction({ type: 'new', name });
        setUnsavedDialogOpen(true);
      } else {
        createEmptyLayout(name);
      }
    },
    [isDirty, createEmptyLayout],
  );

  const handleAddLayoutConfirm = useCallback(
    (name: string) => {
      handleCreateNew(name);
      toast.success(`Created layout "${name}"`);
    },
    [handleCreateNew],
  );

  const handleUnsavedDiscard = useCallback(() => {
    setUnsavedDialogOpen(false);
    if (pendingAction?.type === 'switch') {
      setSelectedLayoutId(pendingAction.layoutId);
    } else if (pendingAction?.type === 'new') {
      createEmptyLayout(pendingAction.name);
    }
    setPendingAction(null);
  }, [pendingAction, createEmptyLayout]);

  const handleUnsavedCancel = useCallback(() => {
    setUnsavedDialogOpen(false);
    setPendingAction(null);
  }, []);

  const handleSaveAndProceed = useCallback(async () => {
    const layout = toLayout();

    try {
      if (originalLayoutId) {
        await updateMutation.mutateAsync({ id: originalLayoutId, layout });
        markClean();
      } else {
        const created = await createMutation.mutateAsync(layout);
        loadLayout(created);
      }

      setUnsavedDialogOpen(false);

      // Now proceed with pending action
      if (pendingAction?.type === 'switch') {
        setSelectedLayoutId(pendingAction.layoutId);
      } else if (pendingAction?.type === 'new') {
        createEmptyLayout(pendingAction.name);
      }
      setPendingAction(null);
    } catch {
      toast.error('Failed to save changes');
    }
  }, [
    toLayout,
    originalLayoutId,
    updateMutation,
    createMutation,
    markClean,
    loadLayout,
    pendingAction,
    createEmptyLayout,
  ]);

  // Compute layout counts for delete warning
  const deleteWarningItems = useMemo(() => {
    const items: string[] = [];
    const floorCount = layout.floors.length;
    let sectionCount = 0;
    let tableCount = 0;
    for (const floor of layout.floors) {
      sectionCount += floor.sections.length;
      for (const section of floor.sections) {
        tableCount += section.resources.length;
      }
    }
    if (floorCount > 0) items.push(`${String(floorCount)} floor${floorCount > 1 ? 's' : ''}`);
    if (sectionCount > 0) items.push(`${String(sectionCount)} section${sectionCount > 1 ? 's' : ''}`);
    if (tableCount > 0) items.push(`${String(tableCount)} table${tableCount > 1 ? 's' : ''}`);
    return items;
  }, [layout]);

  const handleDeleteLayout = useCallback(async () => {
    if (!originalLayoutId) return;

    try {
      await deleteLayoutMutation.mutateAsync(originalLayoutId);
      setDeleteDialogOpen(false);
      toast.success(`Deleted layout "${layoutName}"`);

      // Load another layout or reset to default
      const remainingLayouts = layouts?.filter((l) => l.id !== originalLayoutId);
      if (remainingLayouts && remainingLayouts.length > 0) {
        setSelectedLayoutId(remainingLayouts[0].id);
      } else {
        resetToDefaultLayout();
      }
    } catch {
      toast.error('Failed to delete layout');
    }
  }, [originalLayoutId, deleteLayoutMutation, layoutName, layouts, resetToDefaultLayout]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      // Use userAgentData if available (modern browsers), fallback to userAgent
      const isMac =
        (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform === 'macOS' ||
        navigator.userAgent.toUpperCase().includes('MAC');
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (!cmdKey) return;

      // Undo: Cmd/Ctrl + Z (without Shift)
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const label = undo();
        if (label) {
          toast.info(`Undo: ${label}`);
        }
      }

      // Redo: Cmd/Ctrl + Shift + Z OR Cmd/Ctrl + Y
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        const label = redo();
        if (label) {
          toast.info(`Redo: ${label}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  // Loading state - only show during initial list fetch
  if (isLoadingList) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Typography color="error">Failed to load seating layouts</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1} sx={{ height: '100%' }}>
      {/* Combined Layout selector + Floor tabs row */}
      {layoutId && (
        <React.Fragment key={layoutId}>
          <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              {/* Layout selector */}
              <Box ref={layoutSelectorRef}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Layout</InputLabel>
                  <Select
                    value={originalLayoutId || (layoutId ? '__new__' : '')}
                    label="Layout"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '__add__') {
                        setAddLayoutOpen(true);
                      } else if (value !== '__new__') {
                        handleLayoutChange(value);
                      }
                    }}
                  >
                    {layoutId && !originalLayoutId && (
                      <MenuItem value="__new__">
                        <em>{layoutName} (unsaved)</em>
                      </MenuItem>
                    )}
                    {layouts?.map((layout) => (
                      <MenuItem key={layout.id} value={layout.id}>
                        {layout.name}
                      </MenuItem>
                    ))}
                    <Divider />
                    <MenuItem value="__add__">
                      <Add sx={{ mr: 1, fontSize: 20 }} />
                      Add Layout...
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Rename Layout Button */}
              <Tooltip title="Rename current layout">
                <IconButton
                  size="small"
                  onClick={() => {
                    setRenameLayoutOpen(true);
                  }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* Delete Layout Button - inline like floor delete */}
              <Tooltip title={originalLayoutId ? 'Delete current layout' : 'Cannot delete unsaved layout'}>
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      setDeleteDialogOpen(true);
                    }}
                    disabled={!originalLayoutId}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Divider orientation="vertical" flexItem />

              {/* Floor tabs inline */}
              <FloorSelector />
            </Stack>
          </Paper>

          {/* Section selector + Toolbar combined */}
          <Paper variant="outlined" sx={{ px: 2, py: 0.5 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <SectionTabs />
              <Divider orientation="vertical" flexItem />
              <SeatingToolbar />
            </Stack>
          </Paper>

          {/* Canvas */}
          <Box sx={{ flexGrow: 1, minHeight: 400 }}>
            <SeatingCanvas />
          </Box>
        </React.Fragment>
      )}

      {/* Show placeholder when no layout is loaded yet */}
      {!layoutId && (
        <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1} minHeight={400}>
          <CircularProgress />
        </Box>
      )}

      {/* Delete Layout Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
        }}
        onConfirm={() => {
          void handleDeleteLayout();
        }}
        title="Delete Layout"
        entityName={layoutName}
        warningItems={deleteWarningItems.length > 0 ? deleteWarningItems : undefined}
        isPending={deleteLayoutMutation.isPending}
      />

      {/* Add Layout Popover */}
      <NamePopover
        anchorEl={addLayoutOpen ? layoutSelectorRef.current : null}
        onClose={() => {
          setAddLayoutOpen(false);
        }}
        onConfirm={handleAddLayoutConfirm}
        label="Add Layout"
        placeholder="e.g., Main Dining, Happy Hour"
      />

      {/* Rename Layout Popover */}
      <NamePopover
        anchorEl={renameLayoutOpen ? layoutSelectorRef.current : null}
        onClose={() => {
          setRenameLayoutOpen(false);
        }}
        onConfirm={(newName) => {
          renameLayout(newName);
          toast.success(`Renamed layout to "${newName}"`);
        }}
        currentName={layoutName}
        label="Rename Layout"
      />

      {/* Unsaved Changes Confirmation Dialog (for layout switching) */}
      <UnsavedChangesDialog
        open={unsavedDialogOpen}
        layoutName={layoutName}
        onDiscard={handleUnsavedDiscard}
        onCancel={handleUnsavedCancel}
        onSaveAndProceed={() => {
          void handleSaveAndProceed();
        }}
        isSaving={isSaving}
      />

      {/* Navigation Guard Dialog (for leaving the page) */}
      <NavigationGuardDialog
        open={isBlocked}
        entityName={layoutName}
        entityType="changes"
        onDiscard={proceed}
        onCancel={cancel}
        onSave={() => {
          void (async () => {
            try {
              const layoutData = toLayout();
              if (originalLayoutId) {
                const updated = await updateMutation.mutateAsync({ id: originalLayoutId, layout: layoutData });
                loadLayout(updated);
              } else {
                const created = await createMutation.mutateAsync(layoutData);
                loadLayout(created);
              }
              proceed();
            } catch {
              toast.error('Failed to save changes');
            }
          })();
        }}
        isSaving={isSaving}
      />
    </Stack>
  );
}
