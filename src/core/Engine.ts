/**
 * Engine - Main game loop orchestrator.
 *
 * Fixed timestep for physics/AI (60 Hz), variable for rendering.
 * Coordinates all subsystems: renderer, camera, clock, world.
 */

import * as THREE from 'three';
import { GPUTier } from '@renderer/detectGPU';
import { WebGPURenderer } from '@renderer/WebGPURenderer';
import { FallbackRenderer } from '@renderer/FallbackRenderer';
import { FirstPersonCamera } from '@renderer/FirstPersonCamera';
import { Clock } from './Clock';
import { EventBus } from './EventBus';
import { TestRoom } from '@world/TestRoom';
import { Lighting } from '@world/Lighting';
import { DebugOverlay } from '@utils/DebugOverlay';

const PHYSICS_STEP = 1 / 60; // 60 Hz fixed timestep
const MAX_ACCUMULATOR = 0.2; // Prevent spiral of death

export class Engine {
  private rendererWrapper: WebGPURenderer;
  private cameraController: FirstPersonCamera;
  private clock: Clock;
  private debugOverlay: DebugOverlay;
  private testRoom: TestRoom | null = null;
  private lighting: Lighting | null = null;

  private lastTime: number = 0;
  private accumulator: number = 0;
  private running: boolean = false;
  private animFrameId: number = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private gpuTier: GPUTier,
  ) {
    // Choose renderer based on GPU tier
    if (gpuTier === GPUTier.WebGPU) {
      this.rendererWrapper = new WebGPURenderer(canvas);
    } else {
      this.rendererWrapper = new FallbackRenderer(canvas);
    }

    this.cameraController = new FirstPersonCamera(this.rendererWrapper.camera);
    this.clock = new Clock();
    this.debugOverlay = new DebugOverlay();

    // Toggle debug overlay with backtick
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') {
        this.debugOverlay.toggle();
      }
    });
  }

  /**
   * Initialize the game world and systems.
   */
  async init(): Promise<void> {
    // Build the test room
    this.testRoom = new TestRoom();
    this.rendererWrapper.scene.add(this.testRoom.group);

    // Set room bounds for camera collision (test room is 8x10, centered at origin)
    this.cameraController.setRoomBounds(
      new THREE.Vector3(-4, 0, -5),
      new THREE.Vector3(4, 3, 5),
    );

    // Set up lighting
    this.lighting = new Lighting();
    this.rendererWrapper.scene.add(this.lighting.group);

    // Request pointer lock on canvas click
    this.canvas.addEventListener('click', () => {
      if (!this.cameraController.locked) {
        this.cameraController.requestLock(this.canvas);
      }
    });

    // Show crosshair and HUD when pointer is locked
    EventBus.on('camera.lockChange', (locked: unknown) => {
      const crosshair = document.getElementById('crosshair');
      const hud = document.getElementById('hud');
      if (crosshair) crosshair.style.display = locked ? 'block' : 'none';
      if (hud) hud.style.display = locked ? 'flex' : 'none';
    });

    // Listen for day end
    EventBus.on('clock.dayEnd', () => {
      console.log('Day is over! Parents are home.');
      // Phase 12 will implement the score screen
    });

    console.log(`Engine initialized (GPU: ${this.gpuTier})`);
  }

  /**
   * Start the game loop.
   */
  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  /**
   * Stop the game loop.
   */
  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    const dt = (timestamp - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = timestamp;
    this.accumulator += Math.min(dt, MAX_ACCUMULATOR);

    // Fixed-step updates (physics, AI, needs, clock)
    while (this.accumulator >= PHYSICS_STEP) {
      this.fixedUpdate(PHYSICS_STEP);
      this.accumulator -= PHYSICS_STEP;
    }

    // Variable-step updates (rendering, camera, audio, UI)
    this.variableUpdate(dt);

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Fixed timestep update - physics, AI, game logic.
   */
  private fixedUpdate(dt: number): void {
    this.clock.advance(dt);
    // Phase 4+: physics step
    // Phase 7: needs system update
    // Phase 8: child AI update
    // Phase 10: hazard system check
  }

  /**
   * Variable timestep update - rendering, camera, visual.
   */
  private variableUpdate(dt: number): void {
    this.cameraController.update(dt);
    this.lighting?.update(this.clock.hours);
    this.rendererWrapper.render();
    this.debugOverlay.update();
  }

  dispose(): void {
    this.stop();
    this.testRoom?.dispose();
    this.lighting?.dispose();
    this.rendererWrapper.dispose();
    this.cameraController.dispose();
    this.debugOverlay.dispose();
    EventBus.clear();
  }
}
