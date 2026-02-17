/**
 * HandController - Dual-hand system for carrying items.
 *
 * The player has two hands:
 * - Left hand: small items (bottle, cup, phone)
 * - Right hand: primary interaction (cooking, turning knobs, picking up kids)
 * - Both hands: large items (serving tray, carrying a child)
 */

import * as THREE from 'three';
import { EventBus } from '@core/EventBus';

export enum HandSlot {
  Left = 'left',
  Right = 'right',
  Both = 'both',
}

export interface HeldItem {
  objectId: string;
  name: string;
  slot: HandSlot;
  mesh: THREE.Object3D;
  /** Whether this item requires both hands */
  twoHanded: boolean;
}

export class HandController {
  private leftHand: HeldItem | null = null;
  private rightHand: HeldItem | null = null;
  private bothHands: HeldItem | null = null;

  private handGroup: THREE.Group;
  private camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.handGroup = new THREE.Group();
    this.handGroup.name = 'hands';

    // Visual hand positions relative to camera
    // Will be children of the camera so they follow view
    this.camera.add(this.handGroup);
  }

  get group(): THREE.Group {
    return this.handGroup;
  }

  /**
   * Pick up an item.
   */
  pickup(objectId: string, name: string, mesh: THREE.Object3D, twoHanded: boolean = false): boolean {
    if (twoHanded) {
      if (this.bothHands || this.leftHand || this.rightHand) {
        EventBus.emit('ui.message', 'Hands are full!');
        return false;
      }
      const item: HeldItem = { objectId, name, slot: HandSlot.Both, mesh, twoHanded };
      this.bothHands = item;
      this.attachToHand(mesh, HandSlot.Both);
      EventBus.emit('hand.pickup', item);
      return true;
    }

    // Try right hand first, then left
    if (!this.rightHand && !this.bothHands) {
      const item: HeldItem = { objectId, name, slot: HandSlot.Right, mesh, twoHanded };
      this.rightHand = item;
      this.attachToHand(mesh, HandSlot.Right);
      EventBus.emit('hand.pickup', item);
      return true;
    }

    if (!this.leftHand && !this.bothHands) {
      const item: HeldItem = { objectId, name, slot: HandSlot.Left, mesh, twoHanded };
      this.leftHand = item;
      this.attachToHand(mesh, HandSlot.Left);
      EventBus.emit('hand.pickup', item);
      return true;
    }

    EventBus.emit('ui.message', 'Hands are full!');
    return false;
  }

  /**
   * Drop an item from a specific hand.
   */
  drop(slot: HandSlot): HeldItem | null {
    let item: HeldItem | null = null;

    switch (slot) {
      case HandSlot.Left:
        item = this.leftHand;
        this.leftHand = null;
        break;
      case HandSlot.Right:
        item = this.rightHand;
        this.rightHand = null;
        break;
      case HandSlot.Both:
        item = this.bothHands;
        this.bothHands = null;
        break;
    }

    if (item) {
      this.handGroup.remove(item.mesh);
      EventBus.emit('hand.drop', item);
    }

    return item;
  }

  /**
   * Drop whatever is in the primary (right) hand, or both-hand item.
   */
  dropPrimary(): HeldItem | null {
    if (this.bothHands) return this.drop(HandSlot.Both);
    if (this.rightHand) return this.drop(HandSlot.Right);
    return null;
  }

  /**
   * Check if the player can interact (has at least one free hand).
   */
  canInteract(): boolean {
    return !this.bothHands && (!this.rightHand || !this.leftHand);
  }

  /**
   * Check if a specific slot is occupied.
   */
  isHolding(slot?: HandSlot): boolean {
    if (!slot) return this.leftHand !== null || this.rightHand !== null || this.bothHands !== null;
    switch (slot) {
      case HandSlot.Left: return this.leftHand !== null;
      case HandSlot.Right: return this.rightHand !== null;
      case HandSlot.Both: return this.bothHands !== null;
    }
  }

  /**
   * Get what's in a hand.
   */
  getHeld(slot: HandSlot): HeldItem | null {
    switch (slot) {
      case HandSlot.Left: return this.leftHand;
      case HandSlot.Right: return this.rightHand;
      case HandSlot.Both: return this.bothHands;
    }
  }

  private attachToHand(mesh: THREE.Object3D, slot: HandSlot): void {
    // Position item relative to camera
    const clone = mesh.clone();
    clone.scale.set(0.3, 0.3, 0.3); // Scale down when held

    switch (slot) {
      case HandSlot.Left:
        clone.position.set(-0.3, -0.3, -0.5);
        break;
      case HandSlot.Right:
        clone.position.set(0.3, -0.3, -0.5);
        break;
      case HandSlot.Both:
        clone.position.set(0, -0.25, -0.5);
        break;
    }

    this.handGroup.add(clone);
  }

  dispose(): void {
    this.camera.remove(this.handGroup);
  }
}
