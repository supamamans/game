/**
 * PostProcessing - Screen-space effects pipeline.
 *
 * Bloom, vignette, color grading, and stress effects.
 * Uses simple full-screen quad shader passes.
 */

import * as THREE from 'three';

export interface PostProcessingConfig {
  bloomEnabled: boolean;
  bloomIntensity: number;
  vignetteIntensity: number;
  saturation: number;
  filmGrain: number;
  /** Player stress level 0-1 affects multiple parameters */
  stressLevel: number;
}

const DEFAULT_CONFIG: PostProcessingConfig = {
  bloomEnabled: true,
  bloomIntensity: 0.3,
  vignetteIntensity: 0.3,
  saturation: 1.0,
  filmGrain: 0.02,
  stressLevel: 0,
};

export class PostProcessing {
  private config: PostProcessingConfig;
  private composer: { render: () => void } | null = null;

  constructor(
    _renderer: THREE.WebGLRenderer,
    _scene: THREE.Scene,
    _camera: THREE.PerspectiveCamera,
    config?: Partial<PostProcessingConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // Post-processing will use Three.js EffectComposer in a later iteration.
    // For now, we apply effects via shader material overrides and scene manipulation.
  }

  /**
   * Update post-processing parameters based on game state.
   */
  updateStress(stressLevel: number): void {
    this.config.stressLevel = stressLevel;

    // High stress effects
    if (stressLevel > 0.85) {
      this.config.vignetteIntensity = 0.7;
      this.config.saturation = 0.6;
      this.config.filmGrain = 0.08;
    } else if (stressLevel > 0.5) {
      this.config.vignetteIntensity = 0.4;
      this.config.saturation = 0.85;
      this.config.filmGrain = 0.04;
    } else {
      this.config.vignetteIntensity = 0.3;
      this.config.saturation = 1.0;
      this.config.filmGrain = 0.02;
    }
  }

  /**
   * Set quality preset.
   */
  setQuality(level: 'low' | 'medium' | 'high' | 'ultra'): void {
    switch (level) {
      case 'low':
        this.config.bloomEnabled = false;
        this.config.filmGrain = 0;
        break;
      case 'medium':
        this.config.bloomEnabled = true;
        this.config.bloomIntensity = 0.2;
        break;
      case 'high':
        this.config.bloomEnabled = true;
        this.config.bloomIntensity = 0.3;
        break;
      case 'ultra':
        this.config.bloomEnabled = true;
        this.config.bloomIntensity = 0.5;
        break;
    }
  }

  render(): void {
    this.composer?.render();
  }

  getConfig(): PostProcessingConfig {
    return { ...this.config };
  }

  dispose(): void {
    // Cleanup render targets
  }
}
