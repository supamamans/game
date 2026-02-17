/**
 * PhysicsSystem - Rapier WebWorker bridge stub.
 *
 * Will integrate Rapier 3D WASM for rigid body physics.
 * For now, provides a stub interface used by other systems.
 * Actual Rapier integration requires adding the dependency.
 */

import * as THREE from 'three';
import { EventBus } from '@core/EventBus';

export interface CollisionEvent {
  bodyA: string;
  bodyB: string;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  impulse: number;
}

export interface PhysicsBody {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  isStatic: boolean;
  isSensor: boolean;
}

export class PhysicsSystem {
  private bodies: Map<string, PhysicsBody> = new Map();

  async init(): Promise<void> {
    // In a full implementation, this would load Rapier WASM
    // and set up the physics world in a WebWorker
    console.log('PhysicsSystem: stub initialized (Rapier integration pending)');
  }

  /**
   * Add a static collision body (walls, furniture).
   */
  addStaticBody(id: string, position: THREE.Vector3, size: THREE.Vector3): void {
    this.bodies.set(id, {
      id,
      position: position.clone(),
      rotation: new THREE.Quaternion(),
      isStatic: true,
      isSensor: false,
    });
  }

  /**
   * Add a dynamic body (throwable objects).
   */
  addDynamicBody(id: string, position: THREE.Vector3): void {
    this.bodies.set(id, {
      id,
      position: position.clone(),
      rotation: new THREE.Quaternion(),
      isStatic: false,
      isSensor: false,
    });
  }

  /**
   * Add a sensor (trigger zone for hazard detection).
   */
  addSensor(id: string, position: THREE.Vector3, radius: number): void {
    this.bodies.set(id, {
      id,
      position: position.clone(),
      rotation: new THREE.Quaternion(),
      isStatic: true,
      isSensor: true,
    });
  }

  /**
   * Remove a body.
   */
  removeBody(id: string): void {
    this.bodies.delete(id);
  }

  /**
   * Step the physics simulation.
   */
  step(_dt: number): void {
    // Stub: will call Rapier world.step() in full implementation
  }

  /**
   * Simple distance-based collision check (placeholder).
   */
  checkProximity(position: THREE.Vector3, radius: number): string[] {
    const hits: string[] = [];
    for (const body of this.bodies.values()) {
      const dist = position.distanceTo(body.position);
      if (dist < radius) {
        hits.push(body.id);
      }
    }
    return hits;
  }

  getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id);
  }

  dispose(): void {
    this.bodies.clear();
  }
}
