/**
 * MoodVector - Continuous emotional state for children.
 *
 * Seven floating-point values that drive all child behavior decisions.
 * Happiness is a composite of the other stats.
 */

import { clamp } from '@utils/MathUtils';

export interface MoodValues {
  hunger: number;    // 0-1, builds over time, reduced by eating
  boredom: number;   // 0-1, builds during inactivity, reduced by play
  fatigue: number;   // 0-1, builds over time, reduced by sleep
  trust: number;     // 0-1, builds through positive interaction
  mischief: number;  // 0-1, builds when bored + energetic
  comfort: number;   // 0-1, affected by diaper, temperature, fear
}

/** Decay/growth rates per second for each mood stat */
interface MoodDecayRates {
  hungerGrowth: number;
  boredomGrowth: number;
  fatigueGrowth: number;
  trustDecay: number;
  mischiefGrowth: number;
  comfortDecay: number;
}

const DEFAULT_RATES: MoodDecayRates = {
  hungerGrowth: 0.003,    // Gets hungry over ~5 minutes
  boredomGrowth: 0.005,   // Gets bored over ~3 minutes
  fatigueGrowth: 0.002,   // Tired over ~8 minutes
  trustDecay: 0.0005,     // Trust decays very slowly
  mischiefGrowth: 0.002,  // Mischief builds slowly
  comfortDecay: 0.001,    // Comfort decays slowly
};

export class MoodVector {
  public values: MoodValues;
  private rates: MoodDecayRates;

  constructor(initial?: Partial<MoodValues>, rates?: Partial<MoodDecayRates>) {
    this.values = {
      hunger: initial?.hunger ?? 0.2,
      boredom: initial?.boredom ?? 0.1,
      fatigue: initial?.fatigue ?? 0.3,
      trust: initial?.trust ?? 0.5,
      mischief: initial?.mischief ?? 0.1,
      comfort: initial?.comfort ?? 0.8,
    };
    this.rates = { ...DEFAULT_RATES, ...rates };
  }

  /**
   * Calculate composite happiness (0-1).
   */
  get happiness(): number {
    return (
      (1 - this.values.hunger) * 0.25 +
      (1 - this.values.boredom) * 0.20 +
      (1 - this.values.fatigue) * 0.15 +
      this.values.trust * 0.20 +
      this.values.comfort * 0.20
    );
  }

  /**
   * Get the most urgent need (highest value except trust/comfort).
   */
  get urgentNeed(): keyof MoodValues {
    const needs: [keyof MoodValues, number][] = [
      ['hunger', this.values.hunger],
      ['boredom', this.values.boredom],
      ['fatigue', this.values.fatigue],
      ['comfort', 1 - this.values.comfort],
    ];
    needs.sort((a, b) => b[1] - a[1]);
    return needs[0][0];
  }

  /**
   * Check if any need is above the given threshold.
   */
  hasUrgentNeed(threshold: number = 0.7): boolean {
    return (
      this.values.hunger > threshold ||
      this.values.boredom > threshold ||
      this.values.fatigue > threshold ||
      this.values.comfort < (1 - threshold) ||
      this.values.mischief > threshold
    );
  }

  /**
   * Check if the child is critically upset.
   */
  isCritical(threshold: number = 0.85): boolean {
    return (
      this.values.hunger > threshold ||
      this.values.fatigue > threshold ||
      this.values.trust < (1 - threshold)
    );
  }

  /**
   * Natural mood decay/growth per timestep.
   */
  update(dt: number, isSleeping: boolean, isPlaying: boolean, isBeingHeld: boolean): void {
    const v = this.values;

    if (!isSleeping) {
      // Hunger always grows
      v.hunger = clamp(v.hunger + this.rates.hungerGrowth * dt, 0, 1);

      // Boredom grows when not playing
      if (!isPlaying) {
        v.boredom = clamp(v.boredom + this.rates.boredomGrowth * dt, 0, 1);
      } else {
        v.boredom = clamp(v.boredom - this.rates.boredomGrowth * 2 * dt, 0, 1);
      }

      // Fatigue grows when awake
      v.fatigue = clamp(v.fatigue + this.rates.fatigueGrowth * dt, 0, 1);

      // Mischief grows when bored and not tired
      if (v.boredom > 0.5 && v.fatigue < 0.7) {
        v.mischief = clamp(v.mischief + this.rates.mischiefGrowth * dt, 0, 1);
      } else {
        v.mischief = clamp(v.mischief - this.rates.mischiefGrowth * 0.5 * dt, 0, 1);
      }
    } else {
      // Sleeping reduces fatigue and boredom
      v.fatigue = clamp(v.fatigue - 0.01 * dt, 0, 1);
      v.boredom = clamp(v.boredom - 0.002 * dt, 0, 1);
      v.mischief = clamp(v.mischief - 0.003 * dt, 0, 1);
    }

    // Trust decays slowly when not interacting
    if (!isBeingHeld) {
      v.trust = clamp(v.trust - this.rates.trustDecay * dt, 0, 1);
    }

    // Comfort decays naturally
    v.comfort = clamp(v.comfort - this.rates.comfortDecay * dt, 0, 1);
  }

  /**
   * Apply a mood change (e.g., from feeding, playing, comforting).
   */
  apply(changes: Partial<MoodValues>): void {
    for (const [key, delta] of Object.entries(changes)) {
      const k = key as keyof MoodValues;
      this.values[k] = clamp(this.values[k] + (delta as number), 0, 1);
    }
  }

  /**
   * Feed the child - reduce hunger, increase trust.
   */
  feed(amount: number): void {
    this.apply({ hunger: -amount, trust: 0.05, comfort: 0.02 });
  }

  /**
   * Play with the child - reduce boredom, increase trust.
   */
  play(amount: number): void {
    this.apply({ boredom: -amount, trust: 0.03, mischief: -0.02 });
  }

  /**
   * Comfort the child - increase comfort, trust, reduce mischief.
   */
  comfortChild(amount: number): void {
    this.apply({ comfort: amount, trust: 0.05, mischief: -0.03 });
  }

  clone(): MoodVector {
    const mv = new MoodVector();
    mv.values = { ...this.values };
    return mv;
  }
}
