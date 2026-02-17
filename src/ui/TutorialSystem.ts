/**
 * TutorialSystem - First-run contextual hints.
 *
 * Shows helpful tips when the player encounters something for the first time.
 */

import { EventBus } from '@core/EventBus';

interface TutorialHint {
  id: string;
  text: string;
  shown: boolean;
}

const HINTS: TutorialHint[] = [
  { id: 'movement', text: 'Use WASD to move, Mouse to look around.', shown: false },
  { id: 'interact', text: 'Press E to interact with objects. Q to inspect them.', shown: false },
  { id: 'cooking', text: 'Turn on a burner, place a pan, then add food. Watch for burning!', shown: false },
  { id: 'child_crying', text: 'A child is crying! Check what they need - they might be hungry or bored.', shown: false },
  { id: 'bath', text: 'Mix hot and cold water to the right temperature before placing a child in the bath.', shown: false },
  { id: 'hazard', text: 'Danger! Press the shown key quickly to prevent an accident.', shown: false },
  { id: 'hunger', text: 'You\'re getting hungry. Find food in the kitchen to eat.', shown: false },
  { id: 'bedtime', text: 'It\'s getting late. Time to start the bedtime routine - pajamas, story, lights off.', shown: false },
  { id: 'stress', text: 'Your stress is rising. Sit down for a moment to recover.', shown: false },
  { id: 'door', text: 'Press E to open and close doors.', shown: false },
];

const STORAGE_KEY = 'guardians_vigil_tutorial';

export class TutorialSystem {
  private hints: Map<string, TutorialHint> = new Map();
  private active: boolean = true;
  private currentHint: HTMLElement | null = null;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Load seen hints from storage
    const seen = this.loadSeenHints();
    for (const hint of HINTS) {
      hint.shown = seen.includes(hint.id);
      this.hints.set(hint.id, hint);
    }

    this.createHintElement();
    this.setupTriggers();
  }

  private loadSeenHints(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveSeenHints(): void {
    const seen = Array.from(this.hints.values())
      .filter((h) => h.shown)
      .map((h) => h.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  }

  private createHintElement(): void {
    this.currentHint = document.createElement('div');
    this.currentHint.style.cssText = `
      display: none;
      position: absolute;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: rgba(0, 100, 200, 0.8);
      border: 1px solid rgba(100, 180, 255, 0.5);
      border-radius: 6px;
      color: #fff;
      font-size: 0.95rem;
      max-width: 400px;
      text-align: center;
      z-index: 45;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.5s;
    `;
    document.getElementById('ui-overlay')!.appendChild(this.currentHint);
  }

  private setupTriggers(): void {
    // Movement hint on game start
    EventBus.on('camera.lockChange', (locked: unknown) => {
      if (locked) this.showHint('movement');
    });

    // Interact hint when looking at first object
    EventBus.on('interaction.execute', () => {
      this.showHint('interact');
    });

    // Cooking hint
    EventBus.on('cooking.burnerToggle', () => {
      this.showHint('cooking');
    });

    // Child crying
    EventBus.on('child.stateChange', (_id: unknown, state: unknown) => {
      if (state === 'upset' || state === 'needy') {
        this.showHint('child_crying');
      }
    });

    // Bath hint
    EventBus.on('hygiene.tapToggle', () => {
      this.showHint('bath');
    });

    // Hazard hint
    EventBus.on('qte.start', () => {
      this.showHint('hazard');
    });

    // Player hunger
    EventBus.on('player.critical', (stat: unknown) => {
      if (stat === 'hunger') this.showHint('hunger');
      if (stat === 'stress') this.showHint('stress');
    });

    // Bedtime
    EventBus.on('clock.phaseChange', (phase: unknown) => {
      if (phase === 'evening') this.showHint('bedtime');
    });

    // Door hint
    EventBus.on('door.toggle', () => {
      this.showHint('door');
    });
  }

  /**
   * Show a hint if it hasn't been shown before.
   */
  showHint(id: string): void {
    if (!this.active) return;

    const hint = this.hints.get(id);
    if (!hint || hint.shown) return;

    hint.shown = true;
    this.saveSeenHints();

    if (this.currentHint) {
      this.currentHint.textContent = hint.text;
      this.currentHint.style.display = 'block';
      this.currentHint.style.opacity = '1';

      if (this.hideTimeout) clearTimeout(this.hideTimeout);
      this.hideTimeout = setTimeout(() => {
        if (this.currentHint) {
          this.currentHint.style.opacity = '0';
          setTimeout(() => {
            if (this.currentHint) this.currentHint.style.display = 'none';
          }, 500);
        }
      }, 5000);
    }
  }

  /**
   * Disable tutorials.
   */
  disable(): void {
    this.active = false;
  }

  /**
   * Reset all tutorials (for new players).
   */
  reset(): void {
    for (const hint of this.hints.values()) {
      hint.shown = false;
    }
    localStorage.removeItem(STORAGE_KEY);
  }

  dispose(): void {
    this.currentHint?.remove();
  }
}
