/**
 * CookingSystem - Recipe state machine and food transformations.
 *
 * Manages the entire cooking flow: ingredients -> cooking -> plating -> serving.
 * Each stove burner is tracked independently.
 */

import { EventBus } from '@core/EventBus';

export enum CookState {
  Raw = 'raw',
  Cooking = 'cooking',
  Cooked = 'cooked',
  Burnt = 'burnt',
}

export enum MealDifficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
}

export interface Recipe {
  name: string;
  difficulty: MealDifficulty;
  ingredients: string[];
  cookTime: number; // seconds
  burnTime: number; // seconds after cooked before burning
  satisfiesHunger: number; // 0-1
}

export interface BurnerState {
  id: number;
  isLit: boolean;
  hasPan: boolean;
  foodItem: string | null;
  cookProgress: number; // 0-1
  state: CookState;
  recipe: Recipe | null;
}

export const RECIPES: Recipe[] = [
  { name: 'cereal', difficulty: MealDifficulty.Easy, ingredients: ['cereal', 'milk'], cookTime: 0, burnTime: Infinity, satisfiesHunger: 0.4 },
  { name: 'sandwich', difficulty: MealDifficulty.Easy, ingredients: ['bread', 'cheese'], cookTime: 0, burnTime: Infinity, satisfiesHunger: 0.5 },
  { name: 'fruit', difficulty: MealDifficulty.Easy, ingredients: ['fruit'], cookTime: 0, burnTime: Infinity, satisfiesHunger: 0.3 },
  { name: 'scrambled_eggs', difficulty: MealDifficulty.Medium, ingredients: ['eggs', 'butter'], cookTime: 15, burnTime: 10, satisfiesHunger: 0.6 },
  { name: 'pasta', difficulty: MealDifficulty.Medium, ingredients: ['pasta', 'sauce'], cookTime: 25, burnTime: 15, satisfiesHunger: 0.7 },
  { name: 'soup', difficulty: MealDifficulty.Medium, ingredients: ['vegetables', 'water'], cookTime: 30, burnTime: 20, satisfiesHunger: 0.65 },
  { name: 'full_meal', difficulty: MealDifficulty.Hard, ingredients: ['meat', 'vegetables', 'seasoning'], cookTime: 45, burnTime: 12, satisfiesHunger: 0.9 },
];

export class CookingSystem {
  private burners: BurnerState[] = [];
  private smokeAlarmActive: boolean = false;

  constructor(numBurners: number = 4) {
    for (let i = 0; i < numBurners; i++) {
      this.burners.push({
        id: i,
        isLit: false,
        hasPan: false,
        foodItem: null,
        cookProgress: 0,
        state: CookState.Raw,
        recipe: null,
      });
    }
  }

  /**
   * Toggle a burner on/off.
   */
  toggleBurner(burnerId: number): void {
    const burner = this.burners[burnerId];
    if (!burner) return;

    burner.isLit = !burner.isLit;
    EventBus.emit('cooking.burnerToggle', burnerId, burner.isLit);

    if (burner.isLit) {
      EventBus.emit('particle.start', `burner_flame_${burnerId}`);
    } else {
      EventBus.emit('particle.stop', `burner_flame_${burnerId}`);
    }
  }

  /**
   * Place a pan on a burner.
   */
  placePan(burnerId: number): boolean {
    const burner = this.burners[burnerId];
    if (!burner || burner.hasPan) return false;

    burner.hasPan = true;
    EventBus.emit('cooking.panPlaced', burnerId);
    return true;
  }

  /**
   * Add food to a burner's pan.
   */
  addFood(burnerId: number, foodName: string): boolean {
    const burner = this.burners[burnerId];
    if (!burner || !burner.hasPan || burner.foodItem) return false;

    const recipe = RECIPES.find((r) => r.name === foodName);
    burner.foodItem = foodName;
    burner.recipe = recipe ?? null;
    burner.cookProgress = 0;
    burner.state = CookState.Raw;

    // No-cook recipes are instantly ready
    if (recipe && recipe.cookTime === 0) {
      burner.state = CookState.Cooked;
      burner.cookProgress = 1;
    }

    EventBus.emit('cooking.foodAdded', burnerId, foodName);
    return true;
  }

  /**
   * Take food from a burner (for plating).
   */
  takeFood(burnerId: number): { food: string; state: CookState; recipe: Recipe | null } | null {
    const burner = this.burners[burnerId];
    if (!burner || !burner.foodItem) return null;

    const result = {
      food: burner.foodItem,
      state: burner.state,
      recipe: burner.recipe,
    };

    burner.foodItem = null;
    burner.recipe = null;
    burner.cookProgress = 0;
    burner.state = CookState.Raw;

    EventBus.emit('cooking.foodTaken', burnerId, result);
    return result;
  }

  /**
   * Update cooking progress each fixed timestep.
   */
  update(dt: number): void {
    let anyBurning = false;

    for (const burner of this.burners) {
      if (!burner.isLit || !burner.hasPan || !burner.foodItem || !burner.recipe) continue;
      if (burner.recipe.cookTime === 0) continue; // No-cook recipes

      if (burner.state === CookState.Raw || burner.state === CookState.Cooking) {
        burner.state = CookState.Cooking;
        burner.cookProgress += dt / burner.recipe.cookTime;

        if (burner.cookProgress >= 1) {
          burner.state = CookState.Cooked;
          EventBus.emit('cooking.done', burner.id, burner.foodItem);
          EventBus.emit('particle.start', `steam_${burner.id}`);
        }
      } else if (burner.state === CookState.Cooked) {
        // Overcooking timer
        burner.cookProgress += dt / burner.recipe.burnTime;

        if (burner.cookProgress >= 1.5) {
          burner.state = CookState.Burnt;
          anyBurning = true;
          EventBus.emit('cooking.burnt', burner.id, burner.foodItem);
          EventBus.emit('particle.start', `smoke_${burner.id}`);
        }
      }
    }

    // Smoke alarm
    if (anyBurning && !this.smokeAlarmActive) {
      this.smokeAlarmActive = true;
      EventBus.emit('cooking.smokeAlarm', true);
      EventBus.emit('audio.play', 'smoke_alarm');
    } else if (!anyBurning && this.smokeAlarmActive) {
      this.smokeAlarmActive = false;
      EventBus.emit('cooking.smokeAlarm', false);
      EventBus.emit('audio.stop', 'smoke_alarm');
    }
  }

  getBurner(id: number): BurnerState | undefined {
    return this.burners[id];
  }

  getAllBurners(): BurnerState[] {
    return [...this.burners];
  }

  isSmokeAlarmActive(): boolean {
    return this.smokeAlarmActive;
  }
}
