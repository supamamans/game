/**
 * RayCaster - Camera-centered ray-cast for interaction detection.
 *
 * Every frame, casts a ray from the camera center and checks against
 * the interaction collider layer to find what the player is looking at.
 */

import * as THREE from 'three';

export interface RayHit {
  object: THREE.Object3D;
  point: THREE.Vector3;
  distance: number;
  normal: THREE.Vector3;
}

const MAX_INTERACT_DISTANCE = 2.5;

export class RayCaster {
  private raycaster: THREE.Raycaster;
  private camera: THREE.PerspectiveCamera;
  private interactables: THREE.Object3D[] = [];

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = MAX_INTERACT_DISTANCE;
  }

  /**
   * Register objects that can be interacted with.
   */
  setInteractables(objects: THREE.Object3D[]): void {
    this.interactables = objects;
  }

  /**
   * Add a single interactable object.
   */
  addInteractable(obj: THREE.Object3D): void {
    this.interactables.push(obj);
  }

  /**
   * Remove an interactable.
   */
  removeInteractable(obj: THREE.Object3D): void {
    const idx = this.interactables.indexOf(obj);
    if (idx !== -1) this.interactables.splice(idx, 1);
  }

  /**
   * Cast a ray from camera center and return the closest hit, if any.
   */
  cast(): RayHit | null {
    // Ray from screen center
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const intersects = this.raycaster.intersectObjects(this.interactables, true);

    if (intersects.length === 0) return null;

    const hit = intersects[0];
    return {
      object: this.findInteractableParent(hit.object) ?? hit.object,
      point: hit.point,
      distance: hit.distance,
      normal: hit.face?.normal ?? new THREE.Vector3(0, 1, 0),
    };
  }

  /**
   * Walk up the parent chain to find the named interactable group.
   */
  private findInteractableParent(obj: THREE.Object3D): THREE.Object3D | null {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (this.interactables.includes(current)) return current;
      current = current.parent;
    }
    return null;
  }

  dispose(): void {
    this.interactables = [];
  }
}
