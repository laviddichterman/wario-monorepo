/**
 * SeatingBuilderView - Main composed view for the seating layout builder.
 *
 * Orchestrates:
 * - Loading existing layouts or creating new ones
 * - Floor/Section navigation
 * - Canvas with drag-and-drop
 * - Toolbar for CRUD operations
 */

import React, { useCallback, useEffect } from 'react';

import Add from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useSeatingLayoutQuery, useSeatingLayoutsQuery } from '@/hooks/useSeatingLayoutQuery';

import { useSeatingBuilderStore } from '@/stores/useSeatingBuilderStore';

import { FloorTabs } from './FloorTabs';
import { SeatingCanvas } from './SeatingCanvas';
import { SeatingToolbar } from './SeatingToolbar';
import { SectionTabs } from './SectionTabs';

export function SeatingBuilderView() {
  const { data: layouts, isLoading: isLoadingList, error } = useSeatingLayoutsQuery();

  const loadLayout = useSeatingBuilderStore((s) => s.loadLayout);
  const createEmptyLayout = useSeatingBuilderStore((s) => s.createEmptyLayout);
  const originalLayoutId = useSeatingBuilderStore((s) => s.originalLayoutId);
  // Store starts with a default layout, so this is always true initially
  const layoutId = useSeatingBuilderStore((s) => s.layout.id);

  // Track which layout ID to fetch fully
  const [selectedLayoutId, setSelectedLayoutId] = React.useState<string | null>(null);

  // Fetch full layout data when a layout is selected
  const { data: fullLayout, isLoading: _isLoadingLayout } = useSeatingLayoutQuery(selectedLayoutId);

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

  const handleLayoutChange = useCallback((newLayoutId: string) => {
    setSelectedLayoutId(newLayoutId);
  }, []);

  const handleCreateNew = useCallback(() => {
    createEmptyLayout('New Layout');
  }, [createEmptyLayout]);

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
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Layout</InputLabel>
                <Select
                  value={originalLayoutId || (layoutId ? '__new__' : '')}
                  label="Layout"
                  onChange={(e) => {
                    if (e.target.value !== '__new__') {
                      handleLayoutChange(e.target.value);
                    }
                  }}
                >
                  {layoutId && !originalLayoutId && (
                    <MenuItem value="__new__">
                      <em>New Layout (unsaved)</em>
                    </MenuItem>
                  )}
                  {layouts?.map((layout) => (
                    <MenuItem key={layout.id} value={layout.id}>
                      {layout.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button variant="outlined" size="small" startIcon={<Add />} onClick={handleCreateNew}>
                New
              </Button>

              <Divider orientation="vertical" flexItem />

              {/* Floor tabs inline */}
              <FloorTabs />
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
    </Stack>
  );
}
