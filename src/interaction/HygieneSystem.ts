/**
 * HygieneSystem - Bath, diaper, handwashing, and toilet logic.
 *
 * Manages bathtub water level, temperature, and child bathing sequences.
 */

import { EventBus } from '@core/EventBus';
import { clamp } from '@utils/MathUtils';

export interface BathtubState {
  waterLevel: number; // 0-1
  temperature: number; // 0-1 (0=cold, 0.5=warm, 1=hot)
  hasSoap: boolean;
  hasChild: string | null; // child entity ID
  hotTapOpen: boolean;
  coldTapOpen: boolean;
  isDraining: boolean;
}

export class HygieneSystem {
  private bathtub: BathtubState = {
    waterLevel: 0,
    temperature: 0.5,
    hasSoap: false,
    hasChild: null,
    hotTapOpen: false,
    coldTapOpen: false,
    isDraining: false,
  };

  private diaperChangeInProgress: boolean = false;
  private diaperChangeTimer: number = 0;
  private readonly DIAPER_CHANGE_TIME = 5; // seconds

  private readonly FILL_RATE = 0.05; // per second
  private readonly DRAIN_RATE = 0.08; // per second
  private readonly SAFE_TEMP_MIN = 0.35;
  private readonly SAFE_TEMP_MAX = 0.65;

  /**
   * Toggle hot tap.
   */
  toggleHotTap(): void {
    this.bathtub.hotTapOpen = !this.bathtub.hotTapOpen;
    EventBus.emit('hygiene.tapToggle', 'hot', this.bathtub.hotTapOpen);
    this.updateWaterParticles();
  }

  /**
   * Toggle cold tap.
   */
  toggleColdTap(): void {
    this.bathtub.coldTapOpen = !this.bathtub.coldTapOpen;
    EventBus.emit('hygiene.tapToggle', 'cold', this.bathtub.coldTapOpen);
    this.updateWaterParticles();
  }

  /**
   * Toggle drain.
   */
  toggleDrain(): void {
    this.bathtub.isDraining = !this.bathtub.isDraining;
    EventBus.emit('hygiene.drainToggle', this.bathtub.isDraining);
  }

  /**
   * Add soap to the bath.
   */
  addSoap(): void {
    if (this.bathtub.waterLevel > 0.1) {
      this.bathtub.hasSoap = true;
      EventBus.emit('hygiene.soapAdded');
      EventBus.emit('particle.start', 'bath_bubbles');
    }
  }

  /**
   * Check if the water temperature is safe for a child.
   */
  isTemperatureSafe(): boolean {
    return this.bathtub.temperature >= this.SAFE_TEMP_MIN && this.bathtub.temperature <= this.SAFE_TEMP_MAX;
  }

  /**
   * Place a child in the bath.
   */
  placeChildInBath(childId: string): boolean {
    if (this.bathtub.hasChild) return false;
    if (this.bathtub.waterLevel < 0.2) {
      EventBus.emit('ui.message', 'Not enough water in the tub');
      return false;
    }

    if (!this.isTemperatureSafe()) {
      EventBus.emit('hazard.hotWater', childId);
      EventBus.emit('ui.message', 'Water is too hot!');
    }

    this.bathtub.hasChild = childId;
    EventBus.emit('hygiene.childInBath', childId);
    return true;
  }

  /**
   * Remove child from bath.
   */
  removeChildFromBath(): string | null {
    const childId = this.bathtub.hasChild;
    if (!childId) return null;

    this.bathtub.hasChild = null;
    EventBus.emit('hygiene.childOutOfBath', childId);
    return childId;
  }

  /**
   * Start a diaper change.
   */
  startDiaperChange(childId: string): void {
    this.diaperChangeInProgress = true;
    this.diaperChangeTimer = 0;
    EventBus.emit('hygiene.diaperChangeStart', childId);
  }

  /**
   * Update bathtub water level and temperature each timestep.
   */
  update(dt: number): void {
    const tub = this.bathtub;

    // Fill from taps
    const filling = tub.hotTapOpen || tub.coldTapOpen;
    if (filling && !tub.isDraining) {
      const fillAmount = this.FILL_RATE * dt;
      const hotRatio = tub.hotTapOpen && tub.coldTapOpen ? 0.5 :
        tub.hotTapOpen ? 1.0 : 0.0;

      tub.waterLevel = clamp(tub.waterLevel + fillAmount, 0, 1);

      // Temperature mixing
      const incomingTemp = hotRatio * 0.9 + (1 - hotRatio) * 0.1;
      const mixRatio = fillAmount / Math.max(tub.waterLevel, 0.01);
      tub.temperature = tub.temperature * (1 - mixRatio) + incomingTemp * mixRatio;
      tub.temperature = clamp(tub.temperature, 0, 1);
    }

    // Drain
    if (tub.isDraining) {
      tub.waterLevel = clamp(tub.waterLevel - this.DRAIN_RATE * dt, 0, 1);
      if (tub.waterLevel <= 0) {
        tub.isDraining = false;
        tub.hasSoap = false;
      }
    }

    // Overflow warning
    if (tub.waterLevel >= 0.95 && filling) {
      EventBus.emit('hazard.overflow');
    }

    // Child unattended in bath timer
    if (tub.hasChild && tub.waterLevel > 0.3) {
      // Hazard system handles the actual danger timing
      EventBus.emit('hygiene.childInWater', tub.hasChild, dt);
    }

    // Diaper change progress
    if (this.diaperChangeInProgress) {
      this.diaperChangeTimer += dt;
      if (this.diaperChangeTimer >= this.DIAPER_CHANGE_TIME) {
        this.diaperChangeInProgress = false;
        EventBus.emit('hygiene.diaperChangeDone');
      }
    }

    // Natural temperature decay toward room temp (0.3)
    if (!filling) {
      tub.temperature += (0.3 - tub.temperature) * 0.001 * dt;
    }
  }

  getBathtubState(): BathtubState {
    return { ...this.bathtub };
  }

  private updateWaterParticles(): void {
    const anyOpen = this.bathtub.hotTapOpen || this.bathtub.coldTapOpen;
    if (anyOpen) {
      EventBus.emit('particle.start', 'bath_water');
    } else {
      EventBus.emit('particle.stop', 'bath_water');
    }
  }
}
