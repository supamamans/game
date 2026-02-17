/**
 * ScoreScreen - End-of-day results display with star rating.
 */

import { EventBus } from '@core/EventBus';

export interface ScoreData {
  childHappiness: number; // 0-100
  safety: number; // 0-100
  houseCondition: number; // 0-100
  playerHealth: number; // 0-100
  bonusObjectives: number; // 0-100
  totalScore: number; // 0-100
  stars: number; // 1-5
  specialEnding: string | null;
}

export class ScoreScreen {
  private overlay: HTMLElement;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'score-screen';
    this.overlay.style.cssText = `
      display: none;
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9);
      z-index: 60;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-family: 'Segoe UI', sans-serif;
    `;
    document.getElementById('ui-overlay')!.appendChild(this.overlay);
  }

  show(data: ScoreData): void {
    this.overlay.innerHTML = '';
    this.overlay.style.display = 'flex';

    if (data.specialEnding) {
      const ending = document.createElement('h2');
      ending.textContent = data.specialEnding;
      ending.style.cssText = 'color: #ff6666; font-size: 1.5rem; margin-bottom: 10px;';
      this.overlay.appendChild(ending);
    }

    const title = document.createElement('h1');
    title.textContent = 'Day Complete';
    title.style.cssText = 'font-size: 2.5rem; margin-bottom: 20px;';
    this.overlay.appendChild(title);

    // Stars
    const starsEl = document.createElement('div');
    starsEl.style.cssText = 'font-size: 3rem; margin-bottom: 20px;';
    starsEl.textContent = '⭐'.repeat(data.stars) + '☆'.repeat(5 - data.stars);
    this.overlay.appendChild(starsEl);

    // Score breakdown
    const breakdown = [
      ['Child Happiness', data.childHappiness, '40%'],
      ['Safety', data.safety, '25%'],
      ['House Condition', data.houseCondition, '15%'],
      ['Your Health', data.playerHealth, '10%'],
      ['Bonus Objectives', data.bonusObjectives, '10%'],
    ];

    for (const [label, value, weight] of breakdown) {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; width: 300px; margin: 4px 0;';
      row.innerHTML = `
        <span>${label} (${weight})</span>
        <span style="color: ${(value as number) > 60 ? '#4c4' : '#f44'}">${Math.round(value as number)}%</span>
      `;
      this.overlay.appendChild(row);
    }

    // Total
    const total = document.createElement('div');
    total.style.cssText = 'font-size: 1.8rem; margin-top: 20px; font-weight: bold;';
    total.textContent = `Total: ${Math.round(data.totalScore)}%`;
    this.overlay.appendChild(total);

    // Rating label
    const ratingLabels = ['Disaster', 'Needs Improvement', 'Good Enough', 'Great Job', 'Perfect Guardian'];
    const ratingEl = document.createElement('div');
    ratingEl.style.cssText = 'font-size: 1.2rem; color: #aaa; margin-top: 8px;';
    ratingEl.textContent = ratingLabels[data.stars - 1] ?? '';
    this.overlay.appendChild(ratingEl);

    // Restart button
    const btn = document.createElement('button');
    btn.textContent = 'Play Again';
    btn.style.cssText = `
      margin-top: 30px; padding: 12px 40px; font-size: 1.2rem;
      border: 2px solid #fff; background: transparent; color: #fff;
      cursor: pointer; border-radius: 4px; pointer-events: auto;
    `;
    btn.addEventListener('click', () => {
      this.hide();
      EventBus.emit('game.restart');
    });
    this.overlay.appendChild(btn);
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }

  dispose(): void {
    this.overlay.remove();
  }
}
