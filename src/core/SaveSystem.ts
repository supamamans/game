/**
 * SaveSystem - localStorage serialization for mid-session saves.
 */

const SAVE_KEY = 'guardians_vigil_save';

export interface SaveData {
  seed: string;
  difficulty: string;
  gameTimeSeconds: number;
  playerStats: {
    hydration: number;
    hunger: number;
    energy: number;
    stress: number;
  };
  childStates: Array<{
    id: string;
    mood: Record<string, number>;
    position: { x: number; y: number; z: number };
    isSleeping: boolean;
    mealsEaten: number;
    isBathed: boolean;
  }>;
  scoringState: Record<string, unknown>;
  timestamp: number;
}

export class SaveSystem {
  /**
   * Save game state to localStorage.
   */
  static save(data: SaveData): boolean {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(SAVE_KEY, json);
      return true;
    } catch (e) {
      console.error('Failed to save game:', e);
      return false;
    }
  }

  /**
   * Load game state from localStorage.
   */
  static load(): SaveData | null {
    try {
      const json = localStorage.getItem(SAVE_KEY);
      if (!json) return null;
      return JSON.parse(json) as SaveData;
    } catch (e) {
      console.error('Failed to load save:', e);
      return null;
    }
  }

  /**
   * Check if a save exists.
   */
  static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  /**
   * Delete the saved game.
   */
  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  /**
   * Get save timestamp for display.
   */
  static getSaveInfo(): { exists: boolean; timestamp?: Date } {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return { exists: false };
    try {
      const data = JSON.parse(json) as SaveData;
      return { exists: true, timestamp: new Date(data.timestamp) };
    } catch {
      return { exists: false };
    }
  }
}
