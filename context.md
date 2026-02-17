# Recovery Context - The Guardian's Vigil

## What is this?
A hyper-realistic first-person babysitting simulation game built with WebGPU + Three.js + TypeScript + Vite, deployed to GitHub Pages.

## Repository
- **Repo**: supamamans/game
- **Branch**: feature/phase1-scaffold
- **Plan**: plans/game-plan.md (12 phases total)

## Current Progress
- **Phase**: 1 - Scaffold and Render (COMPLETE)
- **Status**: All Phase 1 files created, TypeScript compiles clean, Vite build passes
- **Next**: Phase 2 - Procedural World (SeededRandom house generation, doors, skybox)

## Phase 1 Completed Files
- `package.json` / `tsconfig.json` / `vite.config.ts` - Project config
- `index.html` - Game HTML shell with start screen, HUD, crosshair CSS
- `src/main.ts` - Boot sequence, GPU detection, engine init
- `src/core/Engine.ts` - Game loop (fixed 60Hz + variable render)
- `src/core/Clock.ts` - In-game time (6AM-10PM, 1:16 real:game ratio)
- `src/core/EventBus.ts` - Pub/sub event system
- `src/core/StateMachine.ts` - Generic HFSM for AI and game states
- `src/core/EntityManager.ts` - ECS-lite entity/component system
- `src/renderer/detectGPU.ts` - WebGPU/WebGL2/Unsupported detection
- `src/renderer/WebGPURenderer.ts` - Three.js renderer setup
- `src/renderer/FallbackRenderer.ts` - Reduced quality WebGL2 path
- `src/renderer/FirstPersonCamera.ts` - Pointer lock, WASD, sprint, crouch
- `src/world/TestRoom.ts` - Box room with floor/walls/ceiling + furniture
- `src/world/Lighting.ts` - Sun directional + ambient + ceiling point light
- `src/utils/SeededRandom.ts` - Deterministic PRNG from seed
- `src/utils/MathUtils.ts` - lerp, clamp, remap, damp, noise helpers
- `src/utils/DebugOverlay.ts` - FPS counter (toggle with backtick)
- `.github/workflows/deploy.yml` - GitHub Pages deploy on push to main

## Tech Stack
- **Build**: Vite 6.x
- **Language**: TypeScript 5.7+ strict
- **Renderer**: Three.js r170+ (WebGPU backend, WebGL2 fallback)
- **Physics** (Phase 4): Rapier 3D WASM via WebWorker
- **Audio** (Phase 11): Howler.js + Web Audio API

## Build Status
- `npx tsc --noEmit` - PASSES (0 errors)
- `npx vite build` - PASSES (dist/ ~480KB gzipped)
