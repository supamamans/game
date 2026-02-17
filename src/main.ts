/**
 * The Guardian's Vigil - Main Entry Point
 *
 * Initializes the game engine, detects GPU capabilities,
 * and wires up the start screen with seed/difficulty selection.
 */

import { Engine } from '@core/Engine';
import { detectGPU, GPUTier } from '@renderer/detectGPU';
import { StartScreen } from '@ui/StartScreen';

async function boot(): Promise<void> {
  const statusEl = document.getElementById('gpu-status')!;
  const startBtn = document.getElementById('btn-start') as HTMLButtonElement;

  // Detect GPU support
  const tier = await detectGPU();

  switch (tier) {
    case GPUTier.WebGPU:
      statusEl.textContent = '✓ WebGPU supported — maximum quality available';
      statusEl.classList.add('supported');
      break;
    case GPUTier.WebGL2:
      statusEl.textContent = '⚠ WebGPU not available — using WebGL2 fallback (reduced effects)';
      statusEl.classList.add('fallback');
      break;
    case GPUTier.Unsupported:
      statusEl.textContent = '✗ Neither WebGPU nor WebGL2 detected — game cannot run';
      statusEl.classList.add('unsupported');
      startBtn.disabled = true;
      return;
  }

  // Enhance start screen with seed/difficulty inputs
  const startScreen = new StartScreen();

  startBtn.addEventListener('click', async () => {
    const seed = startScreen.getSeed();
    const difficulty = startScreen.getDifficulty();

    startScreen.hide();

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const engine = new Engine(canvas, tier, seed, difficulty);
    await engine.init();
    engine.start();
  });
}

boot().catch((err) => {
  console.error('Failed to boot The Guardian\'s Vigil:', err);
});
