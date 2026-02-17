/**
 * EmergencySystem - Critical event handling and QTE coordination.
 *
 * Bridges the HazardSystem with the QTEOverlay UI.
 */

import { EventBus } from '@core/EventBus';
import { QTEOverlay, QTEConfig } from '@ui/QTEOverlay';

export class EmergencySystem {
  private qte: QTEOverlay;
  private activeEmergency: boolean = false;

  constructor() {
    this.qte = new QTEOverlay();

    EventBus.on('qte.trigger', (config: unknown) => {
      if (this.activeEmergency) return; // One at a time
      this.activeEmergency = true;
      this.qte.start(config as QTEConfig);
    });

    EventBus.on('qte.success', () => {
      this.activeEmergency = false;
    });

    EventBus.on('qte.fail', () => {
      this.activeEmergency = false;
    });
  }

  update(dt: number): void {
    this.qte.update(dt);
  }

  get isEmergencyActive(): boolean {
    return this.activeEmergency;
  }

  dispose(): void {
    this.qte.dispose();
  }
}
