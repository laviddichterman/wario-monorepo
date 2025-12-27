/**
 * TimelineScrubber - Slider component for scrubbing through time in the seating timeline.
 */

import { useCallback, useMemo } from 'react';

import { AccessTime, MyLocation } from '@mui/icons-material';
import { Box, IconButton, Slider, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const ScrubberContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2, 3),
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const TimeDisplay = styled(Typography)(({ theme }) => ({
  minWidth: 100,
  textAlign: 'center',
  fontWeight: 600,
  fontSize: '1.1rem',
  fontVariantNumeric: 'tabular-nums',
  color: theme.palette.text.primary,
}));

const SliderWrapper = styled(Box)({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

export interface TimelineScrubberProps {
  /** Epoch ms range */
  timeRange: { start: number; end: number };
  /** Current selected time (epoch ms) */
  value: number;
  /** Called when slider value changes */
  onChange: (time: number) => void;
  /** Optional: timestamps to show as markers */
  markers?: number[];
}

/**
 * Format epoch ms to readable time string (e.g., "2:30 PM")
 */
function formatTime(epochMs: number): string {
  const date = new Date(epochMs);
  // TODO: use DateFns instead of raw Date methods
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format epoch ms to date string (e.g., "Dec 27")
 */
function formatDate(epochMs: number): string {
  const date = new Date(epochMs);
  // TODO: use DateFns instead of raw Date methods
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function TimelineScrubber({ timeRange, value, onChange, markers = [] }: TimelineScrubberProps) {
  // Generate slider marks for start, end, and optional custom markers
  const sliderMarks = useMemo(() => {
    const marks = [
      { value: timeRange.start, label: formatTime(timeRange.start) },
      { value: timeRange.end, label: formatTime(timeRange.end) },
    ];

    // Add custom markers (reservation start times)
    for (const marker of markers) {
      if (marker > timeRange.start && marker < timeRange.end) {
        marks.push({ value: marker, label: '' });
      }
    }

    return marks;
  }, [timeRange, markers]);

  const handleSliderChange = useCallback(
    (_event: Event, newValue: number | number[]) => {
      if (typeof newValue === 'number') {
        onChange(newValue);
      }
    },
    [onChange],
  );

  const handleNowClick = useCallback(() => {
    // TODO: use server time
    const now = Date.now();
    // Clamp to time range
    const clampedNow = Math.max(timeRange.start, Math.min(timeRange.end, now));
    onChange(clampedNow);
  }, [onChange, timeRange]);

  const isNowInRange = Date.now() >= timeRange.start && Date.now() <= timeRange.end;

  return (
    <ScrubberContainer>
      <AccessTime color="action" />

      <SliderWrapper>
        <Typography variant="caption" color="text.secondary">
          {formatDate(timeRange.start)}
        </Typography>

        <Slider
          value={value}
          onChange={handleSliderChange}
          min={timeRange.start}
          max={timeRange.end}
          step={5 * 60 * 1000} // 5 minute increments
          marks={sliderMarks}
          valueLabelDisplay="off"
          sx={{
            flex: 1,
            '& .MuiSlider-mark': {
              height: 8,
              width: 2,
              backgroundColor: 'primary.main',
              opacity: 0.5,
            },
            '& .MuiSlider-markLabel': {
              fontSize: '0.7rem',
            },
          }}
        />

        <Typography variant="caption" color="text.secondary">
          {formatDate(timeRange.end)}
        </Typography>
      </SliderWrapper>

      <TimeDisplay>{formatTime(value)}</TimeDisplay>

      <Tooltip title={isNowInRange ? 'Jump to current time' : 'Current time is outside range'}>
        <span>
          <IconButton onClick={handleNowClick} disabled={!isNowInRange} color="primary" size="small">
            <MyLocation />
          </IconButton>
        </span>
      </Tooltip>
    </ScrubberContainer>
  );
}
