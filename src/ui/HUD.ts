/**
 * HUD - Player stats, clock, and alerts overlay (DOM-based).
 */

import { PlayerStats } from '@entities/Player';
import { EventBus } from '@core/EventBus';

export class HUD {
  private container: HTMLElement;
  private clockEl: HTMLElement;
  private statsContainer: HTMLElement;
  private messageEl: HTMLElement;
  private messageTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.container = document.getElementById('hud')!;
    this.container.innerHTML = '';
    this.container.style.cssText = `
      display: none;
      position: absolute;
      bottom: 20px;
      left: 20px;
      right: 20px;
      pointer-events: none;
      font-family: 'Segoe UI', sans-serif;
    `;

    // Clock
    this.clockEl = document.createElement('div');
    this.clockEl.style.cssText = `
      position: absolute;
      top: -60px;
      right: 0;
      font-size: 1.4rem;
      color: #fff;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8);
    `;
    this.container.appendChild(this.clockEl);

    // Stats bars
    this.statsContainer = document.createElement('div');
    this.statsContainer.style.cssText = `
      display: flex;
      gap: 12px;
      align-items: flex-end;
    `;
    this.container.appendChild(this.statsContainer);

    this.createStatBar('hydration', '💧', '#4488ff');
    this.createStatBar('hunger', '🍔', '#ff8844');
    this.createStatBar('energy', '⚡', '#ffcc00');
    this.createStatBar('stress', '😰', '#ff4444');

    // Message display
    this.messageEl = document.createElement('div');
    this.messageEl.style.cssText = `
      position: absolute;
      top: -100px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      background: rgba(0,0,0,0.7);
      border-radius: 4px;
      font-size: 1rem;
      color: #fff;
      opacity: 0;
      transition: opacity 0.3s;
      white-space: nowrap;
    `;
    this.container.appendChild(this.messageEl);

    // Listen for UI messages
    EventBus.on('ui.message', (msg: unknown) => {
      this.showMessage(msg as string);
    });
  }

  private createStatBar(id: string, icon: string, color: string): void {
    const bar = document.createElement('div');
    bar.style.cssText = `display: flex; flex-direction: column; align-items: center; gap: 4px;`;

    const label = document.createElement('span');
    label.textContent = icon;
    label.style.fontSize = '1.2rem';

    const track = document.createElement('div');
    track.style.cssText = `
      width: 8px;
      height: 60px;
      background: rgba(255,255,255,0.15);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    `;

    const fill = document.createElement('div');
    fill.id = `stat-${id}`;
    fill.style.cssText = `
      position: absolute;
      bottom: 0;
      width: 100%;
      background: ${color};
      border-radius: 4px;
      transition: height 0.3s;
    `;
    fill.style.height = '80%';

    track.appendChild(fill);
    bar.appendChild(track);
    bar.appendChild(label);
    this.statsContainer.appendChild(bar);
  }

  /**
   * Update HUD with current player stats and time.
   */
  update(stats: PlayerStats, formattedTime: string, dayPhase: string): void {
    // Update clock
    this.clockEl.textContent = formattedTime;

    // Update stat bars
    this.updateBar('hydration', stats.hydration);
    this.updateBar('hunger', stats.hunger);
    this.updateBar('energy', stats.energy);
    // Stress bar is inverted (higher = worse)
    this.updateBar('stress', stats.stress);
  }

  private updateBar(id: string, value: number): void {
    const fill = document.getElementById(`stat-${id}`);
    if (fill) {
      const pct = id === 'stress' ? value : value;
      fill.style.height = `${pct}%`;

      // Flash warning when critical
      if ((id === 'stress' && value > 85) || (id !== 'stress' && value < 15)) {
        fill.style.animation = 'pulse 0.5s infinite alternate';
      } else {
        fill.style.animation = 'none';
      }
    }
  }

  showMessage(text: string, duration: number = 3000): void {
    this.messageEl.textContent = text;
    this.messageEl.style.opacity = '1';

    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      this.messageEl.style.opacity = '0';
    }, duration);
  }

  show(): void {
    this.container.style.display = 'flex';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  dispose(): void {
    this.container.innerHTML = '';
  }
}
