/**
 * QTEOverlay - Quick Time Event display for emergencies.
 *
 * Shows a key prompt that the player must press within a time limit
 * to prevent a hazard from escalating.
 */

import { EventBus } from '@core/EventBus';

export interface QTEConfig {
  key: string;
  displayKey: string;
  timeLimit: number; // seconds
  hazardType: string;
  childId?: string;
}

export class QTEOverlay {
  private overlay: HTMLElement;
  private timerBar: HTMLElement;
  private keyDisplay: HTMLElement;
  private active: boolean = false;
  private config: QTEConfig | null = null;
  private elapsed: number = 0;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'qte-overlay';
    this.overlay.style.cssText = `
      display: none;
      position: absolute;
      top: 30%;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      z-index: 55;
      pointer-events: none;
    `;

    const label = document.createElement('div');
    label.style.cssText = 'color: #ff4444; font-size: 1.2rem; margin-bottom: 10px; text-shadow: 0 0 10px #f00;';
    label.textContent = 'EMERGENCY!';
    this.overlay.appendChild(label);

    this.keyDisplay = document.createElement('div');
    this.keyDisplay.style.cssText = `
      font-size: 3rem; color: #fff;
      border: 3px solid #fff; border-radius: 8px;
      display: inline-block; padding: 10px 25px;
      background: rgba(0,0,0,0.7);
      animation: pulse 0.5s infinite alternate;
    `;
    this.overlay.appendChild(this.keyDisplay);

    this.timerBar = document.createElement('div');
    this.timerBar.style.cssText = `
      width: 200px; height: 8px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px; margin: 12px auto 0;
      overflow: hidden;
    `;
    const fill = document.createElement('div');
    fill.id = 'qte-timer-fill';
    fill.style.cssText = 'width: 100%; height: 100%; background: #ff4444; transition: width 0.1s;';
    this.timerBar.appendChild(fill);
    this.overlay.appendChild(this.timerBar);

    document.getElementById('ui-overlay')!.appendChild(this.overlay);

    document.addEventListener('keydown', (e) => this.onKeyPress(e));
  }

  /**
   * Start a QTE.
   */
  start(config: QTEConfig): void {
    this.config = config;
    this.active = true;
    this.elapsed = 0;
    this.keyDisplay.textContent = config.displayKey;
    this.overlay.style.display = 'block';
    EventBus.emit('qte.start', config);
  }

  /**
   * Update the QTE timer.
   */
  update(dt: number): void {
    if (!this.active || !this.config) return;

    this.elapsed += dt;
    const remaining = 1 - this.elapsed / this.config.timeLimit;

    const fill = document.getElementById('qte-timer-fill');
    if (fill) {
      fill.style.width = `${Math.max(0, remaining * 100)}%`;
    }

    if (this.elapsed >= this.config.timeLimit) {
      this.fail();
    }
  }

  private onKeyPress(e: KeyboardEvent): void {
    if (!this.active || !this.config) return;

    if (e.code === this.config.key) {
      this.succeed();
    }
  }

  private succeed(): void {
    this.active = false;
    this.overlay.style.display = 'none';
    EventBus.emit('qte.success', this.config);
  }

  private fail(): void {
    this.active = false;
    this.overlay.style.display = 'none';
    EventBus.emit('qte.fail', this.config);
  }

  get isActive(): boolean {
    return this.active;
  }

  dispose(): void {
    this.overlay.remove();
  }
}
