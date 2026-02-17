# Recovery Context - The Guardian's Vigil

## What is this?
A hyper-realistic first-person babysitting simulation game built with WebGPU + Three.js + TypeScript + Vite, deployed to GitHub Pages.

## Repository
- **Repo**: supamamans/game
- **Branch**: feature/phase1-scaffold
- **Plan**: plans/game-plan.md (12 phases total)

## Current Progress
- **Phase**: 1 - Scaffold and Render
- **Goal**: Walk around an empty room in the browser

## Phase 1 Checklist
- [x] Project scaffold (package.json, tsconfig, vite.config, index.html)
- [ ] Core engine files (Engine.ts, Clock.ts, EventBus.ts, StateMachine.ts, EntityManager.ts)
- [ ] Renderer setup (WebGPURenderer.ts, FallbackRenderer.ts)
- [ ] First-person camera with pointer lock + WASD movement
- [ ] Basic test room (box with floor, walls, ceiling)
- [ ] Basic directional light (sunlight)
- [ ] GitHub Actions deploy.yml
- [ ] UI shells (StartScreen.ts, HUD.ts)
- [ ] Utils (SeededRandom.ts, MathUtils.ts)

## Tech Stack
- **Build**: Vite 6.x
- **Language**: TypeScript 5.7+ strict
- **Renderer**: Three.js r170+ (WebGPU backend, WebGL2 fallback)
- **Physics** (later): Rapier 3D WASM via WebWorker
- **Audio** (later): Howler.js + Web Audio API

## Key Architecture Decisions
- Fixed timestep physics (60Hz), variable render
- EventBus pub/sub for decoupled communication
- ECS-lite entity system
- HTML/CSS DOM overlay for UI (separate from canvas)
- All assets procedural (no external model files)

## File Structure
See plans/game-plan.md section 6.1 for full structure.
