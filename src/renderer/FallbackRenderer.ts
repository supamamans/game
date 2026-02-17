/**
 * FallbackRenderer - WebGL2 fallback with reduced features.
 *
 * Used when WebGPU is not available. Same interface as WebGPURenderer
 * but with simplified lighting, no compute particles, and reduced
 * post-processing.
 *
 * For Phase 1, both renderers use the same WebGL2 path.
 * The WebGPU-specific code paths will diverge in Phase 3.
 */

import { WebGPURenderer } from './WebGPURenderer';

export class FallbackRenderer extends WebGPURenderer {
  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    // Reduce quality for fallback
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.type = 1; // THREE.BasicShadowMap equivalent
    this.renderer.toneMappingExposure = 0.9;
  }
}
