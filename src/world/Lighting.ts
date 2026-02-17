/**
 * Lighting - Basic scene lighting for Phase 1.
 *
 * Sets up a directional "sun" light and ambient fill.
 * Will be expanded into the full TimeOfDay system in Phase 2.
 */

import * as THREE from 'three';

export class Lighting {
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Lighting';

    // Sunlight - warm directional light simulating morning sun
    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 2.0);
    this.sunLight.position.set(5, 8, 3);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 30;
    this.sunLight.shadow.camera.left = -10;
    this.sunLight.shadow.camera.right = 10;
    this.sunLight.shadow.camera.top = 10;
    this.sunLight.shadow.camera.bottom = -10;
    this.sunLight.shadow.bias = -0.002;
    this.group.add(this.sunLight);

    // Ambient fill - subtle blue/cool to contrast warm sun
    this.ambientLight = new THREE.AmbientLight(0xc8d8f0, 0.4);
    this.group.add(this.ambientLight);

    // Point light to simulate a ceiling lamp
    const ceilingLight = new THREE.PointLight(0xfff0d0, 0.8, 12);
    ceilingLight.position.set(0, 2.8, 0);
    ceilingLight.castShadow = true;
    ceilingLight.shadow.mapSize.width = 512;
    ceilingLight.shadow.mapSize.height = 512;
    this.group.add(ceilingLight);
  }

  /**
   * Update lighting based on time of day (stub for Phase 1).
   */
  update(_gameTimeHours: number): void {
    // Phase 2 will implement full time-of-day transitions
  }

  dispose(): void {
    this.sunLight.dispose();
    this.ambientLight.dispose();
  }
}
