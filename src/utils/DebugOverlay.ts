/**
 * DebugOverlay - Development-only FPS counter and stats display.
 */

export class DebugOverlay {
  private container: HTMLDivElement;
  private fpsEl: HTMLSpanElement;
  private frames: number = 0;
  private lastTime: number = performance.now();
  private enabled: boolean = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 8px;
      right: 8px;
      background: rgba(0,0,0,0.7);
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 4px;
      z-index: 9999;
      pointer-events: none;
      display: none;
    `;

    this.fpsEl = document.createElement('span');
    this.container.appendChild(this.fpsEl);
    document.body.appendChild(this.container);
  }

  toggle(): void {
    this.enabled = !this.enabled;
    this.container.style.display = this.enabled ? 'block' : 'none';
  }

  update(): void {
    if (!this.enabled) return;

    this.frames++;
    const now = performance.now();
    const elapsed = now - this.lastTime;

    if (elapsed >= 1000) {
      const fps = Math.round((this.frames * 1000) / elapsed);
      this.fpsEl.textContent = `FPS: ${fps}`;
      this.frames = 0;
      this.lastTime = now;
    }
  }

  dispose(): void {
    this.container.remove();
  }
}
