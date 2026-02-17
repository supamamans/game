/**
 * MusicSystem - Adaptive music state machine with crossfading.
 *
 * The background soundtrack responds to the game state:
 * - CALM: all kids content, low stress
 * - BUSY: multiple kids needy, moderate stress
 * - TENSE: hazard active, child crying, high stress
 * - EMERGENCY: critical hazard, tantrum
 * - BEDTIME: evening, kids sleeping
 */

import { EventBus } from '@core/EventBus';

export enum MusicState {
  Calm = 'calm',
  Busy = 'busy',
  Tense = 'tense',
  Emergency = 'emergency',
  Bedtime = 'bedtime',
  Silent = 'silent',
}

export class MusicSystem {
  private currentState: MusicState = MusicState.Silent;
  private targetState: MusicState = MusicState.Calm;
  private crossfadeProgress: number = 1;
  private crossfadeDuration: number = 4; // seconds

  // Game state inputs
  private stressLevel: number = 0;
  private cryingChildren: number = 0;
  private tantrumActive: boolean = false;
  private hazardActive: boolean = false;
  private isBedtime: boolean = false;

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    EventBus.on('child.stateChange', (_id: unknown, state: unknown) => {
      if (state === 'tantrum') this.tantrumActive = true;
      this.updateCryingCount();
    });

    EventBus.on('hazard.triggered', () => {
      this.hazardActive = true;
    });

    EventBus.on('hazard.resolved', () => {
      this.hazardActive = false;
    });

    EventBus.on('clock.phaseChange', (phase: unknown) => {
      this.isBedtime = (phase === 'evening' || phase === 'wrap_up');
    });
  }

  private updateCryingCount(): void {
    // This would query child states in a full implementation
    // For now, tracked via events
  }

  /**
   * Determine the appropriate music state based on game conditions.
   */
  private evaluateState(): MusicState {
    if (this.hazardActive || this.tantrumActive) return MusicState.Emergency;
    if (this.stressLevel > 0.7 || this.cryingChildren > 1) return MusicState.Tense;
    if (this.isBedtime) return MusicState.Bedtime;
    if (this.stressLevel > 0.4 || this.cryingChildren > 0) return MusicState.Busy;
    return MusicState.Calm;
  }

  /**
   * Update music state and handle crossfading.
   */
  update(dt: number, stressLevel: number): void {
    this.stressLevel = stressLevel;

    const newTarget = this.evaluateState();
    if (newTarget !== this.targetState) {
      this.targetState = newTarget;
      this.crossfadeProgress = 0;
      EventBus.emit('music.transition', this.currentState, this.targetState);
    }

    // Crossfade
    if (this.crossfadeProgress < 1) {
      this.crossfadeProgress += dt / this.crossfadeDuration;
      if (this.crossfadeProgress >= 1) {
        this.crossfadeProgress = 1;
        this.currentState = this.targetState;
        EventBus.emit('music.stateChanged', this.currentState);
      }
    }

    // Reset tantrum flag if no longer in tantrum
    this.tantrumActive = false; // Reset each frame, re-set by events
  }

  getState(): MusicState {
    return this.currentState;
  }

  getCrossfade(): number {
    return this.crossfadeProgress;
  }

  dispose(): void {
    // Cleanup
  }
}
