/**
 * SoundEffects - Sound effect registry and event triggers.
 *
 * Maps game events to sound effects for automatic playback.
 */

import { EventBus } from '@core/EventBus';

interface SFXEntry {
  name: string;
  category: 'ambient' | 'child' | 'interaction' | 'cooking' | 'water' | 'alert';
  volume: number;
  spatial: boolean;
}

const SFX_REGISTRY: SFXEntry[] = [
  // Ambient
  { name: 'house_creak', category: 'ambient', volume: 0.2, spatial: false },
  { name: 'clock_tick', category: 'ambient', volume: 0.15, spatial: true },
  { name: 'fridge_hum', category: 'ambient', volume: 0.1, spatial: true },

  // Children
  { name: 'child_cry_low', category: 'child', volume: 0.6, spatial: true },
  { name: 'child_cry_medium', category: 'child', volume: 0.8, spatial: true },
  { name: 'child_cry_high', category: 'child', volume: 1.0, spatial: true },
  { name: 'child_laugh', category: 'child', volume: 0.5, spatial: true },
  { name: 'child_babble', category: 'child', volume: 0.4, spatial: true },

  // Interaction
  { name: 'door_open', category: 'interaction', volume: 0.5, spatial: true },
  { name: 'door_close', category: 'interaction', volume: 0.5, spatial: true },
  { name: 'drawer_open', category: 'interaction', volume: 0.4, spatial: true },
  { name: 'tap_on', category: 'interaction', volume: 0.4, spatial: true },
  { name: 'plate_clink', category: 'interaction', volume: 0.3, spatial: true },
  { name: 'light_switch', category: 'interaction', volume: 0.3, spatial: true },

  // Cooking
  { name: 'stove_click', category: 'cooking', volume: 0.4, spatial: true },
  { name: 'sizzle', category: 'cooking', volume: 0.5, spatial: true },
  { name: 'boiling', category: 'cooking', volume: 0.4, spatial: true },
  { name: 'timer_ding', category: 'cooking', volume: 0.6, spatial: true },

  // Water
  { name: 'water_run', category: 'water', volume: 0.4, spatial: true },
  { name: 'splash', category: 'water', volume: 0.5, spatial: true },
  { name: 'drain', category: 'water', volume: 0.3, spatial: true },

  // Alerts
  { name: 'smoke_alarm', category: 'alert', volume: 1.0, spatial: true },
  { name: 'glass_break', category: 'alert', volume: 0.8, spatial: true },
  { name: 'thud', category: 'alert', volume: 0.6, spatial: true },
  { name: 'hazard_warning', category: 'alert', volume: 0.7, spatial: false },
];

export class SoundEffects {
  private registry: Map<string, SFXEntry> = new Map();

  constructor() {
    for (const sfx of SFX_REGISTRY) {
      this.registry.set(sfx.name, sfx);
    }

    this.setupEventBindings();
  }

  private setupEventBindings(): void {
    // Door events
    EventBus.on('door.toggle', (_key: unknown, isOpen: unknown) => {
      EventBus.emit('audio.play', isOpen ? 'door_open' : 'door_close');
    });

    // Cooking events
    EventBus.on('cooking.burnerToggle', (_id: unknown, isLit: unknown) => {
      if (isLit) EventBus.emit('audio.play', 'stove_click');
    });

    EventBus.on('cooking.done', () => {
      EventBus.emit('audio.play', 'timer_ding');
    });

    // Water events
    EventBus.on('hygiene.tapToggle', () => {
      EventBus.emit('audio.play', 'tap_on');
    });

    // Hazard events
    EventBus.on('hazard.triggered', () => {
      EventBus.emit('audio.play', 'hazard_warning');
    });

    // Glass break
    EventBus.on('object.break', () => {
      EventBus.emit('audio.play', 'glass_break');
    });
  }

  /**
   * Get SFX config by name.
   */
  get(name: string): SFXEntry | undefined {
    return this.registry.get(name);
  }

  /**
   * Get all SFX in a category.
   */
  getByCategory(category: string): SFXEntry[] {
    return Array.from(this.registry.values()).filter((s) => s.category === category);
  }
}
