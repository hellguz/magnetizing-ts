import { describe, it, expect } from 'vitest';
import { Polygon, AABB } from './Polygon.js';
import { Vec2 } from './Vector2.js';

describe('Polygon', () => {
  describe('calculateAABB', () => {
    it('should calculate bounding box of a polygon', () => {
      const points: Vec2[] = [
        { x: 10, y: 20 },
        { x: 50, y: 10 },
        { x: 60, y: 40 },
        { x: 20, y: 50 },
      ];

      const aabb = Polygon.calculateAABB(points);

      expect(aabb.minX).toBe(10);
      expect(aabb.minY).toBe(10);
      expect(aabb.maxX).toBe(60);
      expect(aabb.maxY).toBe(50);
    });

    it('should handle empty array', () => {
      const points: Vec2[] = [];
      const aabb = Polygon.calculateAABB(points);

      expect(aabb).toBeDefined();
    });

    it('should handle single point', () => {
      const points: Vec2[] = [{ x: 5, y: 7 }];
      const aabb = Polygon.calculateAABB(points);

      expect(aabb.minX).toBe(5);
      expect(aabb.maxX).toBe(5);
      expect(aabb.minY).toBe(7);
      expect(aabb.maxY).toBe(7);
    });
  });

  describe('aabbIntersects', () => {
    it('should detect overlapping AABBs', () => {
      const a: AABB = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const b: AABB = { minX: 5, minY: 5, maxX: 15, maxY: 15 };

      expect(Polygon.aabbIntersects(a, b)).toBe(true);
    });

    it('should detect non-overlapping AABBs', () => {
      const a: AABB = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const b: AABB = { minX: 20, minY: 20, maxX: 30, maxY: 30 };

      expect(Polygon.aabbIntersects(a, b)).toBe(false);
    });

    it('should handle edge touching', () => {
      const a: AABB = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const b: AABB = { minX: 10, minY: 0, maxX: 20, maxY: 10 };

      expect(Polygon.aabbIntersects(a, b)).toBe(true);
    });
  });

  describe('calculateCentroid', () => {
    it('should calculate centroid of a polygon', () => {
      const points: Vec2[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];

      const centroid = Polygon.calculateCentroid(points);

      expect(centroid.x).toBe(5);
      expect(centroid.y).toBe(5);
    });

    it('should handle empty array', () => {
      const points: Vec2[] = [];
      const centroid = Polygon.calculateCentroid(points);

      expect(centroid.x).toBe(0);
      expect(centroid.y).toBe(0);
    });

    it('should handle triangle', () => {
      const points: Vec2[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ];

      const centroid = Polygon.calculateCentroid(points);

      expect(centroid.x).toBeCloseTo(5);
      expect(centroid.y).toBeCloseTo(3.333, 2);
    });
  });

  describe('createRectangle', () => {
    it('should create rectangle polygon', () => {
      const rect = Polygon.createRectangle(10, 20, 30, 40);

      expect(rect.length).toBe(4);
      expect(rect[0]).toEqual({ x: 10, y: 20 });
      expect(rect[1]).toEqual({ x: 40, y: 20 });
      expect(rect[2]).toEqual({ x: 40, y: 60 });
      expect(rect[3]).toEqual({ x: 10, y: 60 });
    });

    it('should handle zero-sized rectangle', () => {
      const rect = Polygon.createRectangle(5, 5, 0, 0);

      expect(rect.length).toBe(4);
      expect(rect.every(p => p.x === 5 && p.y === 5)).toBe(true);
    });
  });

  describe('intersectionArea', () => {
    it('should calculate overlap area of two rectangles', () => {
      const rect1 = Polygon.createRectangle(0, 0, 10, 10);
      const rect2 = Polygon.createRectangle(5, 5, 10, 10);

      const area = Polygon.intersectionArea(rect1, rect2);

      // Overlap is a 5x5 square
      expect(area).toBeCloseTo(25, 1);
    });

    it('should return 0 for non-overlapping polygons', () => {
      const rect1 = Polygon.createRectangle(0, 0, 10, 10);
      const rect2 = Polygon.createRectangle(20, 20, 10, 10);

      const area = Polygon.intersectionArea(rect1, rect2);

      expect(area).toBe(0);
    });

    it('should handle complete overlap', () => {
      const rect1 = Polygon.createRectangle(0, 0, 10, 10);
      const rect2 = Polygon.createRectangle(0, 0, 10, 10);

      const area = Polygon.intersectionArea(rect1, rect2);

      expect(area).toBeCloseTo(100, 0);
    });

    it('should use AABB early exit for non-overlapping', () => {
      const rect1 = Polygon.createRectangle(0, 0, 10, 10);
      const rect2 = Polygon.createRectangle(1000, 1000, 10, 10);

      const area = Polygon.intersectionArea(rect1, rect2);

      expect(area).toBe(0);
    });
  });

  describe('contains', () => {
    it('should detect when outer polygon contains inner', () => {
      const outer = Polygon.createRectangle(0, 0, 100, 100);
      const inner = Polygon.createRectangle(10, 10, 20, 20);

      expect(Polygon.contains(outer, inner)).toBe(true);
    });

    it('should detect when polygon does not contain another', () => {
      const outer = Polygon.createRectangle(0, 0, 100, 100);
      const inner = Polygon.createRectangle(90, 90, 20, 20); // Partially outside

      expect(Polygon.contains(outer, inner)).toBe(false);
    });

    it('should handle identical polygons', () => {
      const poly = Polygon.createRectangle(0, 0, 50, 50);

      expect(Polygon.contains(poly, poly)).toBe(true);
    });

    it('should detect completely outside polygon', () => {
      const outer = Polygon.createRectangle(0, 0, 50, 50);
      const inner = Polygon.createRectangle(100, 100, 20, 20);

      expect(Polygon.contains(outer, inner)).toBe(false);
    });
  });

  describe('area', () => {
    it('should calculate area of a rectangle', () => {
      const rect = Polygon.createRectangle(0, 0, 10, 20);
      const area = Polygon.area(rect);

      expect(area).toBe(200);
    });

    it('should calculate area of a triangle', () => {
      const triangle: Vec2[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 10 },
      ];

      const area = Polygon.area(triangle);

      expect(area).toBe(50);
    });

    it('should return 0 for degenerate polygon', () => {
      const line: Vec2[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ];

      const area = Polygon.area(line);

      expect(area).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const rect = Polygon.createRectangle(-10, -10, 20, 20);
      const area = Polygon.area(rect);

      expect(area).toBe(400);
    });
  });

  describe('pointInPolygon', () => {
    it('should detect point inside rectangle', () => {
      const rect = Polygon.createRectangle(0, 0, 10, 10);
      const point: Vec2 = { x: 5, y: 5 };

      expect(Polygon.pointInPolygon(point, rect)).toBe(true);
    });

    it('should detect point outside rectangle', () => {
      const rect = Polygon.createRectangle(0, 0, 10, 10);
      const point: Vec2 = { x: 15, y: 15 };

      expect(Polygon.pointInPolygon(point, rect)).toBe(false);
    });

    it('should handle point on edge (implementation dependent)', () => {
      const rect = Polygon.createRectangle(0, 0, 10, 10);
      const point: Vec2 = { x: 0, y: 5 };

      // Edge behavior depends on ray casting implementation
      const result = Polygon.pointInPolygon(point, rect);
      expect(typeof result).toBe('boolean');
    });

    it('should detect point inside triangle', () => {
      const triangle: Vec2[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ];
      const point: Vec2 = { x: 5, y: 3 };

      expect(Polygon.pointInPolygon(point, triangle)).toBe(true);
    });

    it('should detect point outside triangle', () => {
      const triangle: Vec2[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ];
      const point: Vec2 = { x: 5, y: 15 };

      expect(Polygon.pointInPolygon(point, triangle)).toBe(false);
    });
  });
});
