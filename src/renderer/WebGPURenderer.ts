/**
 * WebGPURenderer - Three.js WebGPU renderer setup and pipeline orchestration.
 *
 * Uses Three.js r170+ WebGPU backend for high-fidelity rendering.
 * Falls back to WebGL2 via FallbackRenderer if WebGPU is unavailable.
 */

import * as THREE from 'three';

export class WebGPURenderer {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue default
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 50);

    // Camera setup - first person perspective
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    this.camera.position.set(0, 1.7, 0); // Eye height ~1.7m

    // Renderer - use WebGL for now, WebGPU backend will be swapped in Phase 3
    // Three.js WebGPU renderer requires async init which we handle separately
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Handle resize
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
