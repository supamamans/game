/**
 * FirstPersonCamera - Pointer-lock first-person camera controller.
 *
 * Handles:
 * - Mouse look via pointer lock
 * - WASD movement with acceleration/deceleration
 * - Sprint (Shift) and crouch (F)
 * - Smooth movement for "weight" feel
 */

import * as THREE from 'three';
import { clamp, damp } from '@utils/MathUtils';
import { EventBus } from '@core/EventBus';

export interface FirstPersonConfig {
  /** Mouse sensitivity multiplier */
  sensitivity: number;
  /** Walk speed in meters/second */
  walkSpeed: number;
  /** Sprint speed multiplier */
  sprintMultiplier: number;
  /** Standing eye height in meters */
  eyeHeight: number;
  /** Crouching eye height in meters */
  crouchHeight: number;
  /** Acceleration toward target velocity */
  acceleration: number;
  /** Deceleration when no input */
  deceleration: number;
}

const DEFAULT_CONFIG: FirstPersonConfig = {
  sensitivity: 0.002,
  walkSpeed: 3.5,
  sprintMultiplier: 1.6,
  eyeHeight: 1.7,
  crouchHeight: 1.0,
  acceleration: 12,
  deceleration: 10,
};

export class FirstPersonCamera {
  private camera: THREE.PerspectiveCamera;
  private config: FirstPersonConfig;

  // Euler angles
  private yaw: number = 0;
  private pitch: number = 0;

  // Movement state
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private inputDir: THREE.Vector3 = new THREE.Vector3();
  private isSprinting: boolean = false;
  private isCrouching: boolean = false;
  private isLocked: boolean = false;

  // Key state
  private keys: Set<string> = new Set();

  // Temp vectors (avoid allocation)
  private forward: THREE.Vector3 = new THREE.Vector3();
  private right: THREE.Vector3 = new THREE.Vector3();
  private euler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(camera: THREE.PerspectiveCamera, config?: Partial<FirstPersonConfig>) {
    this.camera = camera;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  /**
   * Request pointer lock on the game canvas.
   */
  requestLock(element: HTMLElement): void {
    element.requestPointerLock();
  }

  /**
   * Release pointer lock.
   */
  releaseLock(): void {
    document.exitPointerLock();
  }

  get locked(): boolean {
    return this.isLocked;
  }

  private onPointerLockChange = (): void => {
    this.isLocked = document.pointerLockElement !== null;
    EventBus.emit('camera.lockChange', this.isLocked);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.isSprinting = true;
    }
    if (e.code === 'KeyF') {
      this.isCrouching = !this.isCrouching;
      EventBus.emit('player.crouch', this.isCrouching);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.isSprinting = false;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isLocked) return;

    this.yaw -= e.movementX * this.config.sensitivity;
    this.pitch -= e.movementY * this.config.sensitivity;
    this.pitch = clamp(this.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
  };

  /**
   * Update camera position and rotation each frame.
   */
  update(dt: number): void {
    if (!this.isLocked) return;

    // Build input direction from keys
    this.inputDir.set(0, 0, 0);

    if (this.keys.has('KeyW')) this.inputDir.z -= 1;
    if (this.keys.has('KeyS')) this.inputDir.z += 1;
    if (this.keys.has('KeyA')) this.inputDir.x -= 1;
    if (this.keys.has('KeyD')) this.inputDir.x += 1;

    // Normalize diagonal movement
    if (this.inputDir.lengthSq() > 0) {
      this.inputDir.normalize();
    }

    // Calculate forward/right vectors (ignore pitch for movement)
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    // Target velocity
    const speed = this.config.walkSpeed * (this.isSprinting ? this.config.sprintMultiplier : 1);
    const targetX = (this.inputDir.x * this.right.x + this.inputDir.z * this.forward.x) * speed;
    const targetZ = (this.inputDir.x * this.right.z + this.inputDir.z * this.forward.z) * speed;

    // Smooth acceleration/deceleration
    const hasInput = this.inputDir.lengthSq() > 0;
    const rate = hasInput ? this.config.acceleration : this.config.deceleration;

    this.velocity.x = damp(this.velocity.x, targetX, rate, dt);
    this.velocity.z = damp(this.velocity.z, targetZ, rate, dt);

    // Apply movement
    this.camera.position.x += this.velocity.x * dt;
    this.camera.position.z += this.velocity.z * dt;

    // Smooth crouch/stand height transition
    const targetHeight = this.isCrouching ? this.config.crouchHeight : this.config.eyeHeight;
    this.camera.position.y = damp(this.camera.position.y, targetHeight, 8, dt);

    // Apply rotation
    this.euler.set(this.pitch, this.yaw, 0);
    this.camera.quaternion.setFromEuler(this.euler);
  }

  /**
   * Get the camera's world position.
   */
  getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  /**
   * Get the camera's forward direction.
   */
  getForward(): THREE.Vector3 {
    return this.forward.clone();
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
