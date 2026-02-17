/**
 * ChildInteraction - Child-object and child-child interactions.
 *
 * Manages how children interact with objects in the world
 * and with each other (sharing, fighting, contagious crying, etc.).
 */

import { EventBus } from '@core/EventBus';
import { Child } from '@entities/Child';

export class ChildInteraction {
  private children: Child[] = [];

  setChildren(children: Child[]): void {
    this.children = children;
    this.setupListeners();
  }

  private setupListeners(): void {
    // Contagious crying
    EventBus.on('child.contagiousCry', (cryingChildId: unknown) => {
      for (const child of this.children) {
        if (child.profile.id === cryingChildId) continue;
        // Infants are most susceptible
        if (child.profile.age === 'infant') {
          child.mood.apply({ comfort: -0.1 });
        } else if (child.mood.values.comfort < 0.5) {
          child.mood.apply({ comfort: -0.05 });
        }
      }
    });

    // Tantrum stress on player
    EventBus.on('child.tantrum.tick', (_childId: unknown, dt: unknown) => {
      EventBus.emit('player.stressSource', 'tantrum', dt);
    });

    // Child trust drop from hazard
    EventBus.on('child.trustDrop', (childId: unknown, newTrust: unknown) => {
      const child = this.children.find((c) => c.profile.id === childId);
      if (child) {
        child.mood.values.trust = newTrust as number;
      }
    });
  }

  /**
   * Check for inter-child dynamics each timestep.
   */
  update(dt: number): void {
    for (let i = 0; i < this.children.length; i++) {
      for (let j = i + 1; j < this.children.length; j++) {
        const a = this.children[i];
        const b = this.children[j];

        // Only check children in the same room
        if (a.currentRoom !== b.currentRoom) continue;

        const dist = a.position.distanceTo(b.position);
        if (dist > 3) continue; // Too far apart

        // Sharing/fighting over toys
        if (a.isPlaying && b.isPlaying) {
          if (a.mood.values.mischief > 0.7 || b.mood.values.mischief > 0.7) {
            // Fighting
            EventBus.emit('child.fighting', a.profile.id, b.profile.id);
            a.mood.apply({ comfort: -0.02 * dt });
            b.mood.apply({ comfort: -0.02 * dt });
          } else {
            // Cooperative play
            a.mood.play(0.005 * dt);
            b.mood.play(0.005 * dt);
          }
        }

        // Bullying (older child with high mischief)
        if (a.profile.age === 'child' && b.profile.age !== 'child' && a.mood.values.mischief > 0.7) {
          EventBus.emit('child.bullying', a.profile.id, b.profile.id);
          b.mood.apply({ comfort: -0.03 * dt, trust: -0.01 * dt });
        }
      }
    }
  }
}
