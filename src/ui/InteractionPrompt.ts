/**
 * InteractionPrompt - "Press E to..." context display.
 */

import { InteractionContext } from '@interaction/InteractionManager';

export class InteractionPrompt {
  private element: HTMLElement;

  constructor() {
    this.element = document.getElementById('interaction-prompt')!;
  }

  /**
   * Update the prompt based on current interaction context.
   */
  update(context: InteractionContext): void {
    if (!context.target || context.availableActions.length === 0) {
      this.hide();
      return;
    }

    let text = '';
    if (context.primaryAction) {
      text += `[E] ${context.primaryAction.label}`;
    }
    if (context.secondaryAction) {
      if (text) text += '  ';
      text += `[Q] ${context.secondaryAction.label}`;
    }

    this.element.textContent = text;
    this.element.style.display = 'block';
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  dispose(): void {
    this.hide();
  }
}
