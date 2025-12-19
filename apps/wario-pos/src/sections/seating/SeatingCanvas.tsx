/**
 * SeatingCanvas - Main SVG canvas for the seating layout builder.
 *
 * Features:
 * - Pan/zoom with touch gestures
 * - dnd-kit integration for drag-and-drop
 * - Viewport culling (future: virtualization for 500+ elements)
 */

import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';

import {
  type SeatingResourceRenderModel,
  useActiveFloorId,
  useActiveSectionId,
  useSeatingBuilderStore,
} from '@/stores/useSeatingBuilderStore';

import { DraggableResource } from './components/DraggableResource';
import { GridBackground } from './components/GridBackground';
import { TableEditDialog } from './components/TableEditDialog';

// Canvas dimensions (layout units)
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const DEFAULT_GRID_SIZE = 20;

/**
 * Snap a value to the nearest grid increment
 */
function SnapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export interface SeatingCanvasProps {
  /** Whether the canvas is in read-only mode (for live status view) */
  readOnly?: boolean;
}

export function SeatingCanvas({ readOnly = false }: SeatingCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

  // State for edit dialog
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  // State for live resize preview during drag
  const [resizePreview, setResizePreview] = useState<{
    resourceId: string;
    previewWidth: number;
    previewHeight: number;
  } | null>(null);

  // Track SVG size for accurate coordinate conversion
  // Using generic resizing detection (could use ResizeObserver)
  const updateSize = useCallback(() => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setSvgSize({ width: rect.width, height: rect.height });
    }
  }, []);

  // Update size on mount and resize
  useEffect(() => {
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, [updateSize]);

  // Viewport state for pan/zoom
  // Viewport state for pan/zoom
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Calculate current scale (SVG units per screen pixel) for X and Y separately.
  // With preserveAspectRatio="none", X and Y scale independently.
  const scaleX = svgSize.width > 0 ? viewBox.width / svgSize.width : 1;
  const scaleY = svgSize.height > 0 ? viewBox.height / svgSize.height : 1;

  // Select raw data (stable references) instead of derived arrays
  const activeFloorId = useActiveFloorId();
  const activeSectionId = useActiveSectionId();
  const sectionIdsByFloorId = useSeatingBuilderStore((s) => s.layout.sectionIdsByFloorId);
  const resourceIdsBySectionId = useSeatingBuilderStore((s) => s.layout.resourceIdsBySectionId);
  const resourcesById = useSeatingBuilderStore((s) => s.layout.resourcesById);
  const selectedResourceIds = useSeatingBuilderStore((s) => s.editor.selectedResourceIds);

  // Memoize derived render models array - now renders ALL sections on active floor
  const renderModels = useMemo((): SeatingResourceRenderModel[] => {
    if (!activeFloorId) return [];

    // Get all section IDs for the active floor
    const floorSectionIds = sectionIdsByFloorId[activeFloorId] ?? [];
    const selectedSet = new Set(selectedResourceIds);

    // Collect resources from ALL sections on this floor
    return floorSectionIds.flatMap((sectionId) => {
      const resourceIds = resourceIdsBySectionId[sectionId] ?? [];
      const isActiveSection = sectionId === activeSectionId;

      return resourceIds
        .map((id) => {
          const resource = resourcesById[id];
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (!resource) return null;

          return {
            id: resource.id,
            name: resource.name,
            sectionId: resource.sectionId,
            capacity: resource.capacity,
            shape: resource.shape,
            shapeDimX: resource.shapeDimX,
            shapeDimY: resource.shapeDimY,
            disabled: resource.disabled || !isActiveSection,
            centerX: resource.centerX,
            centerY: resource.centerY,
            rotation: resource.rotation,
            isSelected: selectedSet.has(id) && isActiveSection,
            isActiveSection,
          };
        })
        .filter(Boolean) as SeatingResourceRenderModel[];
    });
  }, [activeFloorId, activeSectionId, sectionIdsByFloorId, resourceIdsBySectionId, resourcesById, selectedResourceIds]);

  const selectResources = useSeatingBuilderStore((s) => s.selectResources);
  const clearSelection = useSeatingBuilderStore((s) => s.clearSelection);
  const moveResources = useSeatingBuilderStore((s) => s.moveResources);
  const updateResource = useSeatingBuilderStore((s) => s.updateResource);
  const gridSize = useSeatingBuilderStore((s) => s.editor.gridSize);

  // Viewport state for pan/zoom

  // dnd-kit sensors with touch delay for long-press
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5, // Minimum drag distance to start
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200, // Long-press delay for touch
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Handle resource click for selection
  const handleResourceClick = useCallback(
    (id: string, shiftKey: boolean) => {
      if (readOnly) return;

      if (shiftKey) {
        // Shift+click: toggle selection (add to current)
        const current = selectedResourceIds;
        if (current.includes(id)) {
          selectResources(current.filter((rid) => rid !== id));
        } else {
          selectResources([...current, id]);
        }
      } else {
        // Regular click: replace selection
        selectResources([id]);
      }
    },
    [readOnly, selectResources, selectedResourceIds],
  );

  // Handle drag start - no selection changes here, just let the drag happen
  // Selection is handled by click events, not drag events
  const handleDragStart = useCallback((_event: DragStartEvent) => {
    // Intentionally empty - we don't want to change selection when dragging
    // This prevents conflicts between move drags and resize handle drags
  }, []);

  // Handle drag end (move or resize)
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { delta, active } = event;
      if (delta.x === 0 && delta.y === 0) return;

      // Scale delta by current zoom level (viewBox size / actual SVG size)
      const svgRect = svgRef.current?.getBoundingClientRect();
      const scaleFactorX = svgRect ? viewBox.width / svgRect.width : 1;
      const scaleFactorY = svgRect ? viewBox.height / svgRect.height : 1;

      const scaledDx = delta.x * scaleFactorX;
      const scaledDy = delta.y * scaleFactorY;

      // Check if this is a resize drag
      const dragData = active.data.current as { type?: string; resourceId?: string; handle?: string } | undefined;

      if (dragData?.type === 'resize' && dragData.resourceId && dragData.handle) {
        // Resize operation: update dimensions based on handle dragged
        const { resourceId, handle } = dragData;
        const resource = resourcesById[resourceId];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!resource) return;

        let newWidth = resource.shapeDimX;
        let newHeight = resource.shapeDimY;

        // Edge handles: single-axis resize
        // Corner handles: dual-axis resize
        // Use screen-space deltas directly since handles are at rotated positions
        switch (handle) {
          // Edge handles (single axis)
          case 't': // Top edge - height only
            newHeight = Math.max(20, resource.shapeDimY - scaledDy / 2);
            break;
          case 'b': // Bottom edge - height only
            newHeight = Math.max(20, resource.shapeDimY + scaledDy / 2);
            break;
          case 'l': // Left edge - width only
            newWidth = Math.max(20, resource.shapeDimX - scaledDx / 2);
            break;
          case 'r': // Right edge - width only
            newWidth = Math.max(20, resource.shapeDimX + scaledDx / 2);
            break;

          // Corner handles (both axes)
          case 'tl': // Top-left
            newWidth = Math.max(20, resource.shapeDimX - scaledDx / 2);
            newHeight = Math.max(20, resource.shapeDimY - scaledDy / 2);
            break;
          case 'tr': // Top-right
            newWidth = Math.max(20, resource.shapeDimX + scaledDx / 2);
            newHeight = Math.max(20, resource.shapeDimY - scaledDy / 2);
            break;
          case 'bl': // Bottom-left
            newWidth = Math.max(20, resource.shapeDimX - scaledDx / 2);
            newHeight = Math.max(20, resource.shapeDimY + scaledDy / 2);
            break;
          case 'br': // Bottom-right
            newWidth = Math.max(20, resource.shapeDimX + scaledDx / 2);
            newHeight = Math.max(20, resource.shapeDimY + scaledDy / 2);
            break;
        }

        // Max table dimension: round(1/sqrt(2), 2) * min(width, height)
        const maxDim = ((Math.round((1 / Math.sqrt(2)) * 100) / 100) * Math.min(CANVAS_WIDTH, CANVAS_HEIGHT)) / 2;

        // Snap to grid and clamp to max
        const snappedWidth = Math.min(SnapToGrid(newWidth, gridSize), maxDim);
        const snappedHeight = Math.min(SnapToGrid(newHeight, gridSize), maxDim);

        updateResource(resourceId, {
          shapeDimX: snappedWidth,
          shapeDimY: snappedHeight,
        });
      } else {
        // Standard move operation
        const snappedDx = SnapToGrid(scaledDx, gridSize);
        const snappedDy = SnapToGrid(scaledDy, gridSize);

        moveResources(selectedResourceIds, snappedDx, snappedDy);
      }

      // Clear resize preview
      setResizePreview(null);
    },
    [gridSize, selectedResourceIds, moveResources, updateResource, resourcesById, viewBox],
  );

  // Handle drag move (live resize preview)
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { delta, active } = event;
      const dragData = active.data.current as { type?: string; resourceId?: string; handle?: string } | undefined;

      // Only show preview for resize operations
      if (dragData?.type !== 'resize' || !dragData.resourceId || !dragData.handle) {
        if (resizePreview) setResizePreview(null);
        return;
      }

      const { resourceId, handle } = dragData;
      const resource = resourcesById[resourceId];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!resource) return;

      // Scale delta to SVG coordinates
      const svgRect = svgRef.current?.getBoundingClientRect();
      const scaleFactorX = svgRect ? viewBox.width / svgRect.width : 1;
      const scaleFactorY = svgRect ? viewBox.height / svgRect.height : 1;
      const scaledDx = delta.x * scaleFactorX;
      const scaledDy = delta.y * scaleFactorY;

      let newWidth = resource.shapeDimX;
      let newHeight = resource.shapeDimY;

      // Calculate preview dimensions based on handle
      // Use screen-space deltas directly since handles are at rotated positions
      switch (handle) {
        case 't':
          newHeight = Math.max(20, resource.shapeDimY - scaledDy / 2);
          break;
        case 'b':
          newHeight = Math.max(20, resource.shapeDimY + scaledDy / 2);
          break;
        case 'l':
          newWidth = Math.max(20, resource.shapeDimX - scaledDx / 2);
          break;
        case 'r':
          newWidth = Math.max(20, resource.shapeDimX + scaledDx / 2);
          break;
        case 'tl':
          newWidth = Math.max(20, resource.shapeDimX - scaledDx / 2);
          newHeight = Math.max(20, resource.shapeDimY - scaledDy / 2);
          break;
        case 'tr':
          newWidth = Math.max(20, resource.shapeDimX + scaledDx / 2);
          newHeight = Math.max(20, resource.shapeDimY - scaledDy / 2);
          break;
        case 'bl':
          newWidth = Math.max(20, resource.shapeDimX - scaledDx / 2);
          newHeight = Math.max(20, resource.shapeDimY + scaledDy / 2);
          break;
        case 'br':
          newWidth = Math.max(20, resource.shapeDimX + scaledDx / 2);
          newHeight = Math.max(20, resource.shapeDimY + scaledDy / 2);
          break;
      }

      // Max table dimension for preview
      const maxDim = ((Math.round((1 / Math.sqrt(2)) * 100) / 100) * Math.min(CANVAS_WIDTH, CANVAS_HEIGHT)) / 2;

      setResizePreview({
        resourceId,
        previewWidth: Math.min(newWidth, maxDim),
        previewHeight: Math.min(newHeight, maxDim),
      });
    },
    [resourcesById, viewBox, resizePreview],
  );

  // Handle background click (deselect)
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking directly on background, not a child
      if (e.target === e.currentTarget || (e.target as SVGElement).tagName === 'rect') {
        clearSelection();
      }
    },
    [clearSelection],
  );

  // Pan handling (2-finger on touch, middle-click on desktop)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Middle mouse button or touch with 2 fingers (handled separately)
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return;

      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;

      setViewBox((prev) => ({
        ...prev,
        x: prev.x - dx,
        y: prev.y - dy,
      }));

      panStart.current = { x: e.clientX, y: e.clientY };
    },
    [isPanning],
  );

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Wheel zoom (requires Ctrl/Cmd key to avoid capturing page scroll)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Only zoom if Ctrl (Windows/Linux) or Cmd (Mac) is held
    if (!e.ctrlKey && !e.metaKey) {
      return; // Allow normal page scrolling
    }

    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9;

    setViewBox((prev) => {
      const newWidth = prev.width * scaleFactor;
      const newHeight = prev.height * scaleFactor;

      // Limit zoom out to default canvas size (no smaller than 100% view)
      if (newWidth > CANVAS_WIDTH || newHeight > CANVAS_HEIGHT) {
        return { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
      }

      // Limit zoom in to reasonable minimum (e.g., 100 units)
      if (newWidth < 100 || newHeight < 100) {
        return prev;
      }

      // Zoom toward mouse position
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return prev;

      const mouseX = ((e.clientX - rect.left) / rect.width) * prev.width + prev.x;
      const mouseY = ((e.clientY - rect.top) / rect.height) * prev.height + prev.y;

      const newX = mouseX - (mouseX - prev.x) * scaleFactor;
      const newY = mouseY - (mouseY - prev.y) * scaleFactor;

      return { x: newX, y: newY, width: newWidth, height: newHeight };
    });
  }, []);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 400,
        overflow: 'hidden',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
      }}
    >
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`${String(viewBox.x)} ${String(viewBox.y)} ${String(viewBox.width)} ${String(viewBox.height)}`}
          preserveAspectRatio="none"
          style={{ touchAction: 'none' }}
          onClick={handleBackgroundClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
        >
          {/* Grid background */}
          <GridBackground
            gridSize={gridSize || DEFAULT_GRID_SIZE}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            visible={!readOnly}
          />

          {/* Resources layer */}
          <g id="resources-layer">
            {renderModels.map((model) => (
              <g key={model.id} className="resource-layer">
                <DraggableResource
                  model={model}
                  scaleX={scaleX}
                  scaleY={scaleY}
                  resizePreview={resizePreview?.resourceId === model.id ? resizePreview : null}
                  onClick={readOnly ? undefined : handleResourceClick}
                  onDoubleClick={
                    readOnly
                      ? undefined
                      : (id) => {
                          setEditingResourceId(id);
                        }
                  }
                />
              </g>
            ))}
          </g>
        </svg>
      </DndContext>

      {/* Table Edit Dialog */}
      <TableEditDialog
        resourceId={editingResourceId}
        open={editingResourceId !== null}
        onClose={() => {
          setEditingResourceId(null);
        }}
      />
    </Box>
  );
}
