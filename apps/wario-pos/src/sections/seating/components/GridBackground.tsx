/**
 * GridBackground - SVG grid pattern for the seating canvas.
 *
 * Renders a dot grid pattern that helps users align tables.
 * Uses SVG pattern for efficient rendering at any scale.
 */

import { memo } from 'react';

import { useTheme } from '@mui/material/styles';

export interface GridBackgroundProps {
  /** Grid cell size in layout units */
  gridSize: number;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Whether to show the grid */
  visible?: boolean;
}

export const GridBackground = memo(function GridBackground({
  gridSize,
  width,
  height,
  visible = true,
}: GridBackgroundProps) {
  const theme = useTheme();

  if (!visible || gridSize <= 0) {
    // Still need id for lasso selection to work in selection mode
    return (
      <rect id="seating-canvas-bg" x={0} y={0} width={width} height={height} fill={theme.palette.background.default} />
    );
  }

  const patternId = `grid-pattern-${String(gridSize)}`;
  const dotColor = theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';

  return (
    <g>
      <defs>
        <pattern id={patternId} width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          {/* Grid dot at each intersection */}
          <circle cx={gridSize / 2} cy={gridSize / 2} r={1.5} fill={dotColor} />
        </pattern>
      </defs>

      {/* Background fill */}
      <rect id="seating-canvas-bg" x={0} y={0} width={width} height={height} fill={theme.palette.background.default} />

      {/* Grid pattern overlay */}
      <rect id="seating-canvas-grid" x={0} y={0} width={width} height={height} fill={`url(#${patternId})`} />
    </g>
  );
});
