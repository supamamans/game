/**
 * ScoringSystem - Running score accumulator and end-of-day calculation.
 */

import { EventBus } from '@core/EventBus';
import { ScoreData } from '@ui/ScoreScreen';

export interface ScoringState {
  mealsServed: number;
  totalMealsNeeded: number;
  childrenBathed: number;
  totalChildren: number;
  bedtimeStoriesRead: number;
  allAsleepBy9: boolean;
  tvUsed: boolean;
  brokenObjects: number;
  uncleanedSpills: number;
  chaosRooms: number;
  incidents: { minor: number; serious: number; critical: number };
}

export class ScoringSystem {
  private state: ScoringState;

  constructor(totalChildren: number) {
    this.state = {
      mealsServed: 0,
      totalMealsNeeded: totalChildren * 3, // 3 meals per child
      childrenBathed: 0,
      totalChildren,
      bedtimeStoriesRead: 0,
      allAsleepBy9: false,
      tvUsed: false,
      brokenObjects: 0,
      uncleanedSpills: 0,
      chaosRooms: 0,
      incidents: { minor: 0, serious: 0, critical: 0 },
    };

    this.setupListeners();
  }

  private setupListeners(): void {
    EventBus.on('score.event', (event: unknown) => {
      switch (event as string) {
        case 'meal_served': this.state.mealsServed++; break;
        case 'child_bathed': this.state.childrenBathed++; break;
        case 'bedtime_story': this.state.bedtimeStoriesRead++; break;
        case 'tv_used': this.state.tvUsed = true; break;
        case 'object_broken': this.state.brokenObjects++; break;
        case 'spill': this.state.uncleanedSpills++; break;
      }
    });

    EventBus.on('score.incident', (severity: unknown) => {
      switch (severity as string) {
        case 'minor': this.state.incidents.minor++; break;
        case 'serious': this.state.incidents.serious++; break;
        case 'critical': this.state.incidents.critical++; break;
      }
    });
  }

  /**
   * Calculate final score at end of day.
   */
  calculateFinalScore(
    childHappiness: number[], // array of happiness values 0-1
    playerStats: { hydration: number; hunger: number; energy: number; stress: number },
    safetyScore: number,
  ): ScoreData {
    // Child Happiness (40%)
    const avgHappiness = childHappiness.reduce((a, b) => a + b, 0) / childHappiness.length;
    let happinessScore = avgHappiness * 100;
    for (const h of childHappiness) {
      if (h > 0.8) happinessScore += 5;
      if (h < 0.3) happinessScore -= 10;
    }
    happinessScore = Math.max(0, Math.min(100, happinessScore));

    // Safety (25%)
    const safety = Math.max(0, safetyScore);

    // House Condition (15%)
    let houseScore = 100;
    houseScore -= this.state.brokenObjects * 2;
    houseScore -= this.state.uncleanedSpills * 3;
    houseScore -= this.state.chaosRooms * 5;
    if (houseScore === 100) houseScore += 5; // Spotless bonus
    houseScore = Math.max(0, Math.min(105, houseScore));

    // Player Health (10%)
    const playerHealth = (
      playerStats.hydration +
      playerStats.hunger +
      playerStats.energy +
      (100 - playerStats.stress)
    ) / 4;

    // Bonus Objectives (10%)
    let bonus = 0;
    if (this.state.allAsleepBy9) bonus += 20;
    if (this.state.mealsServed >= this.state.totalMealsNeeded) bonus += 20;
    if (this.state.childrenBathed >= this.state.totalChildren) bonus += 20;
    if (!this.state.tvUsed) bonus += 20;
    if (this.state.bedtimeStoriesRead >= this.state.totalChildren) bonus += 20;

    // Weighted total
    const total =
      happinessScore * 0.40 +
      safety * 0.25 +
      Math.min(houseScore, 100) * 0.15 +
      playerHealth * 0.10 +
      bonus * 0.10;

    // Star rating
    let stars: number;
    if (total >= 90) stars = 5;
    else if (total >= 75) stars = 4;
    else if (total >= 60) stars = 3;
    else if (total >= 40) stars = 2;
    else stars = 1;

    // Special endings
    let specialEnding: string | null = null;
    if (playerStats.stress >= 100) specialEnding = 'Breakdown - You couldn\'t take it anymore';
    if (this.state.incidents.critical > 0) specialEnding = 'Emergency - A critical incident occurred';
    if (total >= 100) specialEnding = 'Perfect Day - You are the ultimate guardian';

    return {
      childHappiness: happinessScore,
      safety,
      houseCondition: Math.min(houseScore, 100),
      playerHealth,
      bonusObjectives: bonus,
      totalScore: total,
      stars,
      specialEnding,
    };
  }

  /**
   * Update scoring accumulation each timestep.
   */
  accumulate(_dt: number): void {
    // Continuous scoring tracked via events
  }

  getState(): ScoringState {
    return { ...this.state };
  }
}
