/**
 * Clock - In-game time management.
 *
 * The in-game day runs from 6:00 AM to 10:00 PM (16 hours).
 * Real-time ratio: 1 real minute = 16 in-game minutes.
 * Full session: ~60 real minutes.
 */

import { EventBus } from './EventBus';

export enum DayPhase {
  EarlyMorning = 'early_morning', // 6:00 - 8:00
  Morning = 'morning',             // 8:00 - 12:00
  Lunch = 'lunch',                 // 12:00 - 13:00
  Afternoon = 'afternoon',         // 13:00 - 17:00
  Dinner = 'dinner',               // 17:00 - 19:00
  Evening = 'evening',             // 19:00 - 21:00
  WrapUp = 'wrap_up',             // 21:00 - 22:00
}

/** Ratio: 1 real second = 16/60 in-game minutes = 16 in-game seconds */
const REAL_TO_GAME_RATIO = 16;

/** Game starts at 6:00 AM = 6 * 3600 = 21600 seconds into the day */
const START_TIME_SECONDS = 6 * 3600;

/** Game ends at 10:00 PM = 22 * 3600 = 79200 seconds into the day */
const END_TIME_SECONDS = 22 * 3600;

export class Clock {
  /** Current in-game time in seconds since midnight */
  private gameTimeSeconds: number = START_TIME_SECONDS;
  private currentPhase: DayPhase = DayPhase.EarlyMorning;
  private paused: boolean = false;
  private finished: boolean = false;

  get timeSeconds(): number {
    return this.gameTimeSeconds;
  }

  get hours(): number {
    return Math.floor(this.gameTimeSeconds / 3600);
  }

  get minutes(): number {
    return Math.floor((this.gameTimeSeconds % 3600) / 60);
  }

  get phase(): DayPhase {
    return this.currentPhase;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /**
   * Returns a formatted time string like "6:00 AM" or "10:00 PM".
   */
  get formattedTime(): string {
    const h = this.hours;
    const m = this.minutes;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Returns progress through the day as 0-1.
   */
  get dayProgress(): number {
    return (this.gameTimeSeconds - START_TIME_SECONDS) / (END_TIME_SECONDS - START_TIME_SECONDS);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  /**
   * Advance the in-game clock by a real-time delta (in seconds).
   */
  advance(realDeltaSeconds: number): void {
    if (this.paused || this.finished) return;

    this.gameTimeSeconds += realDeltaSeconds * REAL_TO_GAME_RATIO;

    if (this.gameTimeSeconds >= END_TIME_SECONDS) {
      this.gameTimeSeconds = END_TIME_SECONDS;
      this.finished = true;
      EventBus.emit('clock.dayEnd');
    }

    // Update phase
    const newPhase = this.calculatePhase();
    if (newPhase !== this.currentPhase) {
      const oldPhase = this.currentPhase;
      this.currentPhase = newPhase;
      EventBus.emit('clock.phaseChange', newPhase, oldPhase);
    }
  }

  private calculatePhase(): DayPhase {
    const h = this.hours;
    if (h < 8) return DayPhase.EarlyMorning;
    if (h < 12) return DayPhase.Morning;
    if (h < 13) return DayPhase.Lunch;
    if (h < 17) return DayPhase.Afternoon;
    if (h < 19) return DayPhase.Dinner;
    if (h < 21) return DayPhase.Evening;
    return DayPhase.WrapUp;
  }

  reset(): void {
    this.gameTimeSeconds = START_TIME_SECONDS;
    this.currentPhase = DayPhase.EarlyMorning;
    this.paused = false;
    this.finished = false;
  }
}
