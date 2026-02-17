/**
 * Player - First-person player entity with stats and inventory.
 *
 * Manages player health stats (hydration, hunger, energy, stress),
 * position, and state.
 */

import { EventBus } from '@core/EventBus';
import { clamp } from '@utils/MathUtils';

export interface PlayerStats {
  hydration: number;   // 0-100
  hunger: number;      // 0-100
  energy: number;      // 0-100
  stress: number;      // 0-100
}

export interface PlayerState {
  stats: PlayerStats;
  isSitting: boolean;
  isCrouching: boolean;
  isSprinting: boolean;
  currentRoom: number | null;
}

/** Stat decay rates per second */
const DECAY_RATES = {
  hydration: 0.08,
  hunger: 0.12,
  energy: 0.06,
};

/** Stress increase per second from various sources */
const STRESS_SOURCES = {
  crying: 0.5,
  tantrum: 1.5,
  hazard: 2.0,
  smokeAlarm: 1.0,
};

/** Critical thresholds */
const CRITICAL = {
  hydration: 15,
  hunger: 15,
  energy: 10,
  stress: 85,
};

export class Player {
  public state: PlayerState;

  constructor() {
    this.state = {
      stats: {
        hydration: 80,
        hunger: 70,
        energy: 90,
        stress: 10,
      },
      isSitting: false,
      isCrouching: false,
      isSprinting: false,
      currentRoom: null,
    };

    this.setupListeners();
  }

  private setupListeners(): void {
    EventBus.on('player.crouch', (crouching: unknown) => {
      this.state.isCrouching = crouching as boolean;
    });

    EventBus.on('cooking.smokeAlarm', (active: unknown) => {
      if (active) {
        // Stress increases handled in update
      }
    });
  }

  /**
   * Update player stats each fixed timestep.
   */
  update(dt: number): void {
    const stats = this.state.stats;

    // Natural decay
    stats.hydration = clamp(stats.hydration - DECAY_RATES.hydration * dt, 0, 100);
    stats.hunger = clamp(stats.hunger - DECAY_RATES.hunger * dt, 0, 100);

    // Energy decay (faster when sprinting)
    const energyDecay = this.state.isSprinting ? DECAY_RATES.energy * 2.5 : DECAY_RATES.energy;
    stats.energy = clamp(stats.energy - energyDecay * dt, 0, 100);

    // Energy recovery when sitting
    if (this.state.isSitting) {
      stats.energy = clamp(stats.energy + 0.3 * dt, 0, 100);
      stats.stress = clamp(stats.stress - 0.2 * dt, 0, 100);
    }

    // Natural stress recovery (slow)
    if (stats.stress > 0) {
      stats.stress = clamp(stats.stress - 0.05 * dt, 0, 100);
    }

    // Check critical states
    this.checkCriticalStates();
  }

  /**
   * Eat food to restore hunger.
   */
  eat(amount: number): void {
    this.state.stats.hunger = clamp(this.state.stats.hunger + amount, 0, 100);
    EventBus.emit('player.ate', amount);
  }

  /**
   * Drink to restore hydration.
   */
  drink(amount: number): void {
    this.state.stats.hydration = clamp(this.state.stats.hydration + amount, 0, 100);
    EventBus.emit('player.drank', amount);
  }

  /**
   * Add stress from a source.
   */
  addStress(source: keyof typeof STRESS_SOURCES, dt: number): void {
    const rate = STRESS_SOURCES[source] ?? 0.5;
    this.state.stats.stress = clamp(this.state.stats.stress + rate * dt, 0, 100);
  }

  /**
   * Sit down to rest.
   */
  sit(): void {
    this.state.isSitting = true;
    EventBus.emit('player.sit');
  }

  /**
   * Stand up.
   */
  stand(): void {
    this.state.isSitting = false;
    EventBus.emit('player.stand');
  }

  private checkCriticalStates(): void {
    const stats = this.state.stats;

    if (stats.hydration < CRITICAL.hydration) {
      EventBus.emit('player.critical', 'hydration', stats.hydration);
    }
    if (stats.hunger < CRITICAL.hunger) {
      EventBus.emit('player.critical', 'hunger', stats.hunger);
    }
    if (stats.energy < CRITICAL.energy) {
      EventBus.emit('player.critical', 'energy', stats.energy);
    }
    if (stats.stress > CRITICAL.stress) {
      EventBus.emit('player.critical', 'stress', stats.stress);
    }

    // Breakdown condition
    if (stats.stress >= 100) {
      EventBus.emit('player.breakdown');
    }
  }

  getStats(): PlayerStats {
    return { ...this.state.stats };
  }
}
