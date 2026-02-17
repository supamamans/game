# Recovery Context - The Guardian's Vigil

## What is this?
A hyper-realistic first-person babysitting simulation game built with WebGPU + Three.js + TypeScript + Vite, deployed to GitHub Pages.

## Repository
- **Repo**: supamamans/game
- **Branch**: feature/phase1-scaffold
- **Plan**: plans/game-plan.md (12 phases total)
- **PR**: https://github.com/supamamans/game/pull/2

## Current Progress
- **ALL 12 PHASES IMPLEMENTED**
- TypeScript: 0 errors
- Vite build: passes (~480KB gzipped)

## Files Created (45+ source files)

### Core (`src/core/`)
- Engine.ts, Clock.ts, EventBus.ts, StateMachine.ts, EntityManager.ts, SaveSystem.ts

### Renderer (`src/renderer/`)
- WebGPURenderer.ts, FallbackRenderer.ts, FirstPersonCamera.ts, detectGPU.ts
- PostProcessing.ts, ParticleSystem.ts, ShaderLibrary.ts

### Shaders (`src/shaders/`)
- wood.tsl.ts, tile.tsl.ts, fabric.tsl.ts, skin.tsl.ts
- water.tsl.ts, glass.tsl.ts, food.tsl.ts, sky.tsl.ts

### World (`src/world/`)
- HouseGenerator.ts, RoomBuilder.ts, FurnitureFactory.ts, DoorSystem.ts
- ObjectRegistry.ts, TimeOfDay.ts, RoomTypes.ts, TestRoom.ts, Lighting.ts

### Interaction (`src/interaction/`)
- RayCaster.ts, InteractionManager.ts, HighlightSystem.ts, HandController.ts
- CookingSystem.ts, HygieneSystem.ts

### Entities (`src/entities/`)
- Player.ts, Child.ts, ChildAI.ts, MoodVector.ts
- ChildPathfinding.ts, ChildSpeech.ts

### Systems (`src/systems/`)
- PhysicsSystem.ts, NeedsSystem.ts, HazardSystem.ts
- ScoringSystem.ts, ChildInteraction.ts, EmergencySystem.ts

### Audio (`src/audio/`)
- AudioManager.ts, MusicSystem.ts, SoundEffects.ts

### UI (`src/ui/`)
- HUD.ts, InteractionPrompt.ts, PauseMenu.ts, ScoreScreen.ts
- QTEOverlay.ts, ChildStatusPanel.ts, StartScreen.ts, TutorialSystem.ts

### Utils (`src/utils/`)
- SeededRandom.ts, MathUtils.ts, DebugOverlay.ts
