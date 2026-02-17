/**
 * SeededRandom - Deterministic pseudo-random number generator.
 *
 * Uses a simple mulberry32 algorithm seeded from a string hash.
 * Every house layout, child profile, and furniture placement
 * is derived from this to ensure reproducibility.
 */

export class SeededRandom {
  private state: number;

  constructor(seed: string | number) {
    this.state = typeof seed === 'string' ? SeededRandom.hashString(seed) : seed;
    // Warm up the generator
    for (let i = 0; i < 10; i++) this.next();
  }

  /**
   * Hash a string into a 32-bit integer.
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return hash >>> 0;
  }

  /**
   * Returns a float in [0, 1).
   */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in [min, max] (inclusive).
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Returns a float in [min, max).
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Returns true with the given probability (0-1).
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Pick a random element from an array.
   */
  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  /**
   * Shuffle an array in place (Fisher-Yates).
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
