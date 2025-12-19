/**
 * Bounding box utilities for the Seating Layout Builder.
 *
 * Provides functions to calculate axis-aligned bounding boxes for rotated shapes
 * and clamp positions to keep resources within canvas bounds.
 *
 * @module bounding-utils
 */

import { SeatingShape } from '@wcp/wario-shared/types';

// Canvas dimensions (must match SeatingCanvas.tsx)
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

/**
 * Axis-aligned bounding box with min/max coordinates.
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Minimal resource info needed for bounding box calculation.
 */
export interface ResourceBounds {
  centerX: number;
  centerY: number;
  shapeDimX: number; // half-width
  shapeDimY: number; // half-height
  rotation: number; // degrees
  shape: SeatingShape;
}

/**
 * Calculate the axis-aligned bounding box for a rotated shape.
 *
 * For rectangles: Rotates the 4 corners and takes min/max of coordinates.
 * For ellipses: Uses the analytical formula for a rotated ellipse's bounding box,
 * which produces a tighter fit than treating it as a rectangle.
 *
 * @param resource - The resource to calculate bounds for
 * @returns The axis-aligned bounding box
 */
export function getRotatedBoundingBox(resource: ResourceBounds): BoundingBox {
  const { centerX, centerY, shapeDimX, shapeDimY, rotation, shape } = resource;
  const rotationRad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);

  let halfWidth: number;
  let halfHeight: number;

  if (shape === SeatingShape.ELLIPSE) {
    // Ellipse: Use analytical formula for rotated ellipse bounding box
    // halfWidth = sqrt(a² × cos²θ + b² × sin²θ)
    // halfHeight = sqrt(a² × sin²θ + b² × cos²θ)
    const a = shapeDimX;
    const b = shapeDimY;
    const cos2 = cos * cos;
    const sin2 = sin * sin;

    halfWidth = Math.sqrt(a * a * cos2 + b * b * sin2);
    halfHeight = Math.sqrt(a * a * sin2 + b * b * cos2);
  } else {
    // Rectangle: Rotate the 4 corners, take min/max
    const corners = [
      { x: -shapeDimX, y: -shapeDimY },
      { x: shapeDimX, y: -shapeDimY },
      { x: shapeDimX, y: shapeDimY },
      { x: -shapeDimX, y: shapeDimY },
    ];

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const corner of corners) {
      const rotatedX = corner.x * cos - corner.y * sin;
      const rotatedY = corner.x * sin + corner.y * cos;
      minX = Math.min(minX, rotatedX);
      maxX = Math.max(maxX, rotatedX);
      minY = Math.min(minY, rotatedY);
      maxY = Math.max(maxY, rotatedY);
    }

    halfWidth = (maxX - minX) / 2;
    halfHeight = (maxY - minY) / 2;
  }

  return {
    minX: centerX - halfWidth,
    minY: centerY - halfHeight,
    maxX: centerX + halfWidth,
    maxY: centerY + halfHeight,
  };
}

/**
 * Calculate the combined bounding box for multiple resources.
 * Returns the union (min of all minX/minY, max of all maxX/maxY).
 *
 * @param resources - Array of resources to calculate combined bounds for
 * @returns The combined axis-aligned bounding box
 */
