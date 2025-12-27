/**
 * DraggableResource - Smart wrapper component for draggable tables.
 *
 * Connects the dumb TableVisual to:
 * - Zustand store for resource data
 * - dnd-kit for drag interactions
 * - Touch-friendly long-press activation
 */

import { useDraggable } from '@dnd-kit/core';
import { type CSSProperties, memo, useCallback } from 'react';

import { type SeatingResourceRenderModel, useSeatingBuilderStore } from '@/stores/useSeatingBuilderStore';

import { ResizeHandles } from './ResizeHandles';
import { TableVisual } from './TableVisual';

export type SeatingCanvasMode = 'builder' | 'readonly' | 'selection';

export interface ResizePreview {
  resourceId: string;
  previewWidth: number;
  previewHeight: number;
}

export interface DraggableResourceProps {
  /** Resource render model from the store */
  model: SeatingResourceRenderModel;
  /** Canvas interaction mode */
  mode?: SeatingCanvasMode;
  /** X-axis scale factor (SVG units per screen pixel) */
  scaleX: number;
  /** Y-axis scale factor (SVG units per screen pixel) */
  scaleY: number;
  /** Live resize preview during drag (from SeatingCanvas) */
  resizePreview?: ResizePreview | null;
  /** Clamped delta for visual feedback during drag (keeps resource within canvas bounds) */
  clampedDelta?: { dx: number; dy: number } | null;
  /** Click handler for selection */
  onClick?: (id: string, shiftKey: boolean) => void;
  /** Double-click handler for edit dialog */
  onDoubleClick?: (id: string) => void;
  /** Status color for live table view (e.g., green=seated, yellow=waiting) */
  statusColor?: string;
}

export const DraggableResource = memo(function DraggableResource({
  model,
  mode = 'builder',
  scaleX,
  scaleY,
  resizePreview,
  clampedDelta,
  onClick,
  onDoubleClick,
  statusColor,
}: DraggableResourceProps) {
  const interactionMode = useSeatingBuilderStore((s) => s.interactionMode);

  // Disable dragging in selection/readonly mode, or when not in SELECT interaction mode
  const isDragDisabled = mode !== 'builder' || interactionMode !== 'SELECT' || !model.isActiveSection;

  // dnd-kit draggable setup with long-press activation for touch
  // Disable dragging for non-active section tables or when not in builder mode
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: model.id,
    data: { type: 'resource', model },
    disabled: isDragDisabled,
  });

  // Wrapper for setNodeRef that accepts SVGGElement
  // dnd-kit's setNodeRef accepts HTMLElement | null, but SVG elements work in practice
  const handleRef = useCallback(
    (element: SVGGElement | null) => {
      setNodeRef(element as unknown as HTMLElement | null);
    },
    [setNodeRef],
  );

  // Compute drag-adjusted position in SVG coordinates
  // The transform values from dnd-kit are in screen pixels.
  // scaleX/scaleY = SVG units per screen pixel, so we MULTIPLY to convert.
  // If clampedDelta is provided, use it instead for visual clamping at canvas edges.
  const rawDx = (transform?.x ?? 0) * scaleX;
  const rawDy = (transform?.y ?? 0) * scaleY;
  const adjustedX = model.centerX + (clampedDelta ? clampedDelta.dx : rawDx);
  const adjustedY = model.centerY + (clampedDelta ? clampedDelta.dy : rawDy);

  // Use preview dimensions if resizing, otherwise use model dimensions
  const displayWidth = resizePreview ? resizePreview.previewWidth : model.shapeDimX;
  const displayHeight = resizePreview ? resizePreview.previewHeight : model.shapeDimY;

  // Style for visual feedback during drag (no CSS transform - that's handled in SVG transform)
  // Non-active section tables have reduced opacity and default cursor
  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : model.isActiveSection ? 1 : 0.4,
    cursor: !model.isActiveSection
      ? 'default'
      : isDragging
        ? 'grabbing'
        : interactionMode === 'SELECT'
          ? 'grab'
          : 'default',
    pointerEvents: model.isActiveSection ? 'auto' : 'none',
  };

  // Handle click for selection (distinguish from drag start)
  // Disabled for non-active section tables
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (onClick && !isDragging && model.isActiveSection) {
        onClick(model.id, e.shiftKey);
      }
    },
    [onClick, model.id, isDragging, model.isActiveSection],
  );

  // Handle double-click for edit dialog
  // Disabled for non-active section tables
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onDoubleClick && !isDragging && model.isActiveSection) {
        onDoubleClick(model.id);
      }
    },
    [onDoubleClick, model.id, isDragging, model.isActiveSection],
  );

  // Fixed font size for readability
  const fontSize = 14;

  return (
    <>
      {/* Rotated group for the table shape only */}
      <g
        ref={handleRef}
        style={style}
        transform={`translate(${String(adjustedX)}, ${String(adjustedY)}) rotate(${String(model.rotation)})`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        {...attributes}
      >
        {/* Table visual with drag listeners - only the table shape triggers drag */}
        <g {...listeners}>
          <TableVisual
            shape={model.shape}
            shapeDimX={displayWidth}
            shapeDimY={displayHeight}
            mode={mode}
            isSelected={model.isSelected}
            disabled={model.disabled}
            statusColor={statusColor}
          />
        </g>
      </g>

      {/* Resize handles rendered outside rotation - axis-aligned - only in builder mode */}
      {mode === 'builder' && model.isSelected && (
        <ResizeHandles
          resourceId={model.id}
          width={displayWidth}
          height={displayHeight}
          rotation={model.rotation}
          centerX={adjustedX}
          centerY={adjustedY}
          scaleX={scaleX}
          scaleY={scaleY}
        />
      )}

      {/* Text rendered outside rotation - stays upright */}
      <g transform={`translate(${String(adjustedX)}, ${String(adjustedY)})`} style={{ pointerEvents: 'none' }}>
        {/* Label */}
        <text
          x={0}
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          y={model.capacity !== undefined ? -fontSize * 0.3 : 0}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fontSize}
          fontWeight={600}
          fill={model.disabled ? '#9e9e9e' : '#212121'}
          style={{ userSelect: 'none' }}
        >
          {model.name}
        </text>
        {/* Capacity */}
        {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
        {model.capacity !== undefined && (
          <text
            x={0}
            y={fontSize * 0.6}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fontSize * 0.7}
            fill="#757575"
            style={{ userSelect: 'none' }}
          >
            {model.capacity}p
          </text>
        )}
      </g>
    </>
  );
});
