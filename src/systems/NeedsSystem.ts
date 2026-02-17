/**
 * NeedsSystem - Manages player stat decay and replenishment.
 *
 * Bridges the Player entity with the interaction system,
 * handling events like eating, drinking, and resting.
 */

import { Player } from '@entities/Player';
import { EventBus } from '@core/EventBus';

export class NeedsSystem {
  private player: Player;

  constructor(player: Player) {
    this.player = player;
    this.setupListeners();
  }

  private setupListeners(): void {
    // Eating events from interaction system
    EventBus.on('interaction.eat', (_objectId: unknown, obj: unknown) => {
      const data = obj as { data?: { satisfiesHunger?: number } };
      const amount = (data.data?.satisfiesHunger ?? 0.3) * 100;
      this.player.eat(amount);
    });

    // Drinking events
    EventBus.on('interaction.drink', () => {
      this.player.drink(30);
    });

    // Sitting on furniture
    EventBus.on('interaction.sit', () => {
      this.player.sit();
    });

    // Standing up
    EventBus.on('player.stand', () => {
      // Already handled in Player
    });

    // Stress from child crying
    EventBus.on('child.stateChange', (_childId: unknown, newState: unknown) => {
      if (newState === 'crying' || newState === 'tantrum') {
        // Continuous stress added in update loop via event
      }
    });
  }

  /**
   * Update needs each fixed timestep.
   */
  update(dt: number): void {
    this.player.update(dt);
  }
}
