/**
 * SeatingTimelineDialog - Dialog showing table occupancy timeline.
 *
 * Allows staff to scrub through time to see anticipated table occupancy.
 */

import { parseISO, startOfDay } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Close as CloseIcon } from '@mui/icons-material';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { WDateUtils } from '@wcp/wario-shared/logic';

import { useSeatingLayoutQuery, useSeatingLayoutsQuery } from '@/hooks/useSeatingLayoutQuery';
import { getTodayDateString, useTableOccupancyTimeline } from '@/hooks/useTableOccupancyTimeline';

import { TimelineScrubber } from './components/TimelineScrubber';
import { SeatingCanvas, type TableStatusMapEntry } from './SeatingCanvas';

export interface SeatingTimelineDialogProps {
  open: boolean;
  onClose: () => void;
  /** Initial date to display (YYYYMMDD format, defaults to today) */
  initialDate?: string;
}

/**
 * Parse YYYYMMDD string to Date at midnight local time.
 * TODO: instead return at the start of business day (store's operating hours)
 */
function parseISODate(dateStr: string): Date | null {
  if (dateStr.length !== 8) return null;
  const extended = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  try {
    return startOfDay(parseISO(extended));
  } catch {
    return null;
  }
}

export function SeatingTimelineDialog({ open, onClose, initialDate }: SeatingTimelineDialogProps) {
  // Date state
  const [selectedDate, setSelectedDate] = useState<string>(initialDate ?? getTodayDateString());

  // Layout selection state
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);

  // Local floor index state (no store dependency)
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);

  // Fetch layouts list
  const { data: layouts, isLoading: isLoadingLayouts } = useSeatingLayoutsQuery();

  // Fetch selected layout data
  const { data: fullLayout, isLoading: isLoadingLayout } = useSeatingLayoutQuery(selectedLayoutId);

  // Select first layout when list loads
  useEffect(() => {
    if (layouts && layouts.length > 0 && selectedLayoutId === null) {
      setSelectedLayoutId(layouts[0].id);
    }
  }, [layouts, selectedLayoutId]);

  // Get occupancy data for selected date
  const {
    occupancies,
    timeRange,
    getOccupancyAtTime,
    isLoading: isLoadingOccupancy,
  } = useTableOccupancyTimeline({
    date: selectedDate,
  });

  // Current timeline position - initialize to start of operating hours
  const [currentTime, setCurrentTime] = useState<number>(() => timeRange.start);

  // Reset timeline to start of operating hours when date/range changes
  useEffect(() => {
    setCurrentTime(timeRange.start);
  }, [timeRange.start]);

  // Compute table status map at current time
  const tableStatusMap = useMemo((): Record<string, TableStatusMapEntry> => {
    const map = getOccupancyAtTime(currentTime);
    const result: Record<string, TableStatusMapEntry> = {};
    for (const [tableId, entry] of map) {
      result[tableId] = entry;
    }
    return result;
  }, [getOccupancyAtTime, currentTime]);

  // Get markers (reservation start times) for the scrubber
  const markers = useMemo(() => occupancies.map((o) => o.startTime), [occupancies]);

  // Handle date picker change
  const handleDateChange = useCallback((date: Date | null) => {
    if (date) {
      setSelectedDate(WDateUtils.formatISODate(date));
    }
  }, []);

  // Convert selectedDate to Date object for DatePicker
  const datePickerValue = useMemo(() => {
    const parsed = parseISODate(selectedDate);
    return parsed ?? new Date();
  }, [selectedDate]);

  const isLoading = isLoadingLayouts || isLoadingLayout || isLoadingOccupancy;

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleLayoutChange = useCallback((layoutId: string) => {
    setSelectedLayoutId(layoutId);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: '80vh',
            maxHeight: 800,
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Header */}
      <Paper
        square
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ mr: 1 }}>
            Seating Timeline
          </Typography>

          {/* Date Picker */}
          <DatePicker
            value={datePickerValue}
            onChange={handleDateChange}
            format="EEE, MMM d, yyyy"
            slotProps={{
              textField: {
                size: 'small',
                sx: { width: 220 },
              },
            }}
          />

          {/* Layout Selector */}
          {layouts && layouts.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Layout</InputLabel>
              <Select
                value={selectedLayoutId ?? ''}
                label="Layout"
                onChange={(e) => {
                  handleLayoutChange(e.target.value);
                }}
              >
                {layouts.map((l) => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Floor Selector */}
          {fullLayout && fullLayout.floors.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Floor</InputLabel>
              <Select
                value={activeFloorIndex}
                label="Floor"
                onChange={(e) => {
                  setActiveFloorIndex(e.target.value);
                }}
              >
                {fullLayout.floors.map((floor, idx) => (
                  <MenuItem key={floor.id} value={idx}>
                    {floor.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>

        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </Paper>

      {/* Content */}
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 0, overflow: 'hidden', flex: 1 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Canvas */}
            <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <SeatingCanvas
                mode="readonly"
                layout={fullLayout}
                activeFloorIndex={activeFloorIndex}
                tableStatusMap={tableStatusMap}
              />

              {/* Occupancy count badge */}
              <Paper
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  px: 1.5,
                  py: 0.5,
                  bgcolor: 'background.paper',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {Object.keys(tableStatusMap).length} occupied
                </Typography>
              </Paper>
            </Box>

            {/* Timeline Scrubber */}
            <TimelineScrubber timeRange={timeRange} value={currentTime} onChange={setCurrentTime} markers={markers} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
