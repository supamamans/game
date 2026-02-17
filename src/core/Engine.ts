/**
 * Engine - Main game loop orchestrator.
 *
 * Integrates all game systems: renderer, camera, clock, world,
 * children, interactions, hazards, scoring, and UI.
 */

import * as THREE from 'three';
import { GPUTier } from '@renderer/detectGPU';
import { WebGPURenderer } from '@renderer/WebGPURenderer';
import { FallbackRenderer } from '@renderer/FallbackRenderer';
import { FirstPersonCamera } from '@renderer/FirstPersonCamera';
import { Clock } from './Clock';
import { EventBus } from './EventBus';
import { DebugOverlay } from '@utils/DebugOverlay';
import { Difficulty, DIFFICULTY_CONFIGS } from '@world/RoomTypes';

// Entities
import { Child } from '@entities/Child';
import { ChildAI } from '@entities/ChildAI';
import { ChildSpeech } from '@entities/ChildSpeech';
import { Player } from '@entities/Player';

// Systems
import { NeedsSystem } from '@systems/NeedsSystem';
import { HazardSystem } from '@systems/HazardSystem';
import { ScoringSystem } from '@systems/ScoringSystem';
import { ChildInteraction } from '@systems/ChildInteraction';

// UI
import { HUD } from '@ui/HUD';
import { ChildStatusPanel } from '@ui/ChildStatusPanel';
import { PauseMenu } from '@ui/PauseMenu';
import { ScoreScreen } from '@ui/ScoreScreen';

const PHYSICS_STEP = 1 / 60;
const MAX_ACCUMULATOR = 0.2;

// Room dimensions
const ROOM_W = 12;
const ROOM_D = 14;
const ROOM_H = 3;
const WALL_T = 0.15;

export class Engine {
  private rendererWrapper: WebGPURenderer;
  private cameraController: FirstPersonCamera;
  private clock: Clock;
  private debugOverlay: DebugOverlay;

  // Entities
  private player: Player;
  private children: Child[] = [];
  private childAIs: ChildAI[] = [];
  private childSpeech: ChildSpeech;

  // Systems
  private needsSystem: NeedsSystem;
  private hazardSystem: HazardSystem;
  private scoringSystem: ScoringSystem;
  private childInteraction: ChildInteraction;

  // UI
  private hud: HUD;
  private childStatusPanel: ChildStatusPanel;
  private pauseMenu: PauseMenu;
  private scoreScreen: ScoreScreen;

