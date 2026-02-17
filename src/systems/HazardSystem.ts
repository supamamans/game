/**
 * HazardSystem - Hazard detection, warning, and QTE triggers.
 *
 * Monitors the game world for dangerous situations involving children
 * and triggers appropriate warnings or emergency events.
 */

import { EventBus } from '@core/EventBus';

export enum HazardType {
  HotStove = 'hot_stove',
  SharpObject = 'sharp_object',
  CleaningSupplies = 'cleaning_supplies',
  Bathtub = 'bathtub_unattended',
  HotWater = 'hot_water',
  Electrical = 'electrical_outlet',
  FallingFurniture = 'falling_furniture',
  SmallObjects = 'small_objects',
  OpenWindow = 'open_window',
}

export enum HazardSeverity {
  Minor = 'minor',       // -5% safety score
  Serious = 'serious',   // -15% safety score
  Critical = 'critical', // -25% safety score
}

export interface HazardEvent {
  type: HazardType;
  severity: HazardSeverity;
  childId: string;
  resolved: boolean;
  qteTriggered: boolean;
  timestamp: number;
}

const HAZARD_CONFIG: Record<HazardType, { severity: HazardSeverity; qteTime: number; qteKey: string }> = {
  [HazardType.HotStove]: { severity: HazardSeverity.Serious, qteTime: 4, qteKey: 'KeyE' },
  [HazardType.SharpObject]: { severity: HazardSeverity.Serious, qteTime: 3, qteKey: 'KeyE' },
  [HazardType.CleaningSupplies]: { severity: HazardSeverity.Critical, qteTime: 5, qteKey: 'KeyE' },
  [HazardType.Bathtub]: { severity: HazardSeverity.Critical, qteTime: 5, qteKey: 'KeyE' },
  [HazardType.HotWater]: { severity: HazardSeverity.Serious, qteTime: 3, qteKey: 'KeyE' },
  [HazardType.Electrical]: { severity: HazardSeverity.Serious, qteTime: 3, qteKey: 'KeyE' },
  [HazardType.FallingFurniture]: { severity: HazardSeverity.Critical, qteTime: 3, qteKey: 'KeyF' },
  [HazardType.SmallObjects]: { severity: HazardSeverity.Serious, qteTime: 4, qteKey: 'KeyE' },
  [HazardType.OpenWindow]: { severity: HazardSeverity.Critical, qteTime: 4, qteKey: 'KeyE' },
};

export class HazardSystem {
  private activeHazards: Map<string, HazardEvent> = new Map();
  private hazardLog: HazardEvent[] = [];
  private bathUnattendedTimer: Map<string, number> = new Map();
  private gameTime: number = 0;

  private readonly BATH_DANGER_TIME = 30; // seconds before drowning danger

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    // Listen for child proximity to hazards
    EventBus.on('hazard.childNear', (childId: unknown, hazardType: unknown) => {
      this.triggerHazard(childId as string, hazardType as HazardType);
    });

    // Bath unattended tracking
    EventBus.on('hygiene.childInWater', (childId: unknown, dt: unknown) => {
      const timer = (this.bathUnattendedTimer.get(childId as string) ?? 0) + (dt as number);
      this.bathUnattendedTimer.set(childId as string, timer);

      if (timer > this.BATH_DANGER_TIME) {
        this.triggerHazard(childId as string, HazardType.Bathtub);
      } else if (timer > this.BATH_DANGER_TIME * 0.7) {
        EventBus.emit('hazard.warning', childId, HazardType.Bathtub);
      }
    });

    // Reset bath timer when child is attended
    EventBus.on('hygiene.childOutOfBath', (childId: unknown) => {
      this.bathUnattendedTimer.delete(childId as string);
    });

    // QTE results
    EventBus.on('qte.success', (config: unknown) => {
      const c = config as { hazardType?: string; childId?: string };
      if (c.hazardType) {
        this.resolveHazard(c.childId ?? '', true);
      }
    });

    EventBus.on('qte.fail', (config: unknown) => {
      const c = config as { hazardType?: string; childId?: string };
      if (c.hazardType) {
        this.resolveHazard(c.childId ?? '', false);
      }
    });
  }

  /**
   * Trigger a hazard event for a child.
   */
  triggerHazard(childId: string, type: HazardType): void {
    const key = `${childId}_${type}`;
    if (this.activeHazards.has(key)) return; // Already active

    const config = HAZARD_CONFIG[type];
    const event: HazardEvent = {
      type,
      severity: config.severity,
      childId,
      resolved: false,
      qteTriggered: false,
      timestamp: this.gameTime,
    };

    this.activeHazards.set(key, event);
    this.hazardLog.push(event);

    // Emit warning
    EventBus.emit('hazard.triggered', childId, type, config.severity);
    EventBus.emit('audio.play', 'hazard_warning');

    // Trigger QTE
    event.qteTriggered = true;
    EventBus.emit('qte.trigger', {
      key: config.qteKey,
      displayKey: config.qteKey.replace('Key', ''),
      timeLimit: config.qteTime,
      hazardType: type,
      childId,
    });
  }

  /**
   * Resolve a hazard (QTE success or failure).
   */
  private resolveHazard(childId: string, success: boolean): void {
    for (const [key, event] of this.activeHazards.entries()) {
      if (event.childId === childId && !event.resolved) {
        event.resolved = true;
        this.activeHazards.delete(key);

        if (success) {
          EventBus.emit('hazard.resolved', childId, event.type, 'success');
          EventBus.emit('score.event', 'hazard_averted');
        } else {
          EventBus.emit('hazard.resolved', childId, event.type, 'fail');
          EventBus.emit('score.incident', event.severity);
          // Drop trust to 0 for serious incidents
          if (event.severity === HazardSeverity.Critical) {
            EventBus.emit('child.trustDrop', childId, 0);
          }
        }
        break;
      }
    }
  }

  /**
   * Update hazard detection each timestep.
   */
  update(dt: number): void {
    this.gameTime += dt;
  }

  /**
   * Get all logged hazard events for scoring.
   */
  getHazardLog(): HazardEvent[] {
    return [...this.hazardLog];
  }

  /**
   * Calculate safety score (0-100).
   */
  calculateSafetyScore(): number {
    let score = 100;
    for (const event of this.hazardLog) {
      if (!event.resolved) continue;
      switch (event.severity) {
        case HazardSeverity.Minor: score -= 5; break;
        case HazardSeverity.Serious: score -= 15; break;
        case HazardSeverity.Critical: score -= 25; break;
      }
    }
    return Math.max(0, score);
  }
}
