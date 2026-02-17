/**
 * Engine - Main game loop orchestrator.
 *
 * Fixed timestep for physics/AI (60 Hz), variable for rendering.
 * Coordinates all subsystems: renderer, camera, clock, world,
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

// World
import { HouseGenerator } from '@world/HouseGenerator';
import { RoomBuilder } from '@world/RoomBuilder';
import { FurnitureFactory, FurnitureItem } from '@world/FurnitureFactory';
import { DoorSystem } from '@world/DoorSystem';
import { ObjectRegistry } from '@world/ObjectRegistry';
import { TimeOfDay } from '@world/TimeOfDay';
import { Lighting } from '@world/Lighting';

// Entities
import { Child } from '@entities/Child';
import { ChildAI } from '@entities/ChildAI';
import { ChildSpeech } from '@entities/ChildSpeech';
import { ChildPathfinding } from '@entities/ChildPathfinding';
import { Player } from '@entities/Player';

// Interaction
import { RayCaster } from '@interaction/RayCaster';
import { InteractionManager } from '@interaction/InteractionManager';
import { HighlightSystem } from '@interaction/HighlightSystem';
import { HandController } from '@interaction/HandController';
import { CookingSystem } from '@interaction/CookingSystem';
import { HygieneSystem } from '@interaction/HygieneSystem';

// Systems
import { NeedsSystem } from '@systems/NeedsSystem';
import { HazardSystem } from '@systems/HazardSystem';
import { EmergencySystem } from '@systems/EmergencySystem';
import { ScoringSystem } from '@systems/ScoringSystem';
import { ChildInteraction } from '@systems/ChildInteraction';

// UI
import { HUD } from '@ui/HUD';
import { ChildStatusPanel } from '@ui/ChildStatusPanel';
import { InteractionPrompt } from '@ui/InteractionPrompt';
import { PauseMenu } from '@ui/PauseMenu';
import { TutorialSystem } from '@ui/TutorialSystem';
import { ScoreScreen } from '@ui/ScoreScreen';

// Audio
import { SoundEffects } from '@audio/SoundEffects';

const PHYSICS_STEP = 1 / 60; // 60 Hz fixed timestep
const MAX_ACCUMULATOR = 0.2; // Prevent spiral of death

export class Engine {
  private rendererWrapper: WebGPURenderer;
  private cameraController: FirstPersonCamera;
  private clock: Clock;
  private debugOverlay: DebugOverlay;

  // World
  private worldGroup: THREE.Group = new THREE.Group();
  private lighting: Lighting;
  private timeOfDay: TimeOfDay;
  private doorSystem: DoorSystem;
  private objectRegistry: ObjectRegistry;

  // Entities
  private player: Player;
  private children: Child[] = [];
  private childAIs: ChildAI[] = [];
  private childPathfinders: ChildPathfinding[] = [];
  private childSpeech: ChildSpeech;

  // Interaction
  private rayCaster: RayCaster;
  private interactionManager: InteractionManager;
  private highlightSystem: HighlightSystem;
  private handController: HandController;
  private cookingSystem: CookingSystem;
  private hygieneSystem: HygieneSystem;

  // Systems
  private needsSystem: NeedsSystem;
  private hazardSystem: HazardSystem;
  private emergencySystem: EmergencySystem;
  private scoringSystem: ScoringSystem;
  private childInteraction: ChildInteraction;

  // UI
  private hud: HUD;
  private childStatusPanel: ChildStatusPanel;
  private interactionPrompt: InteractionPrompt;
  private pauseMenu: PauseMenu;
  private tutorialSystem: TutorialSystem;
  private scoreScreen: ScoreScreen;

  // Audio
  private soundEffects: SoundEffects;

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

    // Choose renderer based on GPU tier
    if (gpuTier === GPUTier.WebGPU) {
      this.rendererWrapper = new WebGPURenderer(canvas);
    } else {
      this.rendererWrapper = new FallbackRenderer(canvas);
    }

    this.cameraController = new FirstPersonCamera(this.rendererWrapper.camera);
    this.clock = new Clock();
    this.debugOverlay = new DebugOverlay();

    // Lighting
    this.lighting = new Lighting();
    this.timeOfDay = new TimeOfDay(
      this.lighting.sunLight,
      this.lighting.ambientLight,
      this.rendererWrapper.scene,
    );

    // World systems
    this.doorSystem = new DoorSystem();
    this.objectRegistry = new ObjectRegistry();

    // Player
    this.player = new Player();

    // Child speech
    this.childSpeech = new ChildSpeech();

    // Interaction
    this.rayCaster = new RayCaster(this.rendererWrapper.camera);
    this.highlightSystem = new HighlightSystem();
    this.handController = new HandController(this.rendererWrapper.camera);
    this.interactionManager = new InteractionManager(this.rayCaster, this.objectRegistry);
    this.cookingSystem = new CookingSystem();
    this.hygieneSystem = new HygieneSystem();

    // Systems
    this.needsSystem = new NeedsSystem(this.player);
    this.hazardSystem = new HazardSystem();
    this.emergencySystem = new EmergencySystem();
    this.childInteraction = new ChildInteraction();

    // Scoring - will set totalChildren after generation
    this.scoringSystem = new ScoringSystem(1);

    // UI
    this.hud = new HUD();
    this.childStatusPanel = new ChildStatusPanel();
    this.interactionPrompt = new InteractionPrompt();
    this.pauseMenu = new PauseMenu();
    this.tutorialSystem = new TutorialSystem();
    this.scoreScreen = new ScoreScreen();

    // Audio
    this.soundEffects = new SoundEffects();

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
    // Generate the house layout
    const generator = new HouseGenerator(this.seed);
    const layout = generator.generate(this.difficulty);
    const config = DIFFICULTY_CONFIGS[this.difficulty];

    // Build room geometry
    const roomBuilder = new RoomBuilder();
    const roomColors: Record<string, { wall: number; floor: number }> = {
      kitchen: { wall: 0xf5f0e8, floor: 0xd4c4a8 },
      living_room: { wall: 0xf0ece4, floor: 0x8b6f47 },
      bathroom: { wall: 0xe8f0f0, floor: 0xc8d8d8 },
      bedroom: { wall: 0xf0e8f0, floor: 0x8b6f47 },
      master_bedroom: { wall: 0xf0ece4, floor: 0x6b4f27 },
      playroom: { wall: 0xf8f4e8, floor: 0xddcc99 },
      laundry_room: { wall: 0xf0f0f0, floor: 0xcccccc },
      dining_room: { wall: 0xf5f0e8, floor: 0x8b6f47 },
      hallway: { wall: 0xf5f0e8, floor: 0x8b6f47 },
      garage: { wall: 0xe0e0e0, floor: 0x999999 },
    };

    for (const room of layout.rooms) {
      const colors = roomColors[room.type] ?? { wall: 0xf5f0e8, floor: 0x8b6f47 };
      const roomGroup = roomBuilder.buildRoom(room, layout.doors, colors);
      this.worldGroup.add(roomGroup);
    }

    // Furnish rooms
    const furnitureFactory = new FurnitureFactory(this.seed);
    const allInteractables: THREE.Object3D[] = [];

    for (const room of layout.rooms) {
      const furniture = furnitureFactory.furnishRoom(room);
      for (const item of furniture) {
        item.mesh.position.x += room.worldX;
        item.mesh.position.z += room.worldZ;
        this.worldGroup.add(item.mesh);

        // Register in object registry
        if (item.interactable) {
          const objId = this.objectRegistry.register(
            item.name,
            item.tags as Parameters<typeof this.objectRegistry.register>[1],
            room.id,
            item.mesh,
          );
          this.interactionManager.registerMesh(item.mesh.name, objId);
          allInteractables.push(item.mesh);
        }
      }
    }

    // Set up raycaster interactables
    this.rayCaster.setInteractables(allInteractables);

    // Create doors
    this.doorSystem.createDoors(layout.doors);
    this.worldGroup.add(this.doorSystem.group);

    // Add world and lighting to scene
    this.rendererWrapper.scene.add(this.worldGroup);
    this.rendererWrapper.scene.add(this.lighting.group);

    // Add a grid helper for spatial orientation
    const gridHelper = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
    gridHelper.position.y = 0.01; // Just above floor
    this.rendererWrapper.scene.add(gridHelper);

    // Add axes helper for debugging direction
    const axesHelper = new THREE.AxesHelper(3);
    this.rendererWrapper.scene.add(axesHelper);

    // Set camera position to the center of the first room (living room)
    const startRoom = layout.rooms.find((r) => r.type === 'living_room') ?? layout.rooms[0];
    this.rendererWrapper.camera.position.set(startRoom.worldX, 1.7, startRoom.worldZ);

    console.log(`[Engine] Start room: ${startRoom.type} at (${startRoom.worldX}, ${startRoom.worldZ}), size: ${startRoom.width}x${startRoom.depth}`);
    console.log(`[Engine] Camera at: (${startRoom.worldX}, 1.7, ${startRoom.worldZ})`);
    console.log(`[Engine] Total rooms: ${layout.rooms.length}, Total doors: ${layout.doors.length}`);
    for (const r of layout.rooms) {
      console.log(`  Room ${r.id} (${r.type}): center=(${r.worldX.toFixed(1)}, ${r.worldZ.toFixed(1)}), size=${r.width.toFixed(1)}x${r.depth.toFixed(1)}`);
    }

    // Set room bounds for collision (use overall house bounds)
    const boundsMargin = 0.5;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const room of layout.rooms) {
      minX = Math.min(minX, room.worldX - room.width / 2);
      maxX = Math.max(maxX, room.worldX + room.width / 2);
      minZ = Math.min(minZ, room.worldZ - room.depth / 2);
      maxZ = Math.max(maxZ, room.worldZ + room.depth / 2);
    }
    this.cameraController.setRoomBounds(
      new THREE.Vector3(minX + boundsMargin, 0, minZ + boundsMargin),
      new THREE.Vector3(maxX - boundsMargin, 3, maxZ - boundsMargin),
    );

    // Spawn children
    const numChildren = Math.floor(
      config.minChildren + Math.random() * (config.maxChildren - config.minChildren + 1),
    );
    this.scoringSystem = new ScoringSystem(numChildren);

    const bedrooms = layout.rooms.filter((r) => r.type === 'bedroom' || r.type === 'playroom');

    for (let i = 0; i < numChildren; i++) {
      const child = Child.generate(this.seed, i);
      const spawnRoom = bedrooms[i % bedrooms.length] ?? layout.rooms[1];
      child.position.set(spawnRoom.worldX, 0, spawnRoom.worldZ);
      child.mesh.position.copy(child.position);
      child.currentRoom = spawnRoom.id;

      this.rendererWrapper.scene.add(child.mesh);
      this.children.push(child);

      // Set up AI
      const ai = new ChildAI(child);
      this.childAIs.push(ai);

      // Set up pathfinding
      const pathfinder = new ChildPathfinding();
      pathfinder.setRooms(layout.rooms);
      this.childPathfinders.push(pathfinder);

      // Add to UI
      this.childStatusPanel.addChild(child.profile.id, child.profile.name, child.profile.age);
    }

    // Wire up child interaction system
    this.childInteraction.setChildren(this.children);

    // Request pointer lock on canvas click
    this.canvas.addEventListener('click', () => {
      if (!this.cameraController.locked) {
        this.cameraController.requestLock(this.canvas);
      }
    });

    // Show crosshair and HUD when pointer is locked
    EventBus.on('camera.lockChange', (locked: unknown) => {
      const crosshair = document.getElementById('crosshair');
      if (crosshair) crosshair.style.display = locked ? 'block' : 'none';
      if (locked) {
        this.hud.show();
      }
    });

    // Pause handling
    EventBus.on('game.pause', (paused: unknown) => {
      if (paused) {
        this.cameraController.releaseLock();
      }
    });

    // Day end -> score screen
    EventBus.on('clock.dayEnd', () => {
      if (this.gameOver) return;
      this.gameOver = true;
      this.showEndOfDay();
    });

    // Player breakdown
    EventBus.on('player.breakdown', () => {
      if (this.gameOver) return;
      this.gameOver = true;
      this.showEndOfDay();
    });

    // Restart
    EventBus.on('game.restart', () => {
      window.location.reload();
    });

    console.log(`Engine initialized (GPU: ${this.gpuTier}, Seed: ${this.seed}, Difficulty: ${this.difficulty}, Children: ${numChildren})`);
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

    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    this.accumulator += Math.min(dt, MAX_ACCUMULATOR);

    // Don't update if paused
    if (!this.pauseMenu.paused && !this.gameOver) {
      // Fixed-step updates (physics, AI, needs, clock)
      while (this.accumulator >= PHYSICS_STEP) {
        this.fixedUpdate(PHYSICS_STEP);
        this.accumulator -= PHYSICS_STEP;
      }
    } else {
      this.accumulator = 0;
    }

    // Variable-step updates (rendering, camera, visual) always run
    this.variableUpdate(dt);

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Fixed timestep update - physics, AI, game logic.
   */
  private fixedUpdate(dt: number): void {
    // Advance game clock
    this.clock.advance(dt);

    // Player needs
    this.needsSystem.update(dt);

    // Player stress from crying/tantrum children
    for (const ai of this.childAIs) {
      if (ai.state === 'upset' || ai.state === 'tantrum') {
        const stressSource = ai.state === 'tantrum' ? 'tantrum' as const : 'crying' as const;
        this.player.addStress(stressSource, dt);
      }
    }

    // Child AI and movement
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const ai = this.childAIs[i];
      const pathfinder = this.childPathfinders[i];

      // Distance from player to child
      const playerPos = this.cameraController.getPosition();
      const childDist = playerPos.distanceTo(child.position);

      ai.update(dt, childDist, false);

      // Move children that can walk
      if (child.canWalk() && !child.isSleeping && !child.isBeingCarried) {
        // Simple wandering: occasionally pick a random nearby target
        if (Math.random() < 0.002) {
          const wanderX = child.position.x + (Math.random() - 0.5) * 3;
          const wanderZ = child.position.z + (Math.random() - 0.5) * 3;
          pathfinder.navigateTo(child.currentRoom, child.currentRoom, new THREE.Vector3(wanderX, 0, wanderZ));
        }

        const result = pathfinder.updateMovement(child.position, dt);
        child.position.copy(result.position);
        child.mesh.position.copy(child.position);
        if (result.currentRoom >= 0) {
          child.currentRoom = result.currentRoom;
        }
      }
    }

    // Child-child interactions
    this.childInteraction.update(dt);

    // Child speech
    this.childSpeech.update(dt);

    // Trigger speech based on AI state
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const ai = this.childAIs[i];

      if (Math.random() < 0.005) {
        switch (ai.state) {
          case 'needy':
            this.childSpeech.speak(child.profile.id, child.profile.age, child.mood.urgentNeed);
            break;
          case 'upset':
            this.childSpeech.speak(child.profile.id, child.profile.age, 'scared');
            break;
          case 'content':
            if (Math.random() < 0.3) {
              this.childSpeech.speak(child.profile.id, child.profile.age, 'happy');
            }
            break;
        }
      }
    }

    // Cooking
    this.cookingSystem.update(dt);

    // Hygiene
    this.hygieneSystem.update(dt);

    // Hazards
    this.hazardSystem.update(dt);

    // Emergency QTE
    this.emergencySystem.update(dt);

    // Doors
    this.doorSystem.update(dt);
  }

  /**
   * Variable timestep update - rendering, camera, visual.
   */
  private variableUpdate(dt: number): void {
    // Camera
    this.cameraController.update(dt);

    // Time of day lighting
    this.timeOfDay.update(this.clock.hours);

    // Interaction detection
    const context = this.interactionManager.update();
    this.highlightSystem.update(context.hit?.object ?? null);
    this.interactionPrompt.update(context);

    // Update HUD
    const stats = this.player.getStats();
    this.hud.update(stats, this.clock.formattedTime, this.clock.phase);

    // Update child status panel
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

    // Render
    this.rendererWrapper.render();
    this.debugOverlay.update();
  }

  private showEndOfDay(): void {
    this.cameraController.releaseLock();

    const childHappiness = this.children.map((c) => c.mood.happiness);
    const playerStats = this.player.getStats();
    const safetyScore = this.hazardSystem.calculateSafetyScore();

    const scoreData = this.scoringSystem.calculateFinalScore(
      childHappiness,
      playerStats,
      safetyScore,
    );

    this.scoreScreen.show(scoreData);
  }
}
