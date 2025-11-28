import { describe, it, expect } from 'vitest';
import { Random } from './Random.js';

describe('Random', () => {
  describe('constructor', () => {
    it('should create instance with seed', () => {
      const rng = new Random(12345);
      expect(rng).toBeDefined();
    });

    it('should produce different sequences for different seeds', () => {
      const rng1 = new Random(100);
      const rng2 = new Random(200);

      const seq1 = [rng1.next(), rng1.next(), rng1.next()];
      const seq2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(seq1).not.toEqual(seq2);
    });

    it('should produce same sequence for same seed', () => {
      const rng1 = new Random(42);
      const rng2 = new Random(42);

      const seq1 = [rng1.next(), rng1.next(), rng1.next()];
      const seq2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(seq1).toEqual(seq2);
    });
  });

  describe('next', () => {
    it('should return values in [0, 1)', () => {
      const rng = new Random(12345);

      for (let i = 0; i < 1000; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should be deterministic', () => {
      const rng1 = new Random(999);
      const rng2 = new Random(999);

      for (let i = 0; i < 100; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });
  });

  describe('nextInt', () => {
    it('should return integers in [min, max] inclusive', () => {
      const rng = new Random(54321);
      const min = 5;
      const max = 10;

      for (let i = 0; i < 1000; i++) {
        const value = rng.nextInt(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('should handle min === max', () => {
      const rng = new Random(777);
      const value = rng.nextInt(5, 5);
      expect(value).toBe(5);
    });

    it('should cover full range eventually', () => {
      const rng = new Random(888);
      const min = 0;
      const max = 5;
      const seen = new Set<number>();

      for (let i = 0; i < 1000; i++) {
        seen.add(rng.nextInt(min, max));
      }

      // Should have seen all values in range
      expect(seen.size).toBe(max - min + 1);
    });
  });

  describe('nextFloat', () => {
    it('should return values in [min, max)', () => {
      const rng = new Random(11111);
      const min = 10.0;
      const max = 20.0;

      for (let i = 0; i < 1000; i++) {
        const value = rng.nextFloat(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it('should handle negative ranges', () => {
      const rng = new Random(22222);
      const min = -5.0;
      const max = 5.0;

      for (let i = 0; i < 1000; i++) {
        const value = rng.nextFloat(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });
  });

  describe('nextBool', () => {
    it('should return boolean values', () => {
      const rng = new Random(33333);

      for (let i = 0; i < 100; i++) {
        const value = rng.nextBool();
        expect(typeof value).toBe('boolean');
      }
    });

    it('should respect probability parameter', () => {
      const rng = new Random(44444);
      const trials = 10000;
      let trueCount = 0;

      for (let i = 0; i < trials; i++) {
        if (rng.nextBool(0.3)) {
          trueCount++;
        }
      }

      // Should be approximately 30% (allow 5% margin of error)
      const ratio = trueCount / trials;
      expect(ratio).toBeGreaterThan(0.25);
      expect(ratio).toBeLessThan(0.35);
    });

    it('should default to 0.5 probability', () => {
      const rng = new Random(55555);
      const trials = 10000;
      let trueCount = 0;

      for (let i = 0; i < trials; i++) {
        if (rng.nextBool()) {
          trueCount++;
        }
      }

      // Should be approximately 50% (allow 5% margin of error)
      const ratio = trueCount / trials;
      expect(ratio).toBeGreaterThan(0.45);
      expect(ratio).toBeLessThan(0.55);
    });
  });

  describe('shuffle', () => {
    it('should shuffle array in-place', () => {
      const rng = new Random(66666);
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const copy = [...original];

      rng.shuffle(copy);

      // Should be same length
      expect(copy.length).toBe(original.length);

      // Should be different order (very unlikely to be same)
      expect(copy).not.toEqual(original);

      // Should contain same elements (use copies to avoid mutation)
      expect([...copy].sort()).toEqual([...original].sort());
    });

    it('should be deterministic', () => {
      const rng1 = new Random(77777);
      const rng2 = new Random(77777);

      const arr1 = [1, 2, 3, 4, 5];
      const arr2 = [1, 2, 3, 4, 5];

      rng1.shuffle(arr1);
      rng2.shuffle(arr2);

      expect(arr1).toEqual(arr2);
    });

    it('should handle empty array', () => {
      const rng = new Random(88888);
      const arr: number[] = [];

      expect(() => rng.shuffle(arr)).not.toThrow();
      expect(arr).toEqual([]);
    });
  });

  describe('pick', () => {
    it('should pick random element from array', () => {
      const rng = new Random(99999);
      const arr = [10, 20, 30, 40, 50];

      for (let i = 0; i < 100; i++) {
        const picked = rng.pick(arr);
        expect(arr).toContain(picked);
      }
    });

    it('should eventually pick all elements', () => {
      const rng = new Random(10101);
      const arr = [1, 2, 3, 4, 5];
      const seen = new Set<number>();

      for (let i = 0; i < 1000; i++) {
        const picked = rng.pick(arr);
        if (picked !== undefined) {
          seen.add(picked);
        }
      }

      expect(seen.size).toBe(arr.length);
    });

    it('should return undefined for empty array', () => {
      const rng = new Random(20202);
      const arr: number[] = [];

      expect(rng.pick(arr)).toBeUndefined();
    });
  });

  describe('setSeed', () => {
    it('should reset sequence with new seed', () => {
      const rng = new Random(12345);
      const seq1 = [rng.next(), rng.next(), rng.next()];

      rng.setSeed(12345);
      const seq2 = [rng.next(), rng.next(), rng.next()];

      expect(seq1).toEqual(seq2);
    });
  });

  describe('getState and setState', () => {
    it('should save and restore state', () => {
      const rng = new Random(11111);

      // Generate some numbers
      rng.next();
      rng.next();

      const state = rng.getState();
      const expected = [rng.next(), rng.next(), rng.next()];

      // Restore state and generate same sequence
      rng.setState(state);
      const actual = [rng.next(), rng.next(), rng.next()];

      expect(actual).toEqual(expected);
    });
  });
});
