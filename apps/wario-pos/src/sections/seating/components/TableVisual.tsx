/**
 * TableVisual - "Dumb" presentational SVG component for rendering table shapes.
 *
 * This component is intentionally pure and state-free for reuse across:
 * - Seating builder (editor)
 * - Live table status view
 * - Print layouts
 */

import { memo } from 'react';

import { useTheme } from '@mui/material/styles';

import { SeatingShape } from '@wcp/wario-shared/types';

export type SeatingCanvasMode = 'builder' | 'readonly' | 'selection';

export interface TableVisualProps {
  /** Table shape: 'RECTANGLE' or 'ELLIPSE' */
  shape: SeatingShape;
  /** Half-width for rect, x-radius for ellipse (in layout units) */
  shapeDimX: number;
  /** Half-height for rect, y-radius for ellipse (in layout units) */
  shapeDimY: number;
  /** Canvas mode - controls whether selection handles are shown */
  mode?: SeatingCanvasMode;
  /** Fill color (defaults to theme surface) */
  fill?: string;
  /** Stroke color (defaults to theme outline) */
  stroke?: string;
  /** Whether this table is currently selected */
  isSelected?: boolean;
  /** Whether this table is currently disabled */
  disabled?: boolean;
  /** Allocation status color (for live view: green=available, red=occupied, etc.) */
  statusColor?: string;
}

/**
 * Renders a table shape as SVG.
 * Dimensions are specified as half-sizes (centerX ± shapeDimX, centerY ± shapeDimY).
 * The component renders at origin (0,0) - parent <g> should apply translation.
 */
export const TableVisual = memo(function TableVisual({
  shape,
  shapeDimX,
  shapeDimY,
  mode = 'builder',
  fill,
  stroke,
  isSelected = false,
  statusColor,
  disabled = false,
}: TableVisualProps) {
  const theme = useTheme();

  // Colors
  const baseFill = disabled ? theme.palette.action.disabledBackground : (fill ?? theme.palette.background.paper);
  const baseStroke = disabled ? theme.palette.action.disabled : (stroke ?? theme.palette.divider);
  const selectedStroke = theme.palette.primary.main;
  const selectedFill = theme.palette.primary.light + '40'; // 25% opacity primary color
  const selectedStrokeWidth = 3;
  const normalStrokeWidth = 1.5;

  // Determine fill color priority: selection > status > base
  // statusColor provides occupancy visualization in timeline/assignment views
  const statusFill = statusColor ? statusColor + '60' : null; // 37% opacity for status
  const currentFill = isSelected ? selectedFill : (statusFill ?? baseFill);
  const currentStroke = isSelected ? selectedStroke : (statusColor ?? baseStroke);
  const currentStrokeWidth = isSelected ? selectedStrokeWidth : normalStrokeWidth;

  // Full dimensions
  const width = shapeDimX * 2;
  const height = shapeDimY * 2;

  const isRectangle = shape === SeatingShape.RECTANGLE;

  return (
    <g>
      {/* Main shape */}
      {isRectangle ? (
        <rect
          x={-shapeDimX}
          y={-shapeDimY}
          width={width}
          height={height}
          rx={4}
          ry={4}
          fill={currentFill}
          stroke={currentStroke}
          strokeWidth={currentStrokeWidth}
          style={{ transition: 'fill 0.15s, stroke 0.15s, stroke-width 0.15s' }}
        />
      ) : (
        <ellipse
          cx={0}
          cy={0}
          rx={shapeDimX}
          ry={shapeDimY}
          fill={currentFill}
          stroke={currentStroke}
          strokeWidth={currentStrokeWidth}
          style={{ transition: 'fill 0.15s, stroke 0.15s, stroke-width 0.15s' }}
        />
      )}

      {/* Selection handles - only shown in builder mode */}
      {mode === 'builder' && isSelected && (
        <>
          {/* Corner handles */}
          <circle cx={-shapeDimX} cy={-shapeDimY} r={4} fill={selectedStroke} />
          <circle cx={shapeDimX} cy={-shapeDimY} r={4} fill={selectedStroke} />
          <circle cx={-shapeDimX} cy={shapeDimY} r={4} fill={selectedStroke} />
          <circle cx={shapeDimX} cy={shapeDimY} r={4} fill={selectedStroke} />
        </>
      )}
    </g>
  );
});
