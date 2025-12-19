/**
 * ResizeHandles - SVG component for corner and edge resize anchors on selected tables.
 *
 * Renders 4 corner handles + 4 edge handles for resizing.
 * Handles are positioned at the actual rotated corners/edges of the table shape,
 * transformed to global coordinates.
 */

import { useDraggable } from '@dnd-kit/core';
import { memo, useCallback, useMemo } from 'react';

const HANDLE_RADIUS = 6;
const HANDLE_FILL = '#007AFF';
const HANDLE_STROKE = '#fff';

interface ResizeHandleData {
  id: string;
  x: number;
  y: number;
  cursor: string;
}

interface ResizeHandleProps {
  handle: ResizeHandleData;
  resourceId: string;
  /** X-axis scale factor (layout units per screen pixel) */
  scaleX: number;
  /** Y-axis scale factor (layout units per screen pixel) */
  scaleY: number;
}

/**
 * Individual resize handle (corner or edge).
 */
const ResizeHandle = memo(function ResizeHandle({ handle, resourceId, scaleX, scaleY }: ResizeHandleProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `resize-${resourceId}-${handle.id}`,
    data: { type: 'resize', resourceId, handle: handle.id },
  });

  // Wrapper for setNodeRef that accepts SVGCircleElement
  const handleRef = useCallback(
    (element: SVGCircleElement | null) => {
      setNodeRef(element as unknown as HTMLElement | null);
    },
    [setNodeRef],
  );

  // Convert drag offset from screen pixels to SVG coordinates
  const dragX = (transform?.x ?? 0) * scaleX;
  const dragY = (transform?.y ?? 0) * scaleY;

  // Calculate visual position (handle position + scaled drag offset)
  const visualX = handle.x + dragX;
  const visualY = handle.y + dragY;

  return (
    <circle
      ref={handleRef}
      cx={visualX}
      cy={visualY}
      r={HANDLE_RADIUS}
      fill={isDragging ? '#fff' : HANDLE_FILL}
      stroke={HANDLE_STROKE}
      strokeWidth={2}
      style={{ cursor: handle.cursor }}
      onClick={(e) => {
        e.stopPropagation();
      }}
      {...listeners}
      {...attributes}
    />
  );
});

export interface ResizeHandlesProps {
  /** ID of the resource being resized */
  resourceId: string;
  /** Width of the table (shapeDimX - half-width) */
  width: number;
  /** Height of the table (shapeDimY - half-height) */
  height: number;
  /** Rotation angle in degrees */
  rotation: number;
  /** Center X position of the table */
  centerX: number;
  /** Center Y position of the table */
  centerY: number;
  /** X-axis scale factor (layout units per screen pixel) */
  scaleX: number;
  /** Y-axis scale factor (layout units per screen pixel) */
  scaleY: number;
}

/**
 * Transform a local point (relative to table center) to global coordinates.
 */
function transformPoint(
  localX: number,
  localY: number,
  centerX: number,
  centerY: number,
  rotationDeg: number,
): { x: number; y: number } {
  const rotationRad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);

  // Rotate local point then translate to center
  return {
    x: centerX + localX * cos - localY * sin,
    y: centerY + localX * sin + localY * cos,
  };
}

/**
 * ResizeHandles - Renders 4 corner + 4 edge handles for resizing a selected table.
 * Handles are positioned at the actual rotated corners/edges of the table.
 */
export const ResizeHandles = memo(function ResizeHandles({
  resourceId,
  width,
  height,
  rotation,
  centerX,
  centerY,
  scaleX,
  scaleY,
}: ResizeHandlesProps) {
  // Compute handle positions by transforming local corners/edges to global coordinates
  const handles = useMemo(() => {
    // Local corner positions (relative to table center)
    const localCorners = [
      { id: 'tl', x: -width, y: -height },
      { id: 'tr', x: width, y: -height },
      { id: 'bl', x: -width, y: height },
      { id: 'br', x: width, y: height },
    ];

    // Local edge midpoints
    const localEdges = [
      { id: 't', x: 0, y: -height },
      { id: 'r', x: width, y: 0 },
      { id: 'b', x: 0, y: height },
      { id: 'l', x: -width, y: 0 },
    ];

    // Transform all points to global coordinates
    const allHandles: ResizeHandleData[] = [];

    for (const corner of localCorners) {
      const global = transformPoint(corner.x, corner.y, centerX, centerY, rotation);
      // Determine cursor based on handle id (stays consistent regardless of rotation)
      let cursor = 'nwse-resize';
      if (corner.id === 'tr' || corner.id === 'bl') cursor = 'nesw-resize';
      allHandles.push({ id: corner.id, x: global.x, y: global.y, cursor });
    }

    for (const edge of localEdges) {
      const global = transformPoint(edge.x, edge.y, centerX, centerY, rotation);
      // Cursor depends on edge orientation in local space
      const cursor = edge.id === 't' || edge.id === 'b' ? 'ns-resize' : 'ew-resize';
      allHandles.push({ id: edge.id, x: global.x, y: global.y, cursor });
    }

    return allHandles;
  }, [width, height, rotation, centerX, centerY]);

  return (
    <g className="resize-handles">
      {handles.map((handle) => (
        <ResizeHandle key={handle.id} handle={handle} resourceId={resourceId} scaleX={scaleX} scaleY={scaleY} />
      ))}
    </g>
  );
});