export function getCombinedBoundingBox(resources: ResourceBounds[]): BoundingBox {
  if (resources.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let combinedMinX = Infinity;
  let combinedMinY = Infinity;
  let combinedMaxX = -Infinity;
  let combinedMaxY = -Infinity;

  for (const resource of resources) {
    const box = getRotatedBoundingBox(resource);
    combinedMinX = Math.min(combinedMinX, box.minX);
    combinedMinY = Math.min(combinedMinY, box.minY);
    combinedMaxX = Math.max(combinedMaxX, box.maxX);
    combinedMaxY = Math.max(combinedMaxY, box.maxY);
  }

  return {
    minX: combinedMinX,
    minY: combinedMinY,
    maxX: combinedMaxX,
    maxY: combinedMaxY,
  };
}

/**
 * Clamp a center point to ensure the resource's bounding box stays within canvas bounds.
 *
 * @param resource - Resource with proposed center point
 * @param canvasWidth - Canvas width (default: CANVAS_WIDTH)
 * @param canvasHeight - Canvas height (default: CANVAS_HEIGHT)
 * @returns The clamped center point { x, y }
 */
export function clampCenterToCanvas(
  resource: ResourceBounds,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT,
): { x: number; y: number } {
  const box = getRotatedBoundingBox(resource);

  // Calculate how much the bounding box extends from center
  const extentLeft = resource.centerX - box.minX;
  const extentRight = box.maxX - resource.centerX;
  const extentTop = resource.centerY - box.minY;
  const extentBottom = box.maxY - resource.centerY;

  // Clamp center so bounding box stays within [0, canvasWidth] x [0, canvasHeight]
  let clampedX = resource.centerX;
  let clampedY = resource.centerY;

  // Left boundary: minX >= 0 → centerX >= extentLeft
  if (clampedX - extentLeft < 0) {
    clampedX = extentLeft;
  }
  // Right boundary: maxX <= canvasWidth → centerX <= canvasWidth - extentRight
  if (clampedX + extentRight > canvasWidth) {
    clampedX = canvasWidth - extentRight;
  }
  // Top boundary: minY >= 0 → centerY >= extentTop
  if (clampedY - extentTop < 0) {
    clampedY = extentTop;
  }
  // Bottom boundary: maxY <= canvasHeight → centerY <= canvasHeight - extentBottom
  if (clampedY + extentBottom > canvasHeight) {
    clampedY = canvasHeight - extentBottom;
  }

  return { x: clampedX, y: clampedY };
}

/**
 * Clamp a proposed delta (dx, dy) to ensure a group of resources stays within canvas bounds.
 *
 * Computes the combined bounding box of all resources, applies the delta,
 * and returns a clamped delta that keeps the entire group within bounds.
 *
 * @param resources - Array of resources to move together
 * @param dx - Proposed X delta
 * @param dy - Proposed Y delta
 * @param canvasWidth - Canvas width (default: CANVAS_WIDTH)
 * @param canvasHeight - Canvas height (default: CANVAS_HEIGHT)
 * @returns The clamped delta { dx, dy }
 */
export function clampDeltaForGroup(
  resources: ResourceBounds[],
  dx: number,
  dy: number,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT,
): { dx: number; dy: number } {
  if (resources.length === 0) {
    return { dx, dy };
  }

  // Get combined bounding box of all resources at their current positions
  const combinedBox = getCombinedBoundingBox(resources);

  // Calculate proposed new bounding box position
  const newMinX = combinedBox.minX + dx;
  const newMaxX = combinedBox.maxX + dx;
  const newMinY = combinedBox.minY + dy;
  const newMaxY = combinedBox.maxY + dy;

  // Clamp the delta
  let clampedDx = dx;
  let clampedDy = dy;

  // Left boundary: newMinX >= 0
  if (newMinX < 0) {
    clampedDx = dx - newMinX; // Add the amount we went past
  }
  // Right boundary: newMaxX <= canvasWidth
  if (newMaxX > canvasWidth) {
    clampedDx = dx - (newMaxX - canvasWidth); // Subtract the amount we went past
  }
  // Top boundary: newMinY >= 0
  if (newMinY < 0) {
    clampedDy = dy - newMinY;
  }
  // Bottom boundary: newMaxY <= canvasHeight
  if (newMaxY > canvasHeight) {
    clampedDy = dy - (newMaxY - canvasHeight);
  }

  return { dx: clampedDx, dy: clampedDy };
}

/**
 * Clamp resize dimensions to ensure the resource's bounding box stays within canvas bounds.
 *
 * Given a resource's current position and proposed new dimensions, calculates the maximum
 * dimensions that keep the bounding box within canvas bounds.
 *
 * @param resource - Resource with current center, rotation, and shape
 * @param proposedWidth - Proposed new half-width (shapeDimX)
 * @param proposedHeight - Proposed new half-height (shapeDimY)
 * @param canvasWidth - Canvas width (default: CANVAS_WIDTH)
 * @param canvasHeight - Canvas height (default: CANVAS_HEIGHT)
 * @returns The clamped dimensions { width, height }
 */
export function clampResizeDimensions(
  resource: ResourceBounds,
  proposedWidth: number,
  proposedHeight: number,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT,
): { width: number; height: number } {
  // Create a test resource with proposed dimensions
  const testResource: ResourceBounds = {
    ...resource,
    shapeDimX: proposedWidth,
    shapeDimY: proposedHeight,
  };

  // Get bounding box with proposed dimensions
  const box = getRotatedBoundingBox(testResource);

  // Check if bounding box exceeds canvas bounds
  const exceedsLeft = box.minX < 0;
  const exceedsRight = box.maxX > canvasWidth;
  const exceedsTop = box.minY < 0;
  const exceedsBottom = box.maxY > canvasHeight;

  // If no bounds exceeded, return proposed dimensions
  if (!exceedsLeft && !exceedsRight && !exceedsTop && !exceedsBottom) {
    return { width: proposedWidth, height: proposedHeight };
  }

  // Calculate maximum allowed dimensions based on center position and rotation
  // For a shape centered at (cx, cy), the max half-extent in each direction is limited
  // by the distance to the corresponding edge

  const rotationRad = (resource.rotation * Math.PI) / 180;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  const absCos = Math.abs(cos);
  const absSin = Math.abs(sin);

  // Distance from center to each edge
  const distLeft = resource.centerX;
  const distRight = canvasWidth - resource.centerX;
  const distTop = resource.centerY;
  const distBottom = canvasHeight - resource.centerY;

  let clampedWidth = proposedWidth;
  let clampedHeight = proposedHeight;

  if (resource.shape === SeatingShape.ELLIPSE) {
    // For ellipse, bounding box half-extents are:
    // halfWidth = sqrt(a² × cos² + b² × sin²)
    // halfHeight = sqrt(a² × sin² + b² × cos²)
    //
    // We need to solve for max a (width) and b (height) such that:
    // sqrt(a² × cos² + b² × sin²) <= min(distLeft, distRight)
    // sqrt(a² × sin² + b² × cos²) <= min(distTop, distBottom)
    //
    // This is complex to solve analytically, so we use binary search
    const maxHorizExtent = Math.min(distLeft, distRight);
    const maxVertExtent = Math.min(distTop, distBottom);

    // Binary search to find max valid dimensions
    let lo = 0;
    let hi = Math.max(proposedWidth, proposedHeight);
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      const scaleFactor = mid / Math.max(proposedWidth, proposedHeight);
      const testW = proposedWidth * scaleFactor;
      const testH = proposedHeight * scaleFactor;

      const hExtent = Math.sqrt(testW * testW * absCos * absCos + testH * testH * absSin * absSin);
      const vExtent = Math.sqrt(testW * testW * absSin * absSin + testH * testH * absCos * absCos);

      if (hExtent <= maxHorizExtent && vExtent <= maxVertExtent) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    const finalScale = lo / Math.max(proposedWidth, proposedHeight);
    clampedWidth = Math.max(20, proposedWidth * finalScale);
    clampedHeight = Math.max(20, proposedHeight * finalScale);
  } else {
    // For rectangle, use simpler approach
    // The bounding box half-extents are:
    // halfWidth = |w × cos| + |h × sin|
    // halfHeight = |w × sin| + |h × cos|
    //
    // We scale uniformly to fit within bounds
    const maxHorizExtent = Math.min(distLeft, distRight);
    const maxVertExtent = Math.min(distTop, distBottom);

    const horizExtent = proposedWidth * absCos + proposedHeight * absSin;
    const vertExtent = proposedWidth * absSin + proposedHeight * absCos;

    const horizScale = horizExtent > 0 ? maxHorizExtent / horizExtent : 1;
    const vertScale = vertExtent > 0 ? maxVertExtent / vertExtent : 1;
    const scale = Math.min(1, horizScale, vertScale);

    clampedWidth = Math.max(20, proposedWidth * scale);
    clampedHeight = Math.max(20, proposedHeight * scale);
  }

  return { width: clampedWidth, height: clampedHeight };
}

