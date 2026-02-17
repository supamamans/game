/**
 * ChildStatusPanel - Shows mood indicators for each child.
 *
 * Displays small icons at the top of the screen showing each child's
 * current emotional state at a glance.
 */

import { EventBus } from '@core/EventBus';

export interface ChildStatusInfo {
  id: string;
  name: string;
  ageGroup: string;
  happiness: number;
  state: string;
}

export class ChildStatusPanel {
  private container: HTMLElement;
  private childElements: Map<string, HTMLElement> = new Map();

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'child-status-panel';
    this.container.style.cssText = `
      position: absolute;
      top: 16px;
      left: 16px;
      display: flex;
      gap: 8px;
      pointer-events: none;
    `;
    document.getElementById('ui-overlay')!.appendChild(this.container);
  }

  /**
   * Add a child to the panel.
   */
  addChild(id: string, name: string, ageGroup: string): void {
    const el = document.createElement('div');
    el.style.cssText = `
      background: rgba(0,0,0,0.6);
      border-radius: 6px;
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-width: 60px;
    `;

    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size: 0.75rem; color: #ccc;';
    nameEl.textContent = name;

    const emojiEl = document.createElement('div');
    emojiEl.className = 'child-emoji';
    emojiEl.style.fontSize = '1.5rem';
    emojiEl.textContent = this.getAgeEmoji(ageGroup);

    const moodBar = document.createElement('div');
    moodBar.style.cssText = 'width: 40px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px;';
    const fill = document.createElement('div');
    fill.className = 'mood-fill';
    fill.style.cssText = 'width: 80%; height: 100%; background: #4c4; border-radius: 2px; transition: width 0.5s, background 0.5s;';
    moodBar.appendChild(fill);

    el.appendChild(nameEl);
    el.appendChild(emojiEl);
    el.appendChild(moodBar);

    this.container.appendChild(el);
    this.childElements.set(id, el);
  }

  /**
   * Update a child's displayed status.
   */
  updateChild(info: ChildStatusInfo): void {
    const el = this.childElements.get(info.id);
    if (!el) return;

    const emoji = el.querySelector('.child-emoji') as HTMLElement;
    const fill = el.querySelector('.mood-fill') as HTMLElement;

    if (emoji) emoji.textContent = this.getStateEmoji(info.state);
    if (fill) {
      fill.style.width = `${info.happiness * 100}%`;
      fill.style.background = info.happiness > 0.6 ? '#4c4' :
        info.happiness > 0.3 ? '#cc4' : '#f44';
    }
  }

  private getAgeEmoji(age: string): string {
    switch (age) {
      case 'infant': return '👶';
      case 'toddler': return '🧒';
      case 'child': return '👦';
      default: return '👤';
    }
  }

  private getStateEmoji(state: string): string {
    switch (state) {
      case 'sleeping': return '😴';
      case 'content': return '😊';
      case 'needy': return '😟';
      case 'upset': return '😢';
      case 'tantrum': return '😡';
      case 'eating': return '😋';
      case 'playing': return '😄';
      default: return '😊';
    }
  }

  dispose(): void {
    this.container.remove();
  }
}
