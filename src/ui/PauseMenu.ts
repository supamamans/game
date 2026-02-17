/**
 * PauseMenu - Pause, settings, quality presets, quit.
 */

import { EventBus } from '@core/EventBus';

export class PauseMenu {
  private overlay: HTMLElement;
  private isPaused: boolean = false;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'pause-menu';
    this.overlay.style.cssText = `
      display: none;
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 50;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    `;

    const title = document.createElement('h2');
    title.textContent = 'PAUSED';
    title.style.cssText = 'color: #fff; font-size: 2rem; margin-bottom: 20px;';
    this.overlay.appendChild(title);

    this.addButton('Resume', () => this.toggle());
    this.addButton('Quality: High', () => this.cycleQuality());
    this.addButton('Quit to Menu', () => EventBus.emit('game.quit'));

    document.getElementById('ui-overlay')!.appendChild(this.overlay);

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') this.toggle();
    });
  }

  private addButton(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 10px 30px; font-size: 1.1rem;
      border: 2px solid #fff; background: transparent;
      color: #fff; cursor: pointer; border-radius: 4px;
      pointer-events: auto; min-width: 200px;
    `;
    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => { btn.style.background = '#fff'; btn.style.color = '#000'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; btn.style.color = '#fff'; });
    this.overlay.appendChild(btn);
    return btn;
  }

  toggle(): void {
    this.isPaused = !this.isPaused;
    this.overlay.style.display = this.isPaused ? 'flex' : 'none';
    EventBus.emit('game.pause', this.isPaused);

    if (this.isPaused) {
      document.exitPointerLock();
    }
  }

  private qualityIndex = 2;
  private qualities = ['Low', 'Medium', 'High', 'Ultra'];

  private cycleQuality(): void {
    this.qualityIndex = (this.qualityIndex + 1) % this.qualities.length;
    const quality = this.qualities[this.qualityIndex].toLowerCase() as 'low' | 'medium' | 'high' | 'ultra';
    const btn = this.overlay.querySelectorAll('button')[1];
    if (btn) btn.textContent = `Quality: ${this.qualities[this.qualityIndex]}`;
    EventBus.emit('game.qualityChange', quality);
  }

  get paused(): boolean {
    return this.isPaused;
  }

  dispose(): void {
    this.overlay.remove();
  }
}
