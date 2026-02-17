/**
 * StartScreen - Title screen with seed input, difficulty selection, and controls.
 */

import { EventBus } from '@core/EventBus';
import { SaveSystem } from '@core/SaveSystem';
import { Difficulty } from '@world/RoomTypes';

export class StartScreen {
  private element: HTMLElement;
  private selectedDifficulty: Difficulty = 'medium';
  private seedInput: HTMLInputElement | null = null;

  constructor() {
    this.element = document.getElementById('start-screen')!;
    this.enhance();
  }

  private enhance(): void {
    // Add seed input
    const seedGroup = document.createElement('div');
    seedGroup.style.cssText = 'margin-bottom: 16px; display: flex; gap: 8px; align-items: center;';

    const seedLabel = document.createElement('label');
    seedLabel.textContent = 'Seed: ';
    seedLabel.style.color = '#aaa';

    this.seedInput = document.createElement('input');
    this.seedInput.type = 'text';
    this.seedInput.placeholder = 'Random';
    this.seedInput.style.cssText = `
      padding: 6px 12px; background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.3); color: #fff;
      border-radius: 4px; font-size: 1rem; width: 150px;
    `;

    seedGroup.appendChild(seedLabel);
    seedGroup.appendChild(this.seedInput);

    // Difficulty selector
    const diffGroup = document.createElement('div');
    diffGroup.style.cssText = 'margin-bottom: 20px; display: flex; gap: 8px;';

    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    for (const diff of difficulties) {
      const btn = document.createElement('button');
      btn.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
      btn.style.cssText = `
        padding: 6px 16px; border: 1px solid rgba(255,255,255,0.3);
        background: ${diff === 'medium' ? 'rgba(255,255,255,0.2)' : 'transparent'};
        color: #fff; cursor: pointer; border-radius: 4px; font-size: 0.9rem;
      `;
      btn.addEventListener('click', () => {
        this.selectedDifficulty = diff;
        diffGroup.querySelectorAll('button').forEach((b) => {
          (b as HTMLButtonElement).style.background = 'transparent';
        });
        btn.style.background = 'rgba(255,255,255,0.2)';
      });
      diffGroup.appendChild(btn);
    }

    // Insert before the start button
    const startBtn = document.getElementById('btn-start')!;
    this.element.insertBefore(seedGroup, startBtn);
    this.element.insertBefore(diffGroup, startBtn);

    // Continue button (if save exists)
    const saveInfo = SaveSystem.getSaveInfo();
    if (saveInfo.exists) {
      const continueBtn = document.createElement('button');
      continueBtn.textContent = 'Continue';
      continueBtn.style.cssText = startBtn.style.cssText;
      continueBtn.addEventListener('mouseenter', () => { continueBtn.style.background = '#fff'; continueBtn.style.color = '#000'; });
      continueBtn.addEventListener('mouseleave', () => { continueBtn.style.background = 'transparent'; continueBtn.style.color = '#fff'; });
      continueBtn.addEventListener('click', () => {
        EventBus.emit('game.continue');
      });
      this.element.insertBefore(continueBtn, startBtn);
    }

    // Controls hint
    const controls = document.createElement('div');
    controls.style.cssText = 'margin-top: 24px; color: #666; font-size: 0.8rem; text-align: center; line-height: 1.6;';
    controls.innerHTML = 'WASD: Move | Mouse: Look | E: Interact | Q: Inspect<br>F: Crouch | Shift: Sprint | Tab: Inventory | ESC: Pause';
    this.element.appendChild(controls);
  }

  getSeed(): string {
    const val = this.seedInput?.value.trim();
    return val || `seed_${Date.now()}`;
  }

  getDifficulty(): Difficulty {
    return this.selectedDifficulty;
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  show(): void {
    this.element.style.display = 'flex';
  }

  dispose(): void {
    // Cleanup handled by DOM removal
  }
}
