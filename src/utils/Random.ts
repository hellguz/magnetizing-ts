/**
 * Mulberry32 PRNG (Pseudo-Random Number Generator)
 * Fast, deterministic random number generator for reproducible results.
 * Based on: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
 */
export class Random {
  private state: number;

  constructor(seed: number = Date.now()) {
    // Ensure seed is a 32-bit unsigned integer
    this.state = seed >>> 0;
  }

  /**
   * Returns a random number in [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a random integer in [min, max] (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Returns a random number in [min, max)
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Returns true with probability p (0.0 to 1.0)
   */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Shuffle an array in-place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Pick a random element from an array
   */
  pick<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Reset the PRNG with a new seed
   */
  setSeed(seed: number): void {
    this.state = seed >>> 0;
  }

  /**
   * Get current state (for saving/restoring)
   */
  getState(): number {
    return this.state;
  }

  /**
   * Restore state (for saving/restoring)
   */
  setState(state: number): void {
    this.state = state >>> 0;
  }
}
