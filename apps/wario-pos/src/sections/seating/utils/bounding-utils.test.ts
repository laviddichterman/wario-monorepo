/**
 * Unit tests for bounding-utils.ts
 *
 * Tests the shape-aware bounding box calculation and clamping functions
 * used for grid boundary constraints in the Seating Layout Builder.
 */

import { describe, expect, it } from 'vitest';

import { SeatingShape } from '@wcp/wario-shared/types';

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  clampCenterToCanvas,
  clampDeltaForGroup,
  clampResizeDimensions,
  getCombinedBoundingBox,
  getRotatedBoundingBox,
  type ResourceBounds,
} from './bounding-utils';

describe('bounding-utils', () => {
  describe('getRotatedBoundingBox', () => {
    describe('Rectangle', () => {
      it('should return axis-aligned box for 0° rotation', () => {
        const resource: ResourceBounds = {
          centerX: 100,
          centerY: 100,
          shapeDimX: 40, // half-width
          shapeDimY: 20, // half-height
          rotation: 0,
          shape: SeatingShape.RECTANGLE,
        };

        const box = getRotatedBoundingBox(resource);

        expect(box.minX).toBe(60); // 100 - 40
        expect(box.maxX).toBe(140); // 100 + 40
        expect(box.minY).toBe(80); // 100 - 20
        expect(box.maxY).toBe(120); // 100 + 20
      });

      it('should expand bounding box for 45° rotation', () => {
        const resource: ResourceBounds = {
          centerX: 100,
          centerY: 100,
          shapeDimX: 40,
          shapeDimY: 40, // square for easier math
          rotation: 45,
          shape: SeatingShape.RECTANGLE,
        };

        const box = getRotatedBoundingBox(resource);

        // For a 45° rotated square, diagonal = side * sqrt(2)
        // Half-diagonal = 40 * sqrt(2) ≈ 56.57
        const halfDiagonal = 40 * Math.sqrt(2);
        expect(box.minX).toBeCloseTo(100 - halfDiagonal, 2);
        expect(box.maxX).toBeCloseTo(100 + halfDiagonal, 2);
        expect(box.minY).toBeCloseTo(100 - halfDiagonal, 2);
        expect(box.maxY).toBeCloseTo(100 + halfDiagonal, 2);
      });

      it('should swap dimensions for 90° rotation', () => {
        const resource: ResourceBounds = {
          centerX: 100,
          centerY: 100,
          shapeDimX: 40, // half-width
          shapeDimY: 20, // half-height
          rotation: 90,
          shape: SeatingShape.RECTANGLE,
        };

        const box = getRotatedBoundingBox(resource);

        // After 90° rotation, width and height swap
        expect(box.minX).toBeCloseTo(100 - 20, 2);
        expect(box.maxX).toBeCloseTo(100 + 20, 2);
        expect(box.minY).toBeCloseTo(100 - 40, 2);
        expect(box.maxY).toBeCloseTo(100 + 40, 2);
      });
    });

    describe('Ellipse', () => {
      it('should return axis-aligned box for 0° rotation (same as rectangle)', () => {
        const resource: ResourceBounds = {
          centerX: 100,
          centerY: 100,
          shapeDimX: 40,
          shapeDimY: 20,
          rotation: 0,
          shape: SeatingShape.ELLIPSE,
        };

        const box = getRotatedBoundingBox(resource);

        expect(box.minX).toBe(60); // 100 - 40
        expect(box.maxX).toBe(140); // 100 + 40
        expect(box.minY).toBe(80); // 100 - 20
        expect(box.maxY).toBe(120); // 100 + 20
      });

      it('should have tighter bounding box at 45° than rectangle', () => {
        const ellipse: ResourceBounds = {
          centerX: 100,
          centerY: 100,
          shapeDimX: 60, // semi-major axis
          shapeDimY: 30, // semi-minor axis
          rotation: 45,
          shape: SeatingShape.ELLIPSE,
        };

        const rectangle: ResourceBounds = {
          ...ellipse,
          shape: SeatingShape.RECTANGLE,
        };

        const ellipseBox = getRotatedBoundingBox(ellipse);
        const rectangleBox = getRotatedBoundingBox(rectangle);

        // Ellipse bounding box should be tighter (smaller)
        const ellipseWidth = ellipseBox.maxX - ellipseBox.minX;
        const rectangleWidth = rectangleBox.maxX - rectangleBox.minX;

        expect(ellipseWidth).toBeLessThan(rectangleWidth);
      });

      it('should have unchanged bounding box for a circle at any rotation', () => {
        const circle: ResourceBounds = {
          centerX: 100,
          centerY: 100,
          shapeDimX: 30, // equal semi-axes = circle
          shapeDimY: 30,
          rotation: 0,
          shape: SeatingShape.ELLIPSE,
        };

        const box0 = getRotatedBoundingBox({ ...circle, rotation: 0 });
        const box45 = getRotatedBoundingBox({ ...circle, rotation: 45 });
        const box90 = getRotatedBoundingBox({ ...circle, rotation: 90 });

        // All bounding boxes should be identical for a circle
        expect(box0.minX).toBeCloseTo(box45.minX, 5);
        expect(box0.maxX).toBeCloseTo(box45.maxX, 5);
        expect(box0.minX).toBeCloseTo(box90.minX, 5);
        expect(box0.maxX).toBeCloseTo(box90.maxX, 5);
      });
    });
  });

  describe('getCombinedBoundingBox', () => {
    it('should return empty box for empty array', () => {
      const box = getCombinedBoundingBox([]);

      expect(box.minX).toBe(0);
      expect(box.minY).toBe(0);
      expect(box.maxX).toBe(0);
      expect(box.maxY).toBe(0);
    });

    it('should return same box as getRotatedBoundingBox for single resource', () => {
      const resource: ResourceBounds = {
        centerX: 100,
        centerY: 100,
        shapeDimX: 40,
        shapeDimY: 20,
        rotation: 0,
        shape: SeatingShape.RECTANGLE,
      };

      const combined = getCombinedBoundingBox([resource]);
      const single = getRotatedBoundingBox(resource);

      expect(combined.minX).toBe(single.minX);
      expect(combined.minY).toBe(single.minY);
      expect(combined.maxX).toBe(single.maxX);
      expect(combined.maxY).toBe(single.maxY);
    });

    it('should compute union for two resources side by side', () => {
      const left: ResourceBounds = {
        centerX: 50,
        centerY: 100,
        shapeDimX: 20,
        shapeDimY: 20,
        rotation: 0,
        shape: SeatingShape.RECTANGLE,
      };
      const right: ResourceBounds = {
        centerX: 150,
        centerY: 100,
        shapeDimX: 20,
        shapeDimY: 20,
        rotation: 0,
        shape: SeatingShape.RECTANGLE,
      };

      const box = getCombinedBoundingBox([left, right]);

      expect(box.minX).toBe(30); // left: 50 - 20
      expect(box.maxX).toBe(170); // right: 150 + 20
      expect(box.minY).toBe(80); // both: 100 - 20
      expect(box.maxY).toBe(120); // both: 100 + 20
    });

    it('should compute union for resources diagonally positioned', () => {
      const topLeft: ResourceBounds = {
        centerX: 50,
        centerY: 50,
        shapeDimX: 20,
        shapeDimY: 20,
        rotation: 0,
        shape: SeatingShape.RECTANGLE,
      };
      const bottomRight: ResourceBounds = {
        centerX: 200,
        centerY: 150,
        shapeDimX: 30,
        shapeDimY: 30,
        rotation: 0,
        shape: SeatingShape.ELLIPSE,
      };

      const box = getCombinedBoundingBox([topLeft, bottomRight]);

      expect(box.minX).toBe(30); // topLeft: 50 - 20
      expect(box.maxX).toBe(230); // bottomRight: 200 + 30
      expect(box.minY).toBe(30); // topLeft: 50 - 20
      expect(box.maxY).toBe(180); // bottomRight: 150 + 30
    });
  });

  describe('clampCenterToCanvas', () => {
    it('should not adjust center inside canvas', () => {
      const resource: ResourceBounds = {
        centerX: 600,
        centerY: 400,
        shapeDimX: 40,
        shapeDimY: 40,
        rotation: 0,
        shape: SeatingShape.RECTANGLE,
      };

      const clamped = clampCenterToCanvas(resource);

      expect(clamped.x).toBe(600);
      expect(clamped.y).toBe(400);
    });

    it('should clamp center near left edge', () => {
      const resource: ResourceBounds = {
        centerX: 20, // Would extend to -20 with half-width 40
        centerY: 400,
        shapeDimX: 40,
        shapeDimY: 20,
        rotation: 0,
        shape: SeatingShape.RECTANGLE,
      };

      const clamped = clampCenterToCanvas(resource);

      expect(clamped.x).toBe(40); // Clamped so minX = 0
      expect(clamped.y).toBe(400);
    });

    it('should clamp center near bottom-right corner', () => {
      const resource: ResourceBounds = {
        centerX: CANVAS_WIDTH - 20, // Would extend past right edge
        centerY: CANVAS_HEIGHT - 10, // Would extend past bottom edge
        shapeDimX: 40,
        shapeDimY: 20,
        rotation: 0,
        shape: SeatingShape.RECTANGLE,
      };

      const clamped = clampCenterToCanvas(resource);

      expect(clamped.x).toBe(CANVAS_WIDTH - 40); // Clamped so maxX = CANVAS_WIDTH
      expect(clamped.y).toBe(CANVAS_HEIGHT - 20); // Clamped so maxY = CANVAS_HEIGHT
    });

    it('should clamp 45° rotated rectangle at edge correctly', () => {
      const resource: ResourceBounds = {
        centerX: 50,
        centerY: 50,
        shapeDimX: 40,
        shapeDimY: 40, // square
        rotation: 45,
        shape: SeatingShape.RECTANGLE,
      };

      const clamped = clampCenterToCanvas(resource);

      // At 45°, a 40x40 square has bounding box ≈ 56.57 on each side
      // Center must be at least 56.57 from edges
      const halfDiagonal = 40 * Math.sqrt(2);
      expect(clamped.x).toBeCloseTo(halfDiagonal, 1);
      expect(clamped.y).toBeCloseTo(halfDiagonal, 1);
    });

    it('should allow 45° rotated ellipse closer to corner than rectangle', () => {
      const ellipse: ResourceBounds = {
        centerX: 50,
        centerY: 50,
        shapeDimX: 60,
        shapeDimY: 30,
        rotation: 45,
        shape: SeatingShape.ELLIPSE,
      };

      const rectangle: ResourceBounds = {
        ...ellipse,
        shape: SeatingShape.RECTANGLE,
      };

      const clampedEllipse = clampCenterToCanvas(ellipse);
      const clampedRectangle = clampCenterToCanvas(rectangle);

      // Ellipse can get closer to the corner (smaller clamped values)
      expect(clampedEllipse.x).toBeLessThan(clampedRectangle.x);
      expect(clampedEllipse.y).toBeLessThan(clampedRectangle.y);
    });
  });

  describe('clampDeltaForGroup', () => {
    it('should not change delta when movement stays within bounds', () => {
      const resources: ResourceBounds[] = [
        {
          centerX: 600,
          centerY: 400,
          shapeDimX: 40,
          shapeDimY: 40,
          rotation: 0,
          shape: SeatingShape.RECTANGLE,
        },
      ];

      const result = clampDeltaForGroup(resources, 100, 50);

      expect(result.dx).toBe(100);
      expect(result.dy).toBe(50);
    });

    it('should clamp delta when single resource would move past right edge', () => {
      const resources: ResourceBounds[] = [
        {
          centerX: CANVAS_WIDTH - 60, // maxX = 1140 + 40 = 1180
          centerY: 400,
          shapeDimX: 40,
          shapeDimY: 40,
          rotation: 0,
          shape: SeatingShape.RECTANGLE,
        },
      ];

      // Trying to move 100px right would put maxX at 1280
      const result = clampDeltaForGroup(resources, 100, 0);

      // Should clamp to 20px (1200 - 1180 = 20)
      expect(result.dx).toBe(20);
      expect(result.dy).toBe(0);
    });

    it('should clamp delta for group when leftmost table would exceed left edge', () => {
      const resources: ResourceBounds[] = [
        {
          // Left table at x=100, minX = 60
          centerX: 100,
          centerY: 400,
          shapeDimX: 40,
          shapeDimY: 40,
          rotation: 0,
          shape: SeatingShape.RECTANGLE,
        },
        {
          // Right table at x=300, maxX = 340
          centerX: 300,
          centerY: 400,
          shapeDimX: 40,
          shapeDimY: 40,
          rotation: 0,
          shape: SeatingShape.RECTANGLE,
        },
      ];

      // Trying to move 100px left would put left table minX at -40
      const result = clampDeltaForGroup(resources, -100, 0);

      // Should clamp to -60px (0 - 60 = -60)
      expect(result.dx).toBe(-60);
      expect(result.dy).toBe(0);
    });

    it('should clamp delta for group when rightmost table would exceed right edge', () => {
      const resources: ResourceBounds[] = [
        {
          // Left table
          centerX: 100,
          centerY: 400,
          shapeDimX: 40,
          shapeDimY: 40,
          rotation: 0,
          shape: SeatingShape.RECTANGLE,
        },
        {
          // Right table at x=1100, maxX = 1140
          centerX: 1100,
          centerY: 400,
          shapeDimX: 40,
          shapeDimY: 40,
          rotation: 0,
          shape: SeatingShape.RECTANGLE,
        },
      ];

      // Trying to move 100px right would put right table maxX at 1240
      const result = clampDeltaForGroup(resources, 100, 0);

      // Should clamp to 60px (1200 - 1140 = 60)
      expect(result.dx).toBe(60);
      expect(result.dy).toBe(0);
    });

    it('should preserve relative positions after clamping', () => {
      const resources: ResourceBounds[] = [
        {
          centerX: 100,
          centerY: 100,
          shapeDimX: 40,
          shapeDimY: 40,
          rotation: 0,
          shape: SeatingShape.RECTANGLE,
        },
        {
          centerX: 200,
          centerY: 200,
          shapeDimX: 40,
          shapeDimY: 40,
          rotation: 0,
          shape: SeatingShape.RECTANGLE,
        },
      ];

      // Move left by 200px - left table would go to minX = -140
      const result = clampDeltaForGroup(resources, -200, 0);

      // After applying clamped delta, both tables should have moved by same amount
      // The relative positions (100px apart) should be preserved
      // Clamped to -60 (left table minX = 0)
      expect(result.dx).toBe(-60);

      const newX1 = resources[0].centerX + result.dx; // 40
      const newX2 = resources[1].centerX + result.dx; // 140
      expect(newX2 - newX1).toBe(100); // Relative position preserved
    });

    it('should return original delta for empty resources array', () => {
      const result = clampDeltaForGroup([], 100, 50);

      expect(result.dx).toBe(100);
      expect(result.dy).toBe(50);
    });
  });

  describe('clampResizeDimensions', () => {
    it('should not clamp dimensions when within bounds', () => {
      const resource: ResourceBounds = {
        centerX: 600,
        centerY: 400,
        shapeDimX: 40,
        shapeDimY: 40,
        rotation: 0,
        shape: SeatingShape.RECTANGLE,
      };

      const result = clampResizeDimensions(resource, 100, 100);

      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it('should clamp rectangle dimensions when near right edge', () => {
      const resource: ResourceBounds = {
        centerX: CANVAS_WIDTH - 50, // 50 pixels from right edge
        centerY: 400,
        shapeDimX: 40,
        shapeDimY: 40,
        rotation: 0,
        shape: SeatingShape.RECTANGLE,
      };

      // Trying to resize to 100 half-width would put maxX at 1250 (exceeds 1200)
      const result = clampResizeDimensions(resource, 100, 40);

      // Width should be clamped to ~50 (distance to right edge)
      expect(result.width).toBeLessThanOrEqual(50);
      expect(result.width).toBeGreaterThan(20); // Min size
    });

    it('should clamp 45° rotated rectangle more aggressively', () => {
      const resource: ResourceBounds = {
        centerX: 100,
        centerY: 100,
        shapeDimX: 40,
        shapeDimY: 40,
        rotation: 45,
        shape: SeatingShape.RECTANGLE,
      };

      // At 45°, the diagonal extends further, so max size is more limited
      const result = clampResizeDimensions(resource, 200, 200);

      // Should be clamped because the rotated bounding box would exceed canvas
      // For a 45° square, max half-dimension is center/sqrt(2) ≈ 70.7
      expect(result.width).toBeLessThan(200);
      expect(result.height).toBeLessThan(200);
    });

    it('should allow ellipse to be larger at 45° than rectangle at same position', () => {
      const baseResource: ResourceBounds = {
        centerX: 100,
        centerY: 100,
        shapeDimX: 40,
        shapeDimY: 40,
        rotation: 45,
        shape: SeatingShape.RECTANGLE,
      };

      const rectangleResult = clampResizeDimensions(baseResource, 80, 80);

      const ellipseResult = clampResizeDimensions({ ...baseResource, shape: SeatingShape.ELLIPSE }, 80, 80);

      // Ellipse bounding box is tighter, so it can be larger
      expect(ellipseResult.width).toBeGreaterThanOrEqual(rectangleResult.width);
      expect(ellipseResult.height).toBeGreaterThanOrEqual(rectangleResult.height);
    });

    it('should maintain minimum size of 20', () => {
      const resource: ResourceBounds = {
        centerX: 10, // Very close to left edge
        centerY: 10, // Very close to top edge
        shapeDimX: 40,
        shapeDimY: 40,
        rotation: 0,
        shape: SeatingShape.RECTANGLE,
      };

      const result = clampResizeDimensions(resource, 100, 100);

      // Should be clamped but never below 20
      expect(result.width).toBeGreaterThanOrEqual(20);
      expect(result.height).toBeGreaterThanOrEqual(20);
    });

    it('should handle resource at canvas center with large resize', () => {
      const resource: ResourceBounds = {
        centerX: CANVAS_WIDTH / 2, // 600
        centerY: CANVAS_HEIGHT / 2, // 400
        shapeDimX: 40,
        shapeDimY: 40,
        rotation: 0,
        shape: SeatingShape.RECTANGLE,
      };

      // Max half-width from center is 400 (min of 600 and 600)
      // Max half-height from center is 400 (min of 400 and 400)
      const result = clampResizeDimensions(resource, 500, 500);

      expect(result.width).toBeLessThanOrEqual(400);
      expect(result.height).toBeLessThanOrEqual(400);
    });
  });
});