  // State
  private lastTime: number = 0;
  private accumulator: number = 0;
  private running: boolean = false;
  private animFrameId: number = 0;
  private seed: string;
  private difficulty: Difficulty;
  private gameOver: boolean = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private gpuTier: GPUTier,
    seed: string,
    difficulty: Difficulty,
  ) {
    this.seed = seed;
    this.difficulty = difficulty;

    // Renderer
    if (gpuTier === GPUTier.WebGPU) {
      this.rendererWrapper = new WebGPURenderer(canvas);
    } else {
      this.rendererWrapper = new FallbackRenderer(canvas);
    }

    this.cameraController = new FirstPersonCamera(this.rendererWrapper.camera);
    this.clock = new Clock();
    this.debugOverlay = new DebugOverlay();

    // Player
    this.player = new Player();
    this.childSpeech = new ChildSpeech();

    // Systems
    this.needsSystem = new NeedsSystem(this.player);
    this.hazardSystem = new HazardSystem();
    this.childInteraction = new ChildInteraction();
    this.scoringSystem = new ScoringSystem(1);

    // UI
    this.hud = new HUD();
    this.childStatusPanel = new ChildStatusPanel();
    this.pauseMenu = new PauseMenu();
    this.scoreScreen = new ScoreScreen();

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') this.debugOverlay.toggle();
    });
  }

  async init(): Promise<void> {
    const scene = this.rendererWrapper.scene;
    const config = DIFFICULTY_CONFIGS[this.difficulty];

    // ========== BUILD ROOM WITH BOX GEOMETRY (guaranteed visible) ==========

    // Floor
    const floorGeo = new THREE.BoxGeometry(ROOM_W, 0.1, ROOM_D);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.7 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.05, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling
    const ceilGeo = new THREE.BoxGeometry(ROOM_W, 0.1, ROOM_D);
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.position.set(0, ROOM_H + 0.05, 0);
    scene.add(ceil);

    // Walls (BoxGeometry - always visible from both sides)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.8 });

    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, WALL_T), wallMat);
    backWall.position.set(0, ROOM_H / 2, -ROOM_D / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Front wall
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, WALL_T), wallMat);
    frontWall.position.set(0, ROOM_H / 2, ROOM_D / 2);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    scene.add(frontWall);

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, ROOM_H, ROOM_D), wallMat);
    leftWall.position.set(-ROOM_W / 2, ROOM_H / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, ROOM_H, ROOM_D), wallMat);
    rightWall.position.set(ROOM_W / 2, ROOM_H / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // ========== FURNITURE (simple boxes) ==========

    // Kitchen counter (back wall)
    const counterMat = new THREE.MeshStandardMaterial({ color: 0xd4c4a8 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 0.9, 0.6), counterMat);
    counter.position.set(-2, 0.45, -ROOM_D / 2 + 0.4);
    counter.castShadow = true;
    scene.add(counter);

    // Stove (black box on counter)
    const stoveMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 });
    const stove = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.5), stoveMat);
    stove.position.set(-3, 0.95, -ROOM_D / 2 + 0.4);
    stove.castShadow = true;
    scene.add(stove);

    // Fridge (tall white box)
    const fridgeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.2 });
    const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.7), fridgeMat);
    fridge.position.set(ROOM_W / 2 - 0.8, 0.9, -ROOM_D / 2 + 0.5);
    fridge.castShadow = true;
    scene.add(fridge);

    // Couch (brown)
    const couchMat = new THREE.MeshStandardMaterial({ color: 0x6b5b4a, roughness: 0.85 });
    const couch = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.9), couchMat);
    couch.position.set(2, 0.35, 2);
    couch.castShadow = true;
    scene.add(couch);
    const couchBack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.15), couchMat);
    couchBack.position.set(2, 0.7, 1.6);
    scene.add(couchBack);

    // TV (black screen on stand)
    const tvMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
    const tv = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.05), tvMat);
    tv.position.set(2, 1.2, ROOM_D / 2 - 0.3);
    scene.add(tv);
    const tvStand = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.4), new THREE.MeshStandardMaterial({ color: 0x4a3520 }));
    tvStand.position.set(2, 0.25, ROOM_D / 2 - 0.3);
    tvStand.castShadow = true;
    scene.add(tvStand);

    // Table (center)
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x8b6f47 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.8), tableMat);
    tableTop.position.set(0, 0.75, 0);
    tableTop.castShadow = true;
    scene.add(tableTop);
    // Table legs
    for (const dx of [-0.6, 0.6]) {
      for (const dz of [-0.3, 0.3]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), tableMat);
        leg.position.set(dx, 0.375, dz);
        scene.add(leg);
      }
    }

    // Toy blocks (bright colors on floor)
    const toyColors = [0xff4444, 0x4488ff, 0x44cc44, 0xffcc00, 0xff44ff];
    for (let i = 0; i < 6; i++) {
      const toyMat = new THREE.MeshStandardMaterial({ color: toyColors[i % toyColors.length] });
      const toy = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), toyMat);
      toy.position.set(-3 + Math.random() * 2, 0.06, 2 + Math.random() * 3);
      toy.rotation.y = Math.random() * Math.PI;
      toy.castShadow = true;
      scene.add(toy);
    }

    // Bed (against left wall)
    const bedMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc });
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 2.0), new THREE.MeshStandardMaterial({ color: 0x6b4226 }));
    bedFrame.position.set(-ROOM_W / 2 + 1, 0.125, -2);
    bedFrame.castShadow = true;
    scene.add(bedFrame);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 1.9), bedMat);
    mattress.position.set(-ROOM_W / 2 + 1, 0.35, -2);
    mattress.castShadow = true;
    scene.add(mattress);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    pillow.position.set(-ROOM_W / 2 + 1, 0.5, -2.7);
    scene.add(pillow);

    // Bathtub (back right area)
    const tubMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.2 });
    const tub = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.7), tubMat);
    tub.position.set(ROOM_W / 2 - 1.2, 0.25, -3);
    tub.castShadow = true;
    scene.add(tub);

    // ========== LIGHTING ==========

    // Sunlight
    const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.5);
    sunLight.position.set(5, 8, 3);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 30;
    sunLight.shadow.camera.left = -15;
    sunLight.shadow.camera.right = 15;
    sunLight.shadow.camera.top = 15;
    sunLight.shadow.camera.bottom = -15;
    scene.add(sunLight);

    // Ambient light (brighter for visibility)
    const ambientLight = new THREE.AmbientLight(0xc8d8f0, 0.6);
    scene.add(ambientLight);

    // Ceiling light
    const ceilingLight = new THREE.PointLight(0xfff0d0, 1.2, 20);
    ceilingLight.position.set(0, ROOM_H - 0.2, 0);
    ceilingLight.castShadow = true;
    scene.add(ceilingLight);

    // Second ceiling light
    const ceilingLight2 = new THREE.PointLight(0xfff0d0, 0.8, 15);
    ceilingLight2.position.set(3, ROOM_H - 0.2, 3);
    scene.add(ceilingLight2);

    // ========== CAMERA ==========

    this.rendererWrapper.camera.position.set(0, 1.7, 3);
    this.cameraController.setRoomBounds(
      new THREE.Vector3(-ROOM_W / 2 + 0.3, 0, -ROOM_D / 2 + 0.3),
      new THREE.Vector3(ROOM_W / 2 - 0.3, ROOM_H, ROOM_D / 2 - 0.3),
    );

    // ========== SPAWN CHILDREN ==========

    const numChildren = Math.max(1, Math.floor(
      config.minChildren + Math.random() * (config.maxChildren - config.minChildren + 1),
    ));
    this.scoringSystem = new ScoringSystem(numChildren);

    const childSpawnPositions = [
      new THREE.Vector3(-2, 0, 3),
      new THREE.Vector3(0, 0, -3),
      new THREE.Vector3(3, 0, -1),
      new THREE.Vector3(-3, 0, 0),
    ];

    for (let i = 0; i < numChildren; i++) {
      const child = Child.generate(this.seed, i);
      const spawnPos = childSpawnPositions[i % childSpawnPositions.length];
      child.position.copy(spawnPos);
      child.mesh.position.copy(spawnPos);
      child.currentRoom = 0;

      scene.add(child.mesh);
      this.children.push(child);

      const ai = new ChildAI(child);
      this.childAIs.push(ai);

      this.childStatusPanel.addChild(child.profile.id, child.profile.name, child.profile.age);
    }

    this.childInteraction.setChildren(this.children);

    // ========== INPUT ==========

    this.canvas.addEventListener('click', () => {
      if (!this.cameraController.locked) {
        this.cameraController.requestLock(this.canvas);
      }
    });

    EventBus.on('camera.lockChange', (locked: unknown) => {
      const crosshair = document.getElementById('crosshair');
      if (crosshair) crosshair.style.display = locked ? 'block' : 'none';
      if (locked) this.hud.show();
    });

    EventBus.on('game.pause', (paused: unknown) => {
      if (paused) this.cameraController.releaseLock();
    });

    EventBus.on('clock.dayEnd', () => {
      if (this.gameOver) return;
      this.gameOver = true;
      this.showEndOfDay();
    });

    EventBus.on('player.breakdown', () => {
      if (this.gameOver) return;
      this.gameOver = true;
      this.showEndOfDay();
    });

    EventBus.on('game.restart', () => {
      window.location.reload();
    });

    console.log(`[Engine] Initialized: GPU=${this.gpuTier}, Seed=${this.seed}, Difficulty=${this.difficulty}, Children=${numChildren}`);
    console.log(`[Engine] Camera at (0, 1.7, 3), Room ${ROOM_W}x${ROOM_D}x${ROOM_H}`);
    console.log(`[Engine] Scene children: ${scene.children.length}`);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    this.accumulator += Math.min(dt, MAX_ACCUMULATOR);

    if (!this.pauseMenu.paused && !this.gameOver) {
      while (this.accumulator >= PHYSICS_STEP) {
        this.fixedUpdate(PHYSICS_STEP);
        this.accumulator -= PHYSICS_STEP;
      }
    } else {
      this.accumulator = 0;
    }

    this.variableUpdate(dt);
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private fixedUpdate(dt: number): void {
    this.clock.advance(dt);
    this.needsSystem.update(dt);

    // Player stress from upset children
    for (const ai of this.childAIs) {
      if (ai.state === 'upset' || ai.state === 'tantrum') {
        const src = ai.state === 'tantrum' ? 'tantrum' as const : 'crying' as const;
        this.player.addStress(src, dt);
      }
    }

    // Child AI
    const playerPos = this.cameraController.getPosition();
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const ai = this.childAIs[i];
      const dist = playerPos.distanceTo(child.position);

      ai.update(dt, dist, false);

      // Simple wandering for children that can walk
      if (child.canWalk() && !child.isSleeping && !child.isBeingCarried) {
        if (Math.random() < 0.003) {
          const wanderX = child.position.x + (Math.random() - 0.5) * 2;
          const wanderZ = child.position.z + (Math.random() - 0.5) * 2;
          // Clamp to room bounds
          const cx = Math.max(-ROOM_W / 2 + 0.5, Math.min(ROOM_W / 2 - 0.5, wanderX));
          const cz = Math.max(-ROOM_D / 2 + 0.5, Math.min(ROOM_D / 2 - 0.5, wanderZ));
          child.position.set(cx, 0, cz);
          child.mesh.position.copy(child.position);
        }
      }
    }

    this.childInteraction.update(dt);
    this.childSpeech.update(dt);

    // Occasional child speech
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const ai = this.childAIs[i];
      if (Math.random() < 0.003) {
        const context = ai.state === 'needy' ? child.mood.urgentNeed
          : ai.state === 'upset' ? 'scared'
          : ai.state === 'content' ? 'happy' : 'happy';
        this.childSpeech.speak(child.profile.id, child.profile.age, context);
      }
    }

    this.hazardSystem.update(dt);
  }

  private variableUpdate(dt: number): void {
    this.cameraController.update(dt);

    // Update HUD
    const stats = this.player.getStats();
    this.hud.update(stats, this.clock.formattedTime, this.clock.phase);

    // Update child status
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const ai = this.childAIs[i];
      this.childStatusPanel.updateChild({
        id: child.profile.id,
        name: child.profile.name,
        ageGroup: child.profile.age,
        happiness: child.mood.happiness,
        state: ai.state,
      });
    }

    this.rendererWrapper.render();
    this.debugOverlay.update();
  }

  private showEndOfDay(): void {
    this.cameraController.releaseLock();
    const childHappiness = this.children.map((c) => c.mood.happiness);
    const playerStats = this.player.getStats();
    const safetyScore = this.hazardSystem.calculateSafetyScore();
    const scoreData = this.scoringSystem.calculateFinalScore(childHappiness, playerStats, safetyScore);
    this.scoreScreen.show(scoreData);
  }
}
