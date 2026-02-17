/**
 * DoorSystem - Door state management, animation, and physics.
 *
 * Doors can be opened/closed by the player or children.
 * Uses simple rotation animation around hinge point.
 */

import * as THREE from 'three';
import { DoorInfo } from './RoomTypes';
import { EventBus } from '@core/EventBus';
import { lerp } from '@utils/MathUtils';

const DOOR_HEIGHT = 2.2;
const DOOR_THICKNESS = 0.05;
const OPEN_ANGLE = Math.PI / 2;
const ANIM_SPEED = 3; // radians per second

interface DoorState {
  info: DoorInfo;
  mesh: THREE.Group;
  currentAngle: number;
  targetAngle: number;
  isAnimating: boolean;
}

export class DoorSystem {
  private doors: Map<string, DoorState> = new Map();
  public group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'DoorSystem';
  }

  /**
   * Create visual door meshes for all doors in the layout.
   */
  createDoors(doorInfos: DoorInfo[]): void {
    for (const info of doorInfos) {
      const key = `${info.roomA}-${info.roomB}`;
      const doorGroup = new THREE.Group();
      doorGroup.name = `door_${key}`;
      doorGroup.position.set(info.worldX, 0, info.worldZ);
      doorGroup.rotation.y = info.rotation;

      // Door frame
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.5 });

      // Left jamb
      const leftJamb = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, DOOR_HEIGHT, 0.12),
        frameMat,
      );
      leftJamb.position.set(-info.width / 2 - 0.03, DOOR_HEIGHT / 2, 0);
      leftJamb.castShadow = true;
      doorGroup.add(leftJamb);

      // Right jamb
      const rightJamb = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, DOOR_HEIGHT, 0.12),
        frameMat,
      );
      rightJamb.position.set(info.width / 2 + 0.03, DOOR_HEIGHT / 2, 0);
      rightJamb.castShadow = true;
      doorGroup.add(rightJamb);

      // Top header
      const header = new THREE.Mesh(
        new THREE.BoxGeometry(info.width + 0.12, 0.06, 0.12),
        frameMat,
      );
      header.position.set(0, DOOR_HEIGHT + 0.03, 0);
      doorGroup.add(header);

      // Door panel (hinged on left side)
      const panelPivot = new THREE.Group();
      panelPivot.position.set(-info.width / 2, 0, 0);

      const doorMat = new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.6 });
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(info.width, DOOR_HEIGHT, DOOR_THICKNESS),
        doorMat,
      );
      panel.position.set(info.width / 2, DOOR_HEIGHT / 2, 0);
      panel.castShadow = true;
      panel.receiveShadow = true;
      panelPivot.add(panel);

      // Door handle
      const handleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.7 });
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.03, 0.06),
        handleMat,
      );
      handle.position.set(info.width - 0.12, DOOR_HEIGHT / 2, DOOR_THICKNESS / 2 + 0.03);
      panelPivot.add(handle);

      doorGroup.add(panelPivot);
      doorGroup.userData = { doorKey: key, panelPivot };

      this.group.add(doorGroup);

      this.doors.set(key, {
        info,
        mesh: doorGroup,
        currentAngle: 0,
        targetAngle: 0,
        isAnimating: false,
      });
    }
  }

  /**
   * Toggle a door open/closed.
   */
  toggleDoor(roomA: number, roomB: number): void {
    const key = `${Math.min(roomA, roomB)}-${Math.max(roomA, roomB)}`;
    const state = this.doors.get(key);
    if (!state) return;

    state.info.isOpen = !state.info.isOpen;
    state.targetAngle = state.info.isOpen ? OPEN_ANGLE : 0;
    state.isAnimating = true;

    EventBus.emit('door.toggle', key, state.info.isOpen);
  }

  /**
   * Toggle nearest door (used by interaction system).
   */
  toggleNearest(worldX: number, worldZ: number): boolean {
    let nearest: DoorState | null = null;
    let minDist = Infinity;

    for (const state of this.doors.values()) {
      const dx = state.info.worldX - worldX;
      const dz = state.info.worldZ - worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist && dist < 2.0) {
        minDist = dist;
        nearest = state;
      }
    }

    if (nearest) {
      nearest.info.isOpen = !nearest.info.isOpen;
      nearest.targetAngle = nearest.info.isOpen ? OPEN_ANGLE : 0;
      nearest.isAnimating = true;
      const key = `${nearest.info.roomA}-${nearest.info.roomB}`;
      EventBus.emit('door.toggle', key, nearest.info.isOpen);
      return true;
    }
    return false;
  }

  /**
   * Animate doors each frame.
   */
  update(dt: number): void {
    for (const state of this.doors.values()) {
      if (!state.isAnimating) continue;

      const diff = state.targetAngle - state.currentAngle;
      if (Math.abs(diff) < 0.01) {
        state.currentAngle = state.targetAngle;
        state.isAnimating = false;
      } else {
        state.currentAngle = lerp(state.currentAngle, state.targetAngle, ANIM_SPEED * dt);
      }

      // Apply rotation to panel pivot
      const panelPivot = state.mesh.userData.panelPivot as THREE.Group;
      if (panelPivot) {
        panelPivot.rotation.y = state.currentAngle;
      }
    }
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
    });
  }
}
