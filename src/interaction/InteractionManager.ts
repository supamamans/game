/**
 * InteractionManager - Context-aware action resolution.
 *
 * Determines what actions are available based on:
 * - What the player is looking at (ray-cast hit)
 * - What the player is holding (hand system)
 * - Object metadata from the ObjectRegistry
 * - Current game context
 */

import * as THREE from 'three';
import { RayCaster, RayHit } from './RayCaster';
import { ObjectRegistry, ObjectState, ObjectAction } from '@world/ObjectRegistry';
import { EventBus } from '@core/EventBus';

export interface InteractionContext {
  target: ObjectState | null;
  hit: RayHit | null;
  availableActions: ObjectAction[];
  primaryAction: ObjectAction | null;
  secondaryAction: ObjectAction | null;
}

export class InteractionManager {
  private rayCaster: RayCaster;
  private objectRegistry: ObjectRegistry;
  private currentContext: InteractionContext = {
    target: null,
    hit: null,
    availableActions: [],
    primaryAction: null,
    secondaryAction: null,
  };

  /** Map of Three.js object names to registry IDs */
  private meshToObjectId: Map<string, string> = new Map();

  constructor(rayCaster: RayCaster, objectRegistry: ObjectRegistry) {
    this.rayCaster = rayCaster;
    this.objectRegistry = objectRegistry;

    this.setupInputListeners();
  }

  /**
   * Link a mesh name to an object registry ID.
   */
  registerMesh(meshName: string, objectId: string): void {
    this.meshToObjectId.set(meshName, objectId);
  }

  /**
   * Update interaction context each frame.
   */
  update(): InteractionContext {
    const hit = this.rayCaster.cast();

    if (!hit) {
      this.clearContext();
      return this.currentContext;
    }

    // Find the object in the registry
    const objectId = this.findObjectId(hit.object);
    const objectState = objectId ? this.objectRegistry.get(objectId) : null;

    if (!objectState) {
      this.clearContext();
      this.currentContext.hit = hit;
      return this.currentContext;
    }

    // Build available actions
    const actions = objectState.actions.filter(
      (a) => !a.condition || a.condition(objectState),
    );

    this.currentContext = {
      target: objectState,
      hit,
      availableActions: actions,
      primaryAction: actions.find((a) => a.key === 'E') ?? null,
      secondaryAction: actions.find((a) => a.key === 'Q') ?? null,
    };

    return this.currentContext;
  }

  getContext(): InteractionContext {
    return this.currentContext;
  }

  private findObjectId(obj: THREE.Object3D): string | null {
    // Check the object and its parents for a registered name
    let current: THREE.Object3D | null = obj;
    while (current) {
      const id = this.meshToObjectId.get(current.name);
      if (id) return id;
      current = current.parent;
    }
    return null;
  }

  private clearContext(): void {
    this.currentContext = {
      target: null,
      hit: null,
      availableActions: [],
      primaryAction: null,
      secondaryAction: null,
    };
  }

  private setupInputListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE') this.executePrimary();
      if (e.code === 'KeyQ') this.executeSecondary();
    });
  }

  private executePrimary(): void {
    const { target, primaryAction } = this.currentContext;
    if (!target || !primaryAction) return;

    EventBus.emit('interaction.execute', target.id, primaryAction.name, target);
    EventBus.emit(`interaction.${primaryAction.name}`, target.id, target);
  }

  private executeSecondary(): void {
    const { target, secondaryAction } = this.currentContext;
    if (!target || !secondaryAction) return;

    EventBus.emit('interaction.execute', target.id, secondaryAction.name, target);
    EventBus.emit(`interaction.${secondaryAction.name}`, target.id, target);
  }

  dispose(): void {
    // Cleanup listeners handled by garbage collection
  }
}
